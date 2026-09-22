const VehicleModel = require('../models/vehicleModel');
const { normalizePlate } = require('../utils/plateNormalizer');
const { success, created, badRequest, notFound, forbidden, paginated } = require('../utils/response');

const vehicleController = {
  // GET /api/vehicles — My vehicles
  async getMyVehicles(req, res, next) {
    try {
      const vehicles = await VehicleModel.findByUserId(req.user.id);
      return success(res, vehicles);
    } catch (err) { next(err); }
  },

  // GET /api/vehicles/:id
  async getVehicleById(req, res, next) {
    try {
      const vehicle = await VehicleModel.findById(req.params.id);
      if (!vehicle) return notFound(res, 'Phương tiện không tồn tại');
      if (vehicle.user_id !== req.user.id && req.user.role !== 'ADMIN') return forbidden(res);
      return success(res, vehicle);
    } catch (err) { next(err); }
  },

  // POST /api/vehicles
  async createVehicle(req, res, next) {
    try {
      const { plate_number, vehicle_type, vehicle_name, color, rfid_uid, user_id } = req.body;
      if (!plate_number) return badRequest(res, 'Biển số xe là bắt buộc');

      const targetUserId = (req.user.role === 'ADMIN' && user_id) ? parseInt(user_id) : req.user.id;
      const normalizedPlate = normalizePlate(plate_number);
      const existing = await VehicleModel.findByPlate(normalizedPlate);
      if (existing) return badRequest(res, 'Biển số xe đã tồn tại trong hệ thống');

      const result = await VehicleModel.create({
        user_id: targetUserId,
        plate_number: normalizedPlate,
        vehicle_type: vehicle_type || 'CAR',
        vehicle_name: vehicle_name || null,
        color: color || null,
        rfid_uid: rfid_uid || null
      });

      if (rfid_uid) {
        const { query } = require('../config/db');
        await query(
          `INSERT INTO rfid_cards (uid, user_id, vehicle_id, status) VALUES (?, ?, ?, 'ACTIVE')
           ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), vehicle_id = VALUES(vehicle_id), status = 'ACTIVE'`,
          [rfid_uid, targetUserId, result.insertId]
        );
      }

      const vehicle = await VehicleModel.findById(result.insertId);
      return created(res, vehicle, 'Thêm phương tiện thành công');
    } catch (err) { next(err); }
  },

  // PUT /api/vehicles/:id
  async updateVehicle(req, res, next) {
    try {
      const vehicle = await VehicleModel.findById(req.params.id);
      if (!vehicle) return notFound(res, 'Phương tiện không tồn tại');
      if (vehicle.user_id !== req.user.id && req.user.role !== 'ADMIN') return forbidden(res);

      const { plate_number, vehicle_name, color, vehicle_type, rfid_uid } = req.body;
      const updates = {};
      if (plate_number !== undefined) {
        const normalized = normalizePlate(plate_number);
        const existing = await VehicleModel.findByPlate(normalized);
        if (existing && existing.id !== parseInt(req.params.id)) {
          return badRequest(res, 'Biển số xe đã tồn tại trên hệ thống');
        }
        updates.plate_number = normalized;
      }
      if (vehicle_name !== undefined) updates.vehicle_name = vehicle_name;
      if (color !== undefined) updates.color = color;
      if (vehicle_type) updates.vehicle_type = vehicle_type;
      if (rfid_uid !== undefined) updates.rfid_uid = rfid_uid;

      if (Object.keys(updates).length > 0) {
        await VehicleModel.updateById(req.params.id, updates);
      }

      if (rfid_uid) {
        const { query } = require('../config/db');
        await query(
          `INSERT INTO rfid_cards (uid, user_id, vehicle_id, status) VALUES (?, ?, ?, 'ACTIVE')
           ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), vehicle_id = VALUES(vehicle_id), status = 'ACTIVE'`,
          [rfid_uid, vehicle.user_id, req.params.id]
        );
      }

      const updated = await VehicleModel.findById(req.params.id);
      return success(res, updated, 'Cập nhật phương tiện thành công');
    } catch (err) { next(err); }
  },

  // DELETE /api/vehicles/:id
  async deleteVehicle(req, res, next) {
    try {
      const vehicle = await VehicleModel.findById(req.params.id);
      if (!vehicle) return notFound(res, 'Phương tiện không tồn tại');
      if (vehicle.user_id !== req.user.id && req.user.role !== 'ADMIN') return forbidden(res);

      await VehicleModel.deleteById(req.params.id);
      return success(res, null, 'Xóa phương tiện thành công');
    } catch (err) { next(err); }
  },

  // PUT /api/vehicles/:id/set-default
  async setDefault(req, res, next) {
    try {
      const vehicle = await VehicleModel.findById(req.params.id);
      if (!vehicle || vehicle.user_id !== req.user.id) return notFound(res, 'Phương tiện không tồn tại');

      await VehicleModel.setDefault(req.user.id, req.params.id);
      return success(res, null, 'Đã đặt xe mặc định');
    } catch (err) { next(err); }
  },

  // === ADMIN ===
  async getAllVehicles(req, res, next) {
    try {
      const { page = 1, limit = 20, search = '', vehicle_type = '', has_rfid = '', sort_by = 'created_at', sort_order = 'DESC' } = req.query;
      const [vehicles, countRow] = await Promise.all([
        VehicleModel.getAll({ page: +page, limit: +limit, search, vehicle_type, has_rfid, sort_by, sort_order }),
        VehicleModel.count({ search, vehicle_type, has_rfid })
      ]);
      return paginated(res, vehicles, countRow.total, page, limit);
    } catch (err) { next(err); }
  }
};

module.exports = vehicleController;
