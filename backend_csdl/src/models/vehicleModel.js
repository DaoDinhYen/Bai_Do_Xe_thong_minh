const { query, queryOne } = require('../config/db');

const VehicleModel = {
  findById: (id) =>
    queryOne(`SELECT v.*, u.name as owner_name, u.name as user_name, u.email as owner_email, u.email as user_email, u.phone as owner_phone
              FROM vehicles v LEFT JOIN users u ON v.user_id = u.id WHERE v.id = ?`, [id]),

  findByUserId: (userId) =>
    query('SELECT * FROM vehicles WHERE user_id = ? ORDER BY is_default DESC, created_at DESC', [userId]),

  findByPlate: (plateNumber) => {
    const cleanPlate = plateNumber ? plateNumber.replace(/[\s\-\.]/g, '').toUpperCase() : '';
    return queryOne(
      `SELECT v.*, u.name as owner_name, u.email as owner_email 
       FROM vehicles v 
       LEFT JOIN users u ON v.user_id = u.id 
       WHERE v.plate_number = ? 
          OR REPLACE(REPLACE(REPLACE(v.plate_number, '-', ''), '.', ''), ' ', '') = ?`,
      [plateNumber, cleanPlate]
    );
  },

  findByRfidUid: (rfidUid) =>
    queryOne(`SELECT v.*, u.name as owner_name, u.email as owner_email, u.wallet_balance 
              FROM vehicles v LEFT JOIN users u ON v.user_id = u.id 
              WHERE v.rfid_uid = ? AND v.status = 'ACTIVE'`, [rfidUid]),

  create: ({ user_id, plate_number, vehicle_type, vehicle_name, color, rfid_uid }) =>
    query(
      'INSERT INTO vehicles (user_id, plate_number, vehicle_type, vehicle_name, color, rfid_uid, is_default, status) VALUES (?, ?, ?, ?, ?, ?, 0, "ACTIVE")',
      [user_id, plate_number, vehicle_type || 'CAR', vehicle_name || null, color || null, rfid_uid || null]
    ),

  updateById: (id, fields) => {
    const keys = Object.keys(fields);
    const sql = `UPDATE vehicles SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ?`;
    return query(sql, [...Object.values(fields), id]);
  },

  setDefault: async (userId, vehicleId) => {
    await query('UPDATE vehicles SET is_default = 0 WHERE user_id = ?', [userId]);
    return query('UPDATE vehicles SET is_default = 1 WHERE id = ? AND user_id = ?', [vehicleId, userId]);
  },

  setStatus: (id, status) =>
    query('UPDATE vehicles SET status = ? WHERE id = ?', [status, id]),

  deleteById: (id) =>
    query('DELETE FROM vehicles WHERE id = ?', [id]),

  getAll: ({ page = 1, limit = 20, search = '', vehicle_type = '', has_rfid = '', sort_by = 'created_at', sort_order = 'DESC' } = {}) => {
    const offset = (page - 1) * limit;
    let sql = `SELECT v.*, u.name as owner_name, u.name as user_name, u.email as owner_email, u.phone as owner_phone
               FROM vehicles v
               LEFT JOIN users u ON v.user_id = u.id WHERE 1=1`;
    const params = [];
    if (vehicle_type) { sql += ` AND v.vehicle_type = ?`; params.push(vehicle_type); }
    if (has_rfid === 'yes') { sql += ` AND v.rfid_uid IS NOT NULL AND v.rfid_uid != ''`; }
    else if (has_rfid === 'no') { sql += ` AND (v.rfid_uid IS NULL OR v.rfid_uid = '')`; }
    if (search) {
      sql += ` AND (v.plate_number LIKE ? OR v.vehicle_name LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR v.rfid_uid LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }
    const safeSort = ['created_at', 'plate_number', 'id'].includes(sort_by) ? sort_by : 'created_at';
    const safeOrder = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    sql += ` ORDER BY v.${safeSort} ${safeOrder} LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    return query(sql, params);
  },

  count: ({ search = '', vehicle_type = '', has_rfid = '' } = {}) => {
    let sql = `SELECT COUNT(*) as total FROM vehicles v LEFT JOIN users u ON v.user_id = u.id WHERE 1=1`;
    const params = [];
    if (vehicle_type) { sql += ` AND v.vehicle_type = ?`; params.push(vehicle_type); }
    if (has_rfid === 'yes') { sql += ` AND v.rfid_uid IS NOT NULL AND v.rfid_uid != ''`; }
    else if (has_rfid === 'no') { sql += ` AND (v.rfid_uid IS NULL OR v.rfid_uid = '')`; }
    if (search) {
      sql += ` AND (v.plate_number LIKE ? OR v.vehicle_name LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR v.rfid_uid LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }
    return queryOne(sql, params);
  }
};

module.exports = VehicleModel;
