const { query, queryOne } = require('../config/db');

const DeviceModel = {
  findById: (id) =>
    queryOne('SELECT * FROM devices WHERE id = ?', [id]),

  findByCode: (deviceCode) =>
    queryOne('SELECT * FROM devices WHERE device_code = ?', [deviceCode]),

  getAll: () =>
    query('SELECT * FROM devices ORDER BY device_type, device_code'),

  create: ({ device_code, device_type, name, location, ip_address, firmware_version }) =>
    query(
      'INSERT INTO devices (device_code, device_type, name, location, status, ip_address, firmware_version) VALUES (?, ?, ?, ?, "OFFLINE", ?, ?)',
      [device_code, device_type, name, location, ip_address || null, firmware_version || null]
    ),

  updateStatus: (id, status) =>
    query('UPDATE devices SET status = ?, last_seen = NOW() WHERE id = ?', [status, id]),

  updateStatusByCode: (deviceCode, status, extraData = {}) => {
    let sql = 'UPDATE devices SET status = ?, last_seen = NOW()';
    const params = [status];
    if (extraData.ip_address) { sql += ', ip_address = ?'; params.push(extraData.ip_address); }
    if (extraData.firmware_version) { sql += ', firmware_version = ?'; params.push(extraData.firmware_version); }
    sql += ' WHERE device_code = ?';
    params.push(deviceCode);
    return query(sql, params);
  },

  updateById: (id, fields) => {
    const keys = Object.keys(fields);
    const sql = `UPDATE devices SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ?`;
    return query(sql, [...Object.values(fields), id]);
  },

  // Log device event
  addLog: ({ device_id, event, data }) =>
    query('INSERT INTO device_logs (device_id, event, data) VALUES (?, ?, ?)', [device_id, event, JSON.stringify(data)]),

  getLogs: ({ deviceId, page = 1, limit = 50 }) => {
    const offset = (page - 1) * limit;
    return query(`SELECT dl.*, d.device_code, d.name FROM device_logs dl
                  LEFT JOIN devices d ON dl.device_id = d.id
                  WHERE dl.device_id = ?
                  ORDER BY dl.created_at DESC LIMIT ? OFFSET ?`, [deviceId, limit, offset]);
  },

  getAllLogs: ({ page = 1, limit = 50 }) => {
    const offset = (page - 1) * limit;
    return query(`SELECT dl.*, d.device_code, d.name FROM device_logs dl
                  LEFT JOIN devices d ON dl.device_id = d.id
                  ORDER BY dl.created_at DESC LIMIT ? OFFSET ?`, [limit, offset]);
  },

  // Mark offline devices not seen for N minutes
  markOffline: (minutesThreshold = 5) =>
    query(`UPDATE devices SET status = 'OFFLINE' WHERE last_seen < DATE_SUB(NOW(), INTERVAL ? MINUTE) AND status = 'ONLINE'`, [minutesThreshold])
};

module.exports = DeviceModel;
