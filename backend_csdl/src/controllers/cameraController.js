const CameraModel = require('../models/cameraModel');
const VehicleModel = require('../models/vehicleModel');
const { normalizePlate } = require('../utils/plateNormalizer');
const { success, created, badRequest, notFound, paginated } = require('../utils/response');

const cameraController = {
  // GET /api/cameras — All cameras
  async getAllCameras(req, res, next) {
    try {
      const cameras = await CameraModel.getAll();
      return success(res, cameras);
    } catch (err) { next(err); }
  },

  // POST /api/camera/detection — Receive ANPR detection from ANPR service
  async receiveDetection(req, res, next) {
    try {
      const { camera_id, plate_number, detected_plate, confidence, image_path, timestamp, direction } = req.body;
      if (!camera_id || !plate_number) return badRequest(res, 'camera_id và plate_number là bắt buộc');

      const normalizedPlate = normalizePlate(plate_number);
      const threshold = parseFloat(process.env.ANPR_CONFIDENCE_THRESHOLD || 0.7);
      const conf = parseFloat(confidence || 0);

      // Try to find matching vehicle
      const vehicle = await VehicleModel.findByPlate(normalizedPlate);

      // Get camera direction from request or camera record
      const cam = await CameraModel.findByCode(camera_id);
      const detectionDirection = direction || cam?.direction || 'IN';

      let verificationStatus = 'PENDING';
      if (conf < threshold) verificationStatus = 'LOW_CONFIDENCE';
      else if (!vehicle) verificationStatus = 'UNKNOWN';

      // Save detection record
      const result = await CameraModel.createRecord({
        camera_id: cam?.id,
        user_id: vehicle?.user_id || null,
        vehicle_id: vehicle?.id || null,
        rfid_uid: null,
        plate_number: normalizedPlate,
        detected_plate: detected_plate || plate_number,
        image_path: image_path || null,
        confidence: conf,
        direction: detectionDirection,
        verification_status: verificationStatus
      });

      // Update camera last_seen
      if (cam) await CameraModel.updateStatus(cam.id, 'ONLINE');

      // Emit to admin
      const io = req.app.get('io');
      if (io) {
        io.emit('camera_detection', {
          camera_id,
          plate_number: normalizedPlate,
          detected_plate: detected_plate || plate_number,
          confidence: conf,
          direction: detectionDirection,
          vehicle: vehicle ? { id: vehicle.id, plate: vehicle.plate_number, owner: vehicle.owner_name } : null,
          timestamp: new Date().toISOString()
        });
      }

      return success(res, {
        plate_number: normalizedPlate,
        vehicle_id: vehicle?.id || null,
        user_id: vehicle?.user_id || null,
        verification_status: verificationStatus,
        record_id: result.insertId
      }, 'Nhận diện biển số đã được ghi nhận');
    } catch (err) { next(err); }
  },

  // GET /api/camera/records — ANPR detection history
  async getRecords(req, res, next) {
    try {
      const { page = 1, limit = 20, direction = '', status = '', search = '', camera_id = '', date = '' } = req.query;
      const [records, countRow] = await Promise.all([
        CameraModel.getRecords({ page: +page, limit: +limit, direction, status, search, camera_id: camera_id ? +camera_id : null, date }),
        CameraModel.countRecords({ direction, status, search, camera_id: camera_id ? +camera_id : null, date })
      ]);
      return paginated(res, records, countRow.total, page, limit);
    } catch (err) { next(err); }
  },

  // GET /api/camera/records/latest — Most recent detections for dashboard
  async getLatestDetections(req, res, next) {
    try {
      const [inDetection, outDetection] = await Promise.all([
        CameraModel.getRecentDetection('IN', 300),
        CameraModel.getRecentDetection('OUT', 300)
      ]);
      return success(res, { in: inDetection, out: outDetection });
    } catch (err) { next(err); }
  },

  // POST /api/admin/cameras — Register a camera
  async createCamera(req, res, next) {
    try {
      const { camera_code, name, location, direction, stream_url } = req.body;
      if (!camera_code || !name) return badRequest(res, 'camera_code và name là bắt buộc');
      const { query } = require('../config/db');
      const result = await query(
        'INSERT INTO cameras (camera_code, name, location, direction, stream_url, status) VALUES (?, ?, ?, ?, ?, "OFFLINE")',
        [camera_code, name, location, direction || 'IN', stream_url || null]
      );
      const cam = await CameraModel.findById(result.insertId);
      return created(res, cam);
    } catch (err) { next(err); }
  }
};

module.exports = cameraController;
