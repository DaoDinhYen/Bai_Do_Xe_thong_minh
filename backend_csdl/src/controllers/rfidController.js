const RfidModel = require('../models/rfidModel');
const VehicleModel = require('../models/vehicleModel');
const { success, created, badRequest, notFound, paginated, error } = require('../utils/response');

const rfidController = {
  // GET /api/rfid/cards — Admin: all cards
  async getAllCards(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const [cards, countRow] = await Promise.all([
        RfidModel.getAll({ page: +page, limit: +limit }),
        RfidModel.count()
      ]);
      return paginated(res, cards, countRow.total, page, limit);
    } catch (err) { next(err); }
  },

  // GET /api/rfid/cards/:uid — Lookup by UID
  async getCardByUid(req, res, next) {
    try {
      const card = await RfidModel.findByUid(req.params.uid);
      if (!card) return notFound(res, 'RFID không tồn tại trong hệ thống');
      return success(res, card);
    } catch (err) { next(err); }
  },

  // POST /api/rfid/register — Register RFID to vehicle
  async registerCard(req, res, next) {
    try {
      const { uid, vehicle_id, user_id } = req.body;
      if (!uid || !vehicle_id) return badRequest(res, 'uid và vehicle_id là bắt buộc');

      const existing = await RfidModel.findByUid(uid);
      if (existing) return badRequest(res, 'UID RFID này đã được đăng ký');

      const vehicle = await VehicleModel.findById(vehicle_id);
      if (!vehicle) return notFound(res, 'Phương tiện không tồn tại');

      const targetUserId = user_id || vehicle.user_id;

      const result = await RfidModel.create({ uid, user_id: targetUserId, vehicle_id });

      // Also update vehicle's rfid_uid field
      await VehicleModel.updateById(vehicle_id, { rfid_uid: uid });

      const card = await RfidModel.findByUid(uid);
      return created(res, card, 'Đăng ký RFID thành công');
    } catch (err) { next(err); }
  },

  // PUT /api/rfid/cards/:id/status
  async setCardStatus(req, res, next) {
    try {
      let { status } = req.body;
      if (status === 'DISABLED') status = 'BLOCKED';
      if (!['ACTIVE', 'BLOCKED', 'LOST'].includes(status)) return badRequest(res, 'Trạng thái không hợp lệ (ACTIVE/BLOCKED/LOST)');
      await RfidModel.setStatus(req.params.id, status);
      return success(res, null, `RFID đã được cập nhật thành ${status}`);
    } catch (err) { next(err); }
  },

  // DELETE /api/rfid/cards/:id
  async deleteCard(req, res, next) {
    try {
      await RfidModel.deleteById(req.params.id);
      return success(res, null, 'Xóa RFID thành công');
    } catch (err) { next(err); }
  },

  // POST /api/rfid/simulate-scan — Simulate RFID scan for testing
  async simulateScan(req, res, next) {
    try {
      const { uid, direction = 'IN' } = req.body;
      if (!uid) return badRequest(res, 'uid là bắt buộc');

      const AccessService = require('../services/accessService');
      const io = req.app.get('io');
      const result = await AccessService.handleRfidScan(uid, direction, io);
      return success(res, result, 'RFID scan simulated');
    } catch (err) { next(err); }
  }
};

module.exports = rfidController;
