const AccessService = require('../services/accessService');
const RfidModel = require('../models/rfidModel');
const CameraModel = require('../models/cameraModel');
const { normalizePlate } = require('../utils/plateNormalizer');
const { success, badRequest, error } = require('../utils/response');

const accessController = {
  /**
   * POST /api/access/verify
   * Combined RFID + Plate verification endpoint
   * Called by admin/gateway when both RFID and plate info are available
   */
  async verify(req, res, next) {
    try {
      const { rfid_uid, plate_number, direction } = req.body;
      if (!rfid_uid || !direction) return badRequest(res, 'rfid_uid và direction là bắt buộc');
      if (!['IN','OUT'].includes(direction)) return badRequest(res, 'direction phải là IN hoặc OUT');

      const io = req.app.get('io');

      const rfidCard = await RfidModel.findByUid(rfid_uid);
      if (!rfidCard || rfidCard.status !== 'ACTIVE') {
        return success(res, {
          authorized: false,
          command: 'KEEP_CLOSED',
          reason: rfidCard ? 'RFID_BLOCKED' : 'RFID_NOT_FOUND'
        });
      }

      // Find camera record if plate is provided
      let cameraRecord = null;
      if (plate_number) {
        const normalized = normalizePlate(plate_number);
        // Get most recent detection matching the plate and direction
        cameraRecord = await CameraModel.getRecentDetection(direction, parseInt(process.env.ANPR_TIME_WINDOW_SECONDS) || 30);
      } else {
        // Try to find recent camera detection automatically
        cameraRecord = await CameraModel.getRecentDetection(direction, parseInt(process.env.ANPR_TIME_WINDOW_SECONDS) || 30);
      }

      const result = await AccessService.verifyAccess({ rfidCard, cameraRecord, direction, io });

      return success(res, {
        authorized: result.authorized,
        command: result.authorized
          ? (direction === 'IN' ? 'OPEN_GATE_IN' : 'OPEN_GATE_OUT')
          : 'KEEP_CLOSED',
        reason: result.reason || null,
        slot_code: result.slot_code || null,
        fee: result.fee || null
      });
    } catch (err) {
      if (err.statusCode) return error(res, err.message, err.statusCode);
      next(err);
    }
  },

  /**
   * POST /api/access/rfid-only
   * RFID-only scan (no plate verification) — for testing/fallback
   */
  async rfidOnly(req, res, next) {
    try {
      const { rfid_uid, direction } = req.body;
      if (!rfid_uid || !direction) return badRequest(res, 'rfid_uid và direction là bắt buộc');

      const io = req.app.get('io');
      await AccessService.handleRfidScan(rfid_uid, direction, io);
      return success(res, null, 'RFID scan processed');
    } catch (err) { next(err); }
  }
};

module.exports = accessController;
