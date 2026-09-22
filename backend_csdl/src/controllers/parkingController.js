const ParkingSlotModel = require('../models/parkingSlotModel');
const ParkingRateModel = require('../models/parkingRateModel');
const { success, created, badRequest, notFound } = require('../utils/response');

const parkingController = {
  // GET /api/parking/slots — all slots with booking info
  async getAllSlots(req, res, next) {
    try {
      const slots = await ParkingSlotModel.getWithCurrentBooking();
      let conflictMap = {};
      try {
        const { getConflictSlots } = require('../mqtt/mqttHandler');
        conflictMap = getConflictSlots() || {};
      } catch (_) {}

      const enriched = slots.map(s => {
        const code = s.slot_code || s.slot_name;
        if (conflictMap[code]) {
          return {
            ...s,
            is_conflict: true,
            conflict_info: conflictMap[code],
            wrong_plate: conflictMap[code].wrong_plate
          };
        }
        return s;
      });
      return success(res, enriched);
    } catch (err) { next(err); }
  },

  // GET /api/parking/slots/summary
  async getSummary(req, res, next) {
    try {
      const summary = await ParkingSlotModel.getSummary();
      return success(res, summary);
    } catch (err) { next(err); }
  },

  // GET /api/parking/slots/:id
  async getSlotById(req, res, next) {
    try {
      const slot = await ParkingSlotModel.findById(req.params.id);
      if (!slot) return notFound(res, 'Chỗ đỗ không tồn tại');
      return success(res, slot);
    } catch (err) { next(err); }
  },

  // GET /api/parking/slots/available
  async getAvailable(req, res, next) {
    try {
      const slots = await ParkingSlotModel.getAvailable();
      return success(res, slots);
    } catch (err) { next(err); }
  },

  // === ADMIN ===
  // POST /api/admin/parking/slots
  async createSlot(req, res, next) {
    try {
      const { slot_code, zone, sensor_id, is_virtual } = req.body;
      if (!slot_code || !zone) return badRequest(res, 'slot_code và zone là bắt buộc');
      const result = await ParkingSlotModel.create({ slot_code, zone, sensor_id, is_virtual: !!is_virtual });
      const slot = await ParkingSlotModel.findById(result.insertId);
      return created(res, slot);
    } catch (err) { next(err); }
  },

  // PUT /api/admin/parking/slots/:id
  async updateSlot(req, res, next) {
    try {
      const slot = await ParkingSlotModel.findById(req.params.id);
      if (!slot) return notFound(res, 'Chỗ đỗ không tồn tại');
      const { status, zone, sensor_id } = req.body;
      const updates = {};
      if (status && ['FREE','OCCUPIED','RESERVED','DISABLED'].includes(status)) updates.status = status;
      if (zone) updates.zone = zone;
      if (sensor_id !== undefined) updates.sensor_id = sensor_id;
      await ParkingSlotModel.updateById(req.params.id, updates);
      const updated = await ParkingSlotModel.findById(req.params.id);
      const io = req.app.get('io');
      if (io && updates.status) {
        io.emit('slot_status_changed', { slot_code: slot.slot_code, slot_id: slot.id, new_status: updates.status, timestamp: new Date().toISOString() });
      }
      return success(res, updated, 'Cập nhật chỗ đỗ thành công');
    } catch (err) { next(err); }
  },

  // GET /api/parking/rates
  async getRates(req, res, next) {
    try {
      const rates = await ParkingRateModel.getAll();
      return success(res, rates);
    } catch (err) { next(err); }
  },

  // POST /api/admin/parking/rates
  async createRate(req, res, next) {
    try {
      const { vehicle_type, price_per_hour, minimum_fee, maximum_fee } = req.body;
      if (!vehicle_type || !price_per_hour) return badRequest(res, 'vehicle_type và price_per_hour là bắt buộc');
      const result = await ParkingRateModel.create({ vehicle_type, price_per_hour, minimum_fee, maximum_fee });
      const rate = await ParkingRateModel.getByVehicleType(vehicle_type);
      return created(res, rate);
    } catch (err) { next(err); }
  },

  // PUT /api/parking/rates/:id
  async updateRate(req, res, next) {
    try {
      const { price_per_hour, minimum_fee, maximum_fee, status } = req.body;
      const updates = {};
      if (price_per_hour !== undefined) updates.price_per_hour = price_per_hour;
      if (minimum_fee !== undefined) updates.minimum_fee = minimum_fee;
      if (maximum_fee !== undefined) updates.maximum_fee = maximum_fee;
      if (status) updates.status = status;
      await ParkingRateModel.updateById(req.params.id, updates);

      const allRates = await ParkingRateModel.getAll();
      const io = req.app.get('io');
      if (io) {
        io.emit('rates_updated', { rates: allRates, timestamp: new Date().toISOString() });
      }

      return success(res, allRates, 'Cập nhật bảng giá thành công');
    } catch (err) { next(err); }
  },

  // PUT /api/parking/rates/batch (Admin)
  async batchUpdateRates(req, res, next) {
    try {
      const rates = req.body.rates || req.body;
      if (!Array.isArray(rates) || rates.length === 0) {
        return badRequest(res, 'Dữ liệu bảng giá (rates) phải là một mảng');
      }

      for (const item of rates) {
        if (!item.id && !item.vehicle_type) continue;
        const updates = {};
        if (item.price_per_hour !== undefined) updates.price_per_hour = item.price_per_hour;
        if (item.minimum_fee !== undefined) updates.minimum_fee = item.minimum_fee;
        if (item.maximum_fee !== undefined) updates.maximum_fee = item.maximum_fee;
        if (item.status) updates.status = item.status;

        if (item.id) {
          await ParkingRateModel.updateById(item.id, updates);
        } else if (item.vehicle_type) {
          const existing = await ParkingRateModel.getByVehicleType(item.vehicle_type);
          if (existing) {
            await ParkingRateModel.updateById(existing.id, updates);
          }
        }
      }

      const allRates = await ParkingRateModel.getAll();
      const io = req.app.get('io');
      if (io) {
        io.emit('rates_updated', { rates: allRates, timestamp: new Date().toISOString() });
      }

      return success(res, allRates, 'Cập nhật toàn bộ bảng giá thành công');
    } catch (err) { next(err); }
  }
};

module.exports = parkingController;
