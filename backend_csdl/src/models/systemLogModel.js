const { query, queryOne } = require('../config/db');

const SystemLogModel = {
  create: ({ user_id, action, device_id, description, ip_address }) =>
    query(
      'INSERT INTO system_logs (user_id, action, device_id, description, ip_address) VALUES (?, ?, ?, ?, ?)',
      [user_id || null, action, device_id || null, description, ip_address || null]
    ),

  getAll: ({ page = 1, limit = 50, action = '', userId = null, search = '', date = '' }) => {
    const offset = (page - 1) * limit;
    let sql = `SELECT sl.*, u.name as user_name FROM system_logs sl
               LEFT JOIN users u ON sl.user_id = u.id WHERE 1=1`;
    const params = [];
    if (action) { sql += ` AND sl.action = ?`; params.push(action); }
    if (userId) { sql += ` AND sl.user_id = ?`; params.push(userId); }
    if (date) { sql += ` AND DATE(sl.created_at) = ?`; params.push(date); }
    if (search) {
      sql += ` AND (u.name LIKE ? OR sl.action LIKE ? OR sl.description LIKE ? OR sl.ip_address LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    sql += ` ORDER BY sl.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    return query(sql, params);
  },

  count: ({ action = '', userId = null, search = '', date = '' } = {}) => {
    let sql = `SELECT COUNT(*) as total FROM system_logs sl
               LEFT JOIN users u ON sl.user_id = u.id WHERE 1=1`;
    const params = [];
    if (action) { sql += ` AND sl.action = ?`; params.push(action); }
    if (userId) { sql += ` AND sl.user_id = ?`; params.push(userId); }
    if (date) { sql += ` AND DATE(sl.created_at) = ?`; params.push(date); }
    if (search) {
      sql += ` AND (u.name LIKE ? OR sl.action LIKE ? OR sl.description LIKE ? OR sl.ip_address LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    return queryOne(sql, params);
  },

  ACTIONS: {
    LOGIN:            'LOGIN',
    LOGOUT:           'LOGOUT',
    REGISTER:         'REGISTER',
    RFID_SCAN:        'RFID_SCAN',
    RFID_INVALID:     'RFID_INVALID',
    VEHICLE_ENTRY:    'VEHICLE_ENTRY',
    VEHICLE_EXIT:     'VEHICLE_EXIT',
    BARRIER_OPEN:     'BARRIER_OPEN',
    BARRIER_CLOSE:    'BARRIER_CLOSE',
    LIGHT_ON:         'LIGHT_ON',
    LIGHT_OFF:        'LIGHT_OFF',
    BOOKING_CREATED:  'BOOKING_CREATED',
    BOOKING_CANCELLED:'BOOKING_CANCELLED',
    PAYMENT:          'PAYMENT',
    DEVICE_ONLINE:    'DEVICE_ONLINE',
    DEVICE_OFFLINE:   'DEVICE_OFFLINE',
    ALERT:            'ALERT',
    ADMIN_ACTION:     'ADMIN_ACTION'
  }
};

module.exports = SystemLogModel;
