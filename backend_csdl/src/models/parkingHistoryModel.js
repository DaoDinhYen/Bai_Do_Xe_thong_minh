const { query, queryOne } = require('../config/db');

const ParkingHistoryModel = {
  findById: (id) =>
    queryOne(`
      SELECT ph.*, u.name as user_name, u.email as user_email,
        v.plate_number, v.vehicle_type, ps.slot_code, ps.zone
      FROM parking_history ph
      LEFT JOIN users u ON ph.user_id = u.id
      LEFT JOIN vehicles v ON ph.vehicle_id = v.id
      LEFT JOIN parking_slots ps ON ph.slot_id = ps.id
      WHERE ph.id = ?
    `, [id]),

  // Find active session (vehicle is inside, no exit_time yet)
  findActiveByVehicle: (vehicleId) =>
    queryOne("SELECT * FROM parking_history WHERE vehicle_id = ? AND exit_time IS NULL ORDER BY entry_time DESC LIMIT 1", [vehicleId]),

  findActiveByRfid: (rfidUid) =>
    queryOne(`SELECT ph.*, ps.slot_code FROM parking_history ph
              LEFT JOIN parking_slots ps ON ph.slot_id = ps.id
              WHERE ph.rfid_uid = ? AND ph.exit_time IS NULL
              ORDER BY ph.entry_time DESC LIMIT 1`, [rfidUid]),

  // Create entry record
  createEntry: ({ user_id, vehicle_id, slot_id, rfid_uid, booking_id, entry_image = null }) =>
    query(
      `INSERT INTO parking_history (user_id, vehicle_id, slot_id, rfid_uid, booking_id, entry_time, entry_image, payment_status)
       VALUES (?, ?, ?, ?, ?, NOW(), ?, 'PENDING')`,
      [user_id, vehicle_id, slot_id, rfid_uid, booking_id || null, entry_image || null]
    ),

  // Update with exit time, duration, fee
  recordExit: (id, { exit_time, duration, fee, payment_status, exit_image = null }) =>
    query(
      'UPDATE parking_history SET exit_time = ?, duration = ?, fee = ?, payment_status = ?, exit_image = COALESCE(?, exit_image) WHERE id = ?',
      [exit_time, duration, fee, payment_status, exit_image || null, id]
    ),

  getByUser: ({ userId, page = 1, limit = 20 }) => {
    const offset = (page - 1) * limit;
    return query(`
      SELECT ph.*, ps.slot_code, ps.zone, v.plate_number
      FROM parking_history ph
      LEFT JOIN parking_slots ps ON ph.slot_id = ps.id
      LEFT JOIN vehicles v ON ph.vehicle_id = v.id
      WHERE ph.user_id = ?
      ORDER BY ph.entry_time DESC LIMIT ? OFFSET ?
    `, [userId, limit, offset]);
  },

  getAll: ({ page = 1, limit = 20, search = '', status = '', date = '', sort_by = 'entry_time', sort_order = 'DESC' } = {}) => {
    const offset = (page - 1) * limit;
    let sql = `SELECT ph.*, u.name as user_name, v.plate_number, ps.slot_code
               FROM parking_history ph
               LEFT JOIN users u ON ph.user_id = u.id
               LEFT JOIN vehicles v ON ph.vehicle_id = v.id
               LEFT JOIN parking_slots ps ON ph.slot_id = ps.id WHERE 1=1`;
    const params = [];
    if (status === 'ACTIVE') {
      sql += ` AND ph.exit_time IS NULL`;
    } else if (status === 'COMPLETED') {
      sql += ` AND ph.exit_time IS NOT NULL`;
    }
    if (date) {
      sql += ` AND (DATE(ph.entry_time) = ? OR DATE(ph.exit_time) = ?)`;
      params.push(date, date);
    }
    if (search) {
      sql += ` AND (u.name LIKE ? OR v.plate_number LIKE ? OR ps.slot_code LIKE ? OR ph.rfid_uid LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    const safeSort = ['entry_time', 'exit_time', 'duration', 'fee'].includes(sort_by) ? sort_by : 'entry_time';
    const safeOrder = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    sql += ` ORDER BY ph.${safeSort} ${safeOrder} LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    return query(sql, params);
  },

  count: ({ userId = null, search = '', status = '', date = '' } = {}) => {
    let sql = `SELECT COUNT(*) as total FROM parking_history ph
               LEFT JOIN users u ON ph.user_id = u.id
               LEFT JOIN vehicles v ON ph.vehicle_id = v.id
               LEFT JOIN parking_slots ps ON ph.slot_id = ps.id WHERE 1=1`;
    const params = [];
    if (userId) { sql += ` AND ph.user_id = ?`; params.push(userId); }
    if (status === 'ACTIVE') {
      sql += ` AND ph.exit_time IS NULL`;
    } else if (status === 'COMPLETED') {
      sql += ` AND ph.exit_time IS NOT NULL`;
    }
    if (date) {
      sql += ` AND (DATE(ph.entry_time) = ? OR DATE(ph.exit_time) = ?)`;
      params.push(date, date);
    }
    if (search) {
      sql += ` AND (u.name LIKE ? OR v.plate_number LIKE ? OR ps.slot_code LIKE ? OR ph.rfid_uid LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    return queryOne(sql, params);
  },

  // Revenue stats
  getTodayRevenue: () =>
    queryOne(`SELECT COALESCE(SUM(fee),0) as revenue, COUNT(*) as sessions
              FROM parking_history WHERE DATE(exit_time) = CURDATE() AND payment_status = 'PAID'`),

  getMonthRevenue: (year, month) =>
    queryOne(`SELECT COALESCE(SUM(fee),0) as revenue, COUNT(*) as sessions
              FROM parking_history WHERE YEAR(exit_time) = ? AND MONTH(exit_time) = ? AND payment_status = 'PAID'`,
              [year, month]),

  getDailyRevenue: (days = 30) =>
    query(`SELECT DATE(exit_time) as date, COALESCE(SUM(fee),0) as revenue, COUNT(*) as sessions
           FROM parking_history WHERE exit_time >= DATE_SUB(NOW(), INTERVAL ? DAY) AND payment_status = 'PAID'
           GROUP BY DATE(exit_time) ORDER BY date ASC`, [days])
};

module.exports = ParkingHistoryModel;
