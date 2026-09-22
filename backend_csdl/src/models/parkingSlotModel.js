const { query, queryOne } = require('../config/db');

const ParkingSlotModel = {
  findById: (id) =>
    queryOne('SELECT * FROM parking_slots WHERE id = ?', [id]),

  findByCode: (slotCode) =>
    queryOne('SELECT * FROM parking_slots WHERE slot_code = ?', [slotCode]),

  getAll: () =>
    query('SELECT * FROM parking_slots ORDER BY zone, slot_code'),

  getAvailable: () =>
    query("SELECT * FROM parking_slots WHERE status = 'FREE' AND is_virtual = 0 ORDER BY slot_code"),

  getByZone: (zone) =>
    query('SELECT * FROM parking_slots WHERE zone = ? ORDER BY slot_code', [zone]),

  getWithCurrentBooking: () =>
    query(`
      SELECT ps.*,
        ps.slot_code as slot_name,
        b.id as booking_id,
        b.user_id as booked_user_id,
        u.name as booked_user_name,
        COALESCE(v_parked.plate_number, v.plate_number) as current_plate,
        v.plate_number as booked_plate,
        COALESCE(v_parked.vehicle_type, v.vehicle_type) as vehicle_type,
        b.start_time, b.end_time,
        ph.entry_time,
        b.end_time as expected_exit
      FROM parking_slots ps
      LEFT JOIN (
        SELECT b1.*
        FROM bookings b1
        INNER JOIN (
          SELECT slot_id, MAX(id) as max_id
          FROM bookings
          WHERE status IN ('CONFIRMED','ACTIVE')
          GROUP BY slot_id
        ) b_latest ON b1.id = b_latest.max_id
      ) b ON ps.id = b.slot_id
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      LEFT JOIN (
        SELECT ph1.*
        FROM parking_history ph1
        INNER JOIN (
          SELECT slot_id, MAX(id) as max_id
          FROM parking_history
          WHERE exit_time IS NULL
          GROUP BY slot_id
        ) ph_latest ON ph1.id = ph_latest.max_id
      ) ph ON ps.id = ph.slot_id
      LEFT JOIN vehicles v_parked ON ph.vehicle_id = v_parked.id
      ORDER BY ps.zone, ps.slot_code
    `),

  updateStatus: (id, status) =>
    query('UPDATE parking_slots SET status = ? WHERE id = ?', [status, id]),

  updateStatusByCode: (slotCode, status) =>
    query('UPDATE parking_slots SET status = ? WHERE slot_code = ?', [status, slotCode]),

  create: ({ slot_code, zone, sensor_id, is_virtual = false }) =>
    query(
      'INSERT INTO parking_slots (slot_code, zone, status, sensor_id, is_virtual) VALUES (?, ?, "FREE", ?, ?)',
      [slot_code, zone, sensor_id || null, is_virtual ? 1 : 0]
    ),

  updateById: (id, fields) => {
    const keys = Object.keys(fields);
    const sql = `UPDATE parking_slots SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ?`;
    return query(sql, [...Object.values(fields), id]);
  },

  getSummary: () =>
    queryOne(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'FREE' AND is_virtual = 0 THEN 1 ELSE 0 END) as free_count,
        SUM(CASE WHEN status = 'OCCUPIED' THEN 1 ELSE 0 END) as occupied_count,
        SUM(CASE WHEN status = 'RESERVED' THEN 1 ELSE 0 END) as reserved_count,
        SUM(CASE WHEN status = 'DISABLED' THEN 1 ELSE 0 END) as disabled_count
      FROM parking_slots WHERE is_virtual = 0
    `)
};

module.exports = ParkingSlotModel;
