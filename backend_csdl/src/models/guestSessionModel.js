const { query, queryOne } = require('../config/db');

const GuestSessionModel = {
  findById: (id) =>
    queryOne('SELECT * FROM guest_parking_sessions WHERE id = ?', [id]),

  findByPlate: (licensePlate) =>
    queryOne("SELECT * FROM guest_parking_sessions WHERE license_plate = ? AND status = 'ACTIVE' ORDER BY entry_time DESC LIMIT 1", [licensePlate]),

  // Active session = vehicle is currently inside
  findActive: (licensePlate) =>
    queryOne("SELECT * FROM guest_parking_sessions WHERE license_plate = ? AND exit_time IS NULL", [licensePlate]),

  create: ({ license_plate, parking_slot, camera_in_record }) => {
    const session_code = 'GS' + Date.now().toString().slice(-8);
    return query(
      `INSERT INTO guest_parking_sessions (session_code, license_plate, entry_time, parking_slot, status, camera_in_record)
       VALUES (?, ?, NOW(), ?, 'ACTIVE', ?)`,
      [session_code, license_plate, parking_slot, camera_in_record || null]
    );
  },

  closeSession: (id, { exit_time, duration, amount, payment_status, camera_out_record }) =>
    query(
      `UPDATE guest_parking_sessions SET exit_time = ?, duration = ?, amount = ?, payment_status = ?, status = 'COMPLETED', camera_out_record = ?
       WHERE id = ?`,
      [exit_time, duration, amount, payment_status, camera_out_record || null, id]
    ),

  getAll: ({ page = 1, limit = 20, status = '', date = '', search = '' } = {}) => {
    const offset = (page - 1) * limit;
    let sql = `SELECT * FROM guest_parking_sessions WHERE 1=1`;
    const params = [];
    if (status) { sql += ` AND status = ?`; params.push(status); }
    if (date) { sql += ` AND (DATE(entry_time) = ? OR DATE(exit_time) = ?)`; params.push(date, date); }
    if (search) { sql += ` AND (license_plate LIKE ? OR parking_slot LIKE ?)`; const s = `%${search}%`; params.push(s, s); }
    sql += ` ORDER BY entry_time DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    return query(sql, params);
  },

  count: ({ status = '', date = '', search = '' } = {}) => {
    let sql = `SELECT COUNT(*) as total FROM guest_parking_sessions WHERE 1=1`;
    const params = [];
    if (status) { sql += ` AND status = ?`; params.push(status); }
    if (date) { sql += ` AND (DATE(entry_time) = ? OR DATE(exit_time) = ?)`; params.push(date, date); }
    if (search) { sql += ` AND (license_plate LIKE ? OR parking_slot LIKE ?)`; const s = `%${search}%`; params.push(s, s); }
    return queryOne(sql, params);
  },

  getActive: () =>
    query("SELECT * FROM guest_parking_sessions WHERE status = 'ACTIVE' ORDER BY entry_time DESC")
};

module.exports = GuestSessionModel;
