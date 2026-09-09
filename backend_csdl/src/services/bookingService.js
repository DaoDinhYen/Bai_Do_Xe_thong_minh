/**
 * Booking Service
 * Xử lý logic tạo booking, kiểm tra slot, trừ tiền ví
 */
const BookingModel = require('../models/bookingModel');
const ParkingSlotModel = require('../models/parkingSlotModel');
const VehicleModel = require('../models/vehicleModel');
const { deductWallet } = require('./paymentService');
const { calculateBookingFee } = require('./feeCalculator');
const NotificationModel = require('../models/notificationModel');
const SystemLogModel = require('../models/systemLogModel');
const { emitSlotUpdate } = require('../socket/socketHandler');

/**
 * Create a new booking
 */
async function createBooking({ userId, vehicleId, slotId, startTime, hours }) {
  // 1. Validate vehicle belongs to user
  const vehicle = await VehicleModel.findById(vehicleId);
  if (!vehicle || vehicle.user_id !== userId) {
    throw Object.assign(new Error('Phương tiện không hợp lệ'), { statusCode: 400 });
  }

  // 2. Check slot exists and is FREE
  const slot = await ParkingSlotModel.findById(slotId);
  if (!slot) throw Object.assign(new Error('Chỗ đỗ không tồn tại'), { statusCode: 404 });
  if (slot.status !== 'FREE') throw Object.assign(new Error(`Chỗ ${slot.slot_code} hiện không còn trống`), { statusCode: 409 });

  // 3. Calculate times
  const start = new Date(startTime);
  const end = new Date(start.getTime() + hours * 3600000);

  // 4. Check booking conflict
  const conflict = await BookingModel.hasConflict(slotId, start, end);
  if (conflict) throw Object.assign(new Error('Chỗ đỗ đã có booking trong khoảng thời gian này'), { statusCode: 409 });

  // 5. Calculate fee
  const feeInfo = await calculateBookingFee(hours, vehicle.vehicle_type);
  const unitPrice = feeInfo.price_per_hour;
  const totalPrice = feeInfo.fee;

  // 6. Deduct wallet
  const payment = await deductWallet(
    userId,
    totalPrice,
    `Đặt chỗ ${slot.slot_code} — ${hours} giờ`,
    'BOOKING_PAYMENT'
  );
  if (!payment.success) {
    throw Object.assign(new Error(`Số dư ví không đủ. Cần ${totalPrice.toLocaleString('vi-VN')} VNĐ, còn ${payment.balance?.toLocaleString('vi-VN')} VNĐ`), { statusCode: 402 });
  }

  // 7. Create booking record
  const result = await BookingModel.create({
    user_id: userId,
    vehicle_id: vehicleId,
    slot_id: slotId,
    start_time: start,
    end_time: end,
    duration: hours,
    unit_price: unitPrice,
    total_price: totalPrice
  });

  // 8. Update slot to RESERVED
  await ParkingSlotModel.updateStatus(slotId, 'RESERVED');
  emitSlotUpdate({ slot_code: slot.slot_code, slot_id: slotId, new_status: 'RESERVED', timestamp: new Date().toISOString() });

  // 9. Create notification
  await NotificationModel.create({
    user_id: userId,
    title: 'Đặt chỗ thành công',
    message: `Đã đặt chỗ ${slot.slot_code} từ ${start.toLocaleString('vi-VN')} (${hours} giờ). Phí: ${totalPrice.toLocaleString('vi-VN')} VNĐ`,
    type: 'SUCCESS'
  });

  await SystemLogModel.create({
    user_id: userId,
    action: SystemLogModel.ACTIONS.BOOKING_CREATED,
    description: `Booking created for slot ${slot.slot_code}, vehicle ${vehicle.plate_number}`
  });

  const booking = await BookingModel.findById(result.insertId);
  return { booking, fee_info: feeInfo };
}

/**
 * Cancel a booking (by user or admin)
 */
async function cancelBooking(bookingId, userId, isAdmin = false) {
  const booking = await BookingModel.findById(bookingId);
  if (!booking) throw Object.assign(new Error('Booking không tồn tại'), { statusCode: 404 });

  if (!isAdmin && booking.user_id !== userId) {
    throw Object.assign(new Error('Không có quyền hủy booking này'), { statusCode: 403 });
  }

  if (!['CONFIRMED', 'PENDING'].includes(booking.status)) {
    throw Object.assign(new Error(`Không thể hủy booking ở trạng thái ${booking.status}`), { statusCode: 400 });
  }

  // Update booking status
  await BookingModel.updateStatus(bookingId, 'CANCELLED');

  // Free the slot
  await ParkingSlotModel.updateStatus(booking.slot_id, 'FREE');
  emitSlotUpdate({ slot_code: booking.slot_code, slot_id: booking.slot_id, new_status: 'FREE', timestamp: new Date().toISOString() });

  // Refund total_price back to wallet
  const { refundWallet } = require('./paymentService');
  await refundWallet(booking.user_id, booking.total_price, `Hoàn tiền hủy booking ${booking.booking_code}`, bookingId);

  await NotificationModel.create({
    user_id: booking.user_id,
    title: 'Đặt chỗ đã được hủy',
    message: `Booking ${booking.booking_code} đã bị hủy. Hoàn tiền ${parseFloat(booking.total_price).toLocaleString('vi-VN')} VNĐ.`,
    type: 'INFO'
  });

  await SystemLogModel.create({
    user_id: userId,
    action: SystemLogModel.ACTIONS.BOOKING_CANCELLED,
    description: `Booking ${booking.booking_code} cancelled`
  });

  return booking;
}

module.exports = { createBooking, cancelBooking };
