const { query, queryOne } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const BookingModel = {
  findById: (id) =>
    queryOne(`
      SELECT b.*, u.name as user_name, u.email as user_email,
        v.plate_number, v.vehicle_type, v.color,
        ps.slot_code, ps.zone
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      LEFT JOIN parking_slots ps ON b.slot_id = ps.id
      WHERE b.id = ?
    `, [id]),

  findByCode: (bookingCode) =>
    queryOne(`
      SELECT b.*, u.name as user_name, ps.slot_code, ps.zone, v.plate_number
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN parking_slots ps ON b.slot_id = ps.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      WHERE b.booking_code = ?
    `, [bookingCode]),

  findActiveBySlot: (slotId) =>
    queryOne("SELECT * FROM bookings WHERE slot_id = ? AND status IN ('CONFIRMED','ACTIVE')", [slotId]),

  findActiveByVehicle: (vehicleId) =>
    queryOne("SELECT b.*, ps.slot_code FROM bookings b LEFT JOIN parking_slots ps ON b.slot_id = ps.id WHERE b.vehicle_id = ? AND b.status IN ('CONFIRMED','ACTIVE') ORDER BY b.start_time DESC LIMIT 1", [vehicleId]),

  create: ({ user_id, vehicle_id, slot_id, start_time, end_time, duration, unit_price, total_price }) => {
    const booking_code = 'BK' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 100);
    return query(
      `INSERT INTO bookings (booking_code, user_id, vehicle_id, slot_id, start_time, end_time, duration, unit_price, total_price, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED')`,
      [booking_code, user_id, vehicle_id, slot_id, start_time, end_time, duration, unit_price, total_price]
    );
  },

  updateStatus: (id, status) =>
    query('UPDATE bookings SET status = ? WHERE id = ?', [status, id]),

  getByUser: ({ userId, page = 1, limit = 20, status = '' }) => {
    const offset = (page - 1) * limit;
    let sql = `SELECT b.*, ps.slot_code, ps.zone, v.plate_number FROM bookings b
               LEFT JOIN parking_slots ps ON b.slot_id = ps.id
               LEFT JOIN vehicles v ON b.vehicle_id = v.id
               WHERE b.user_id = ?`;
    const params = [userId];
    if (status) { sql += ` AND b.status = ?`; params.push(status); }
    sql += ` ORDER BY b.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    return query(sql, params);
  },

  getAll: ({ page = 1, limit = 20, status = '', search = '', date = '', sort_by = 'created_at', sort_order = 'DESC' } = {}) => {
    const offset = (page - 1) * limit;
    let sql = `SELECT b.*, u.name as user_name, u.email as user_email, ps.slot_code, v.plate_number FROM bookings b
               LEFT JOIN users u ON b.user_id = u.id
               LEFT JOIN parking_slots ps ON b.slot_id = ps.id
               LEFT JOIN vehicles v ON b.vehicle_id = v.id WHERE 1=1`;
    const params = [];
    if (status) { sql += ` AND b.status = ?`; params.push(status); }
    if (date) { sql += ` AND (DATE(b.start_time) = ? OR DATE(b.end_time) = ? OR DATE(b.created_at) = ?)`; params.push(date, date, date); }
    if (search) { sql += ` AND (u.name LIKE ? OR v.plate_number LIKE ? OR b.booking_code LIKE ? OR ps.slot_code LIKE ?)`; const s = `%${search}%`; params.push(s,s,s,s); }
    const safeSort = ['created_at', 'start_time', 'end_time', 'total_price', 'id'].includes(sort_by) ? sort_by : 'created_at';
    const safeOrder = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    sql += ` ORDER BY b.${safeSort} ${safeOrder} LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    return query(sql, params);
  },

  count: ({ status = '', search = '', date = '', userId = null } = {}) => {
    let sql = `SELECT COUNT(*) as total FROM bookings b
               LEFT JOIN users u ON b.user_id = u.id
               LEFT JOIN vehicles v ON b.vehicle_id = v.id
               LEFT JOIN parking_slots ps ON b.slot_id = ps.id WHERE 1=1`;
    const params = [];
    if (userId) { sql += ` AND b.user_id = ?`; params.push(userId); }
    if (status) { sql += ` AND b.status = ?`; params.push(status); }
    if (date) { sql += ` AND (DATE(b.start_time) = ? OR DATE(b.end_time) = ? OR DATE(b.created_at) = ?)`; params.push(date, date, date); }
    if (search) { sql += ` AND (u.name LIKE ? OR v.plate_number LIKE ? OR b.booking_code LIKE ? OR ps.slot_code LIKE ?)`; const s = `%${search}%`; params.push(s,s,s,s); }
    return queryOne(sql, params);
  },

  // Find overlapping booking for same slot
  hasConflict: (slotId, startTime, endTime, excludeId = null) => {
    let sql = `SELECT id FROM bookings WHERE slot_id = ? AND status IN ('CONFIRMED','ACTIVE')
               AND NOT (end_time <= ? OR start_time >= ?)`;
    const params = [slotId, startTime, endTime];
    if (excludeId) { sql += ` AND id != ?`; params.push(excludeId); }
    return queryOne(sql, params);
  },

  // Expire overdue bookings
  expireOverdue: () =>
    query("UPDATE bookings SET status = 'EXPIRED' WHERE status = 'CONFIRMED' AND start_time < DATE_SUB(NOW(), INTERVAL 30 MINUTE)")
};

module.exports = BookingModel;
