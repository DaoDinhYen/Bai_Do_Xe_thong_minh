const CameraModel = require('../models/cameraModel');
const VehicleModel = require('../models/vehicleModel');
const UserModel = require('../models/userModel');
const ParkingHistoryModel = require('../models/parkingHistoryModel');
const { normalizePlate } = require('../utils/plateNormalizer');
const { generateSessionFolderName, extractFolderName } = require('../utils/folderHelper');
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

      // Xây dựng thư mục lưu trữ theo người dùng hoặc biển số xe vãng lai
      let folderName = null;
      const filename = detectionDirection === 'IN' ? 'anh_vao.jpg' : 'anh_ra.jpg';

      if (detectionDirection === 'OUT') {
        // Nếu xe ra: Lấy đúng thư mục mà xe đó đã tạo lúc vào
        const activeSession = vehicle ? await ParkingHistoryModel.findActiveByVehicle(vehicle.id) : null;
        if (activeSession && activeSession.entry_image) {
          folderName = extractFolderName(activeSession.entry_image);
        }
      }

      if (!folderName) {
        let userName = null;
        if (vehicle?.user_id) {
          const user = await UserModel.findById(vehicle.user_id);
          userName = user?.name;
        }
        folderName = generateSessionFolderName({ userName, plateNumber: normalizedPlate });
      }

      const calculatedImagePath = `/captures/${folderName}/${filename}`;
      const finalImagePath = image_path || calculatedImagePath;

      // Save detection record
      const result = await CameraModel.createRecord({
        camera_id: cam?.id,
        user_id: vehicle?.user_id || null,
        vehicle_id: vehicle?.id || null,
        rfid_uid: null,
        plate_number: normalizedPlate,
        detected_plate: detected_plate || plate_number,
        image_path: finalImagePath,
        confidence: conf,
        direction: detectionDirection,
        verification_status: verificationStatus
      });

      // Update camera last_seen
      if (cam) await CameraModel.updateStatus(cam.id, 'ONLINE');

      const savedRecord = {
        id: result.insertId,
        camera_id: cam?.id,
        user_id: vehicle?.user_id || null,
        vehicle_id: vehicle?.id || null,
        plate_number: normalizedPlate,
        detected_plate: detected_plate || plate_number,
        image_path: finalImagePath,
        confidence: conf,
        direction: detectionDirection,
        verification_status: verificationStatus
      };

      const io = req.app.get('io');

      // Tự động khớp với thẻ RFID quẹt trước đó (nếu có)
      const { checkPendingRfidMatch } = require('../services/accessService');
      const autoMatchResult = await checkPendingRfidMatch(savedRecord, io);

      // Emit to admin
      if (io) {
        io.emit('camera_detection', {
          camera_id,
          plate_number: normalizedPlate,
          detected_plate: detected_plate || plate_number,
          confidence: conf,
          direction: detectionDirection,
          image_path: finalImagePath,
          folder_name: folderName,
          filename: filename,
          vehicle: vehicle ? { id: vehicle.id, plate: vehicle.plate_number, owner: vehicle.owner_name } : null,
          auto_match: autoMatchResult ? true : false,
          timestamp: new Date().toISOString()
        });
      }

      return success(res, {
        plate_number: normalizedPlate,
        vehicle_id: vehicle?.id || null,
        user_id: vehicle?.user_id || null,
        verification_status: verificationStatus,
        record_id: result.insertId,
        folder_name: folderName,
        filename: filename,
        image_path: finalImagePath
      }, 'Nhận diện biển số đã được ghi nhận');
    } catch (err) { next(err); }
  },

  // POST /api/camera/detection/image — Cập nhật lại đường dẫn ảnh cho bản ghi detection gần nhất
  async updateDetectionImage(req, res, next) {
    try {
      const { plate_number, direction, image_path } = req.body;
      if (!plate_number || !image_path) return badRequest(res, 'plate_number và image_path là bắt buộc');
      const { query } = require('../config/db');
      await query(
        `UPDATE camera_records SET image_path = ?
         WHERE plate_number = ? AND direction = ?
         ORDER BY id DESC LIMIT 1`,
        [image_path, normalizePlate(plate_number), direction || 'IN']
      );
      return success(res, null, 'Cập nhật ảnh thành công');
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
      const { queryOne } = require('../config/db');
      const [inRecent, outRecent, inLatest, outLatest, latestHistory] = await Promise.all([
        CameraModel.getRecentDetection('IN', 300),
        CameraModel.getRecentDetection('OUT', 300),
        CameraModel.getLatestRecord('IN'),
        CameraModel.getLatestRecord('OUT'),
        queryOne(`
          SELECT ph.*, u.name as user_name, u.phone as user_phone, v.plate_number as registered_plate, ps.slot_code
          FROM parking_history ph
          LEFT JOIN users u ON ph.user_id = u.id
          LEFT JOIN vehicles v ON ph.vehicle_id = v.id
          LEFT JOIN parking_slots ps ON ph.slot_id = ps.id
          ORDER BY GREATEST(COALESCE(ph.entry_time, '1970-01-01'), COALESCE(ph.exit_time, '1970-01-01')) DESC, ph.id DESC
          LIMIT 1
        `)
      ]);

      const inDet = inRecent || inLatest || null;
      const outDet = outRecent || outLatest || null;

      return success(res, {
        in: inDet,
        out: outDet,
        latest_event: latestHistory || null
      });
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
