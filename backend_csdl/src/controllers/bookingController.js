const BookingModel = require('../models/bookingModel');
const BookingService = require('../services/bookingService');
const { calculateBookingFee } = require('../services/feeCalculator');
const { success, created, badRequest, notFound, forbidden, paginated, error } = require('../utils/response');

const bookingController = {
  // POST /api/bookings — Create booking
  async createBooking(req, res, next) {
    try {
      const { vehicle_id, slot_id, start_time, hours } = req.body;
      if (!vehicle_id || !slot_id || !start_time || !hours) {
        return badRequest(res, 'vehicle_id, slot_id, start_time, hours là bắt buộc');
      }
      if (hours <= 0 || hours > 24) return badRequest(res, 'Số giờ phải từ 1 đến 24');

      const result = await BookingService.createBooking({
        userId: req.user.id,
        vehicleId: parseInt(vehicle_id),
        slotId: parseInt(slot_id),
        startTime: start_time,
        hours: parseFloat(hours)
      });
      return created(res, result, 'Đặt chỗ thành công');
    } catch (err) {
      if (err.statusCode) return error(res, err.message, err.statusCode);
      next(err);
    }
  },

  // GET /api/bookings — My bookings
  async getMyBookings(req, res, next) {
    try {
      const { page = 1, limit = 20, status = '' } = req.query;
      const [bookings, countRow] = await Promise.all([
        BookingModel.getByUser({ userId: req.user.id, page: +page, limit: +limit, status }),
        BookingModel.count({ userId: req.user.id, status })
      ]);
      return paginated(res, bookings, countRow.total, page, limit);
    } catch (err) { next(err); }
  },

  // GET /api/bookings/:id — Booking detail
  async getBookingById(req, res, next) {
    try {
      const booking = await BookingModel.findById(req.params.id);
      if (!booking) return notFound(res, 'Booking không tồn tại');
      if (booking.user_id !== req.user.id && req.user.role !== 'ADMIN') return forbidden(res);
      return success(res, booking);
    } catch (err) { next(err); }
  },

  // PUT /api/bookings/:id/cancel
  async cancelBooking(req, res, next) {
    try {
      const result = await BookingService.cancelBooking(req.params.id, req.user.id, req.user.role === 'ADMIN');
      return success(res, result, 'Hủy đặt chỗ thành công');
    } catch (err) {
      if (err.statusCode) return error(res, err.message, err.statusCode);
      next(err);
    }
  },

  // GET /api/bookings/estimate — Fee estimation
  async estimateFee(req, res, next) {
    try {
      const { hours, vehicle_type = 'CAR' } = req.query;
      if (!hours) return badRequest(res, 'hours là bắt buộc');
      const feeInfo = await calculateBookingFee(parseFloat(hours), vehicle_type);
      return success(res, feeInfo);
    } catch (err) { next(err); }
  },

  // === ADMIN ===
  async getAllBookings(req, res, next) {
    try {
      const { page = 1, limit = 20, status = '', search = '', date = '', sort_by = 'created_at', sort_order = 'DESC' } = req.query;
      const [bookings, countRow] = await Promise.all([
        BookingModel.getAll({ page: +page, limit: +limit, status, search, date, sort_by, sort_order }),
        BookingModel.count({ status, search, date })
      ]);
      return paginated(res, bookings, countRow.total, page, limit);
    } catch (err) { next(err); }
  }
};

module.exports = bookingController;
