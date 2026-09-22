const { query, queryOne } = require('../config/db');

const CameraModel = {
  findById: (id) =>
    queryOne('SELECT * FROM cameras WHERE id = ?', [id]),

  findByCode: (cameraCode) =>
    queryOne('SELECT * FROM cameras WHERE camera_code = ?', [cameraCode]),

  getAll: () =>
    query('SELECT * FROM cameras ORDER BY direction, camera_code'),

  updateStatus: (id, status) =>
    query('UPDATE cameras SET status = ?, last_seen = NOW() WHERE id = ?', [status, id]),

  updateStatusByCode: (cameraCode, status) =>
    query('UPDATE cameras SET status = ?, last_seen = NOW() WHERE camera_code = ?', [status, cameraCode]),

  // Camera Records — ANPR detections
  createRecord: ({ camera_id, user_id, vehicle_id, rfid_uid, plate_number, detected_plate, image_path, confidence, direction, verification_status }) =>
    query(
      `INSERT INTO camera_records 
       (camera_id, user_id, vehicle_id, rfid_uid, plate_number, detected_plate, image_path, confidence, direction, verification_status, captured_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [camera_id, user_id || null, vehicle_id || null, rfid_uid || null, plate_number, detected_plate, image_path || null, confidence, direction, verification_status || 'PENDING']
    ),

  updateRecordVerification: (id, { user_id, vehicle_id, rfid_uid, verification_status }) => {
    if (!id) return null;
    return query(
      'UPDATE camera_records SET user_id = ?, vehicle_id = ?, rfid_uid = ?, verification_status = ? WHERE id = ?',
      [user_id || null, vehicle_id || null, rfid_uid || null, verification_status || 'ACCEPTED', id]
    );
  },

  // Get most recent detection for a direction within time window
  getRecentDetection: (direction, windowSeconds = 30) =>
    queryOne(`SELECT * FROM camera_records 
              WHERE direction = ? AND captured_at >= DATE_SUB(NOW(), INTERVAL ? SECOND)
              ORDER BY captured_at DESC, id DESC LIMIT 1`, [direction, windowSeconds]),

  // Get most recent UNCONSUMED detection (status = PENDING)
  getRecentUnconsumedDetection: (direction, windowSeconds = 30) =>
    queryOne(`SELECT * FROM camera_records 
              WHERE direction = ? AND verification_status = 'PENDING' AND captured_at >= DATE_SUB(NOW(), INTERVAL ? SECOND)
              ORDER BY captured_at DESC, id DESC LIMIT 1`, [direction, windowSeconds]),

  // Find detection specifically matching a plate number within time window
  findMatchingDetection: (direction, plateNumber, windowSeconds = 30) =>
    queryOne(`SELECT * FROM camera_records 
              WHERE direction = ? AND (plate_number = ? OR detected_plate LIKE ?) 
                AND captured_at >= DATE_SUB(NOW(), INTERVAL ? SECOND)
              ORDER BY captured_at DESC, id DESC LIMIT 1`,
      [direction, plateNumber, `%${plateNumber}%`, windowSeconds]),

  // Get absolute latest detection regardless of time window
  getLatestRecord: (direction) =>
    queryOne(`SELECT * FROM camera_records 
              WHERE direction = ?
              ORDER BY captured_at DESC, id DESC LIMIT 1`, [direction]),

  getRecords: ({ page = 1, limit = 20, direction = '', status = '', search = '', camera_id = null, date = '' }) => {
    const offset = (page - 1) * limit;
    let sql = `SELECT cr.*, c.name as camera_name, u.name as user_name, v.plate_number as registered_plate
               FROM camera_records cr
               LEFT JOIN cameras c ON cr.camera_id = c.id
               LEFT JOIN users u ON cr.user_id = u.id
               LEFT JOIN vehicles v ON cr.vehicle_id = v.id WHERE 1=1`;
    const params = [];
    if (camera_id) { sql += ` AND cr.camera_id = ?`; params.push(camera_id); }
    if (direction) { sql += ` AND cr.direction = ?`; params.push(direction); }
    if (status) { sql += ` AND cr.verification_status = ?`; params.push(status); }
    if (date) { sql += ` AND DATE(cr.captured_at) = ?`; params.push(date); }
    if (search) { sql += ` AND (cr.plate_number LIKE ? OR cr.detected_plate LIKE ? OR cr.rfid_uid LIKE ?)`; const s = `%${search}%`; params.push(s,s,s); }
    sql += ` ORDER BY cr.captured_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    return query(sql, params);
  },

  countRecords: ({ direction = '', status = '', search = '', camera_id = null, date = '' } = {}) => {
    let sql = `SELECT COUNT(*) as total FROM camera_records cr WHERE 1=1`;
    const params = [];
    if (camera_id) { sql += ` AND cr.camera_id = ?`; params.push(camera_id); }
    if (direction) { sql += ` AND cr.direction = ?`; params.push(direction); }
    if (status) { sql += ` AND cr.verification_status = ?`; params.push(status); }
    if (date) { sql += ` AND DATE(cr.captured_at) = ?`; params.push(date); }
    if (search) { sql += ` AND (cr.plate_number LIKE ? OR cr.detected_plate LIKE ? OR cr.rfid_uid LIKE ?)`; const s = `%${search}%`; params.push(s,s,s); }
    return queryOne(sql, params);
  }
};

module.exports = CameraModel;
