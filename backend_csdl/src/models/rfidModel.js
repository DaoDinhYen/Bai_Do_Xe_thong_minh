const { query, queryOne } = require('../config/db');

const RfidModel = {
  findByUid: (uid) =>
    queryOne(`SELECT r.*, v.plate_number, v.vehicle_type, v.color, v.status as vehicle_status,
              u.name as owner_name, u.email as owner_email, u.wallet_balance, u.status as user_status
              FROM rfid_cards r
              LEFT JOIN vehicles v ON r.vehicle_id = v.id
              LEFT JOIN users u ON r.user_id = u.id
              WHERE r.uid = ?`, [uid]),

  findById: (id) =>
    queryOne('SELECT * FROM rfid_cards WHERE id = ?', [id]),

  findByVehicle: (vehicleId) =>
    queryOne('SELECT * FROM rfid_cards WHERE vehicle_id = ?', [vehicleId]),

  create: ({ uid, user_id, vehicle_id }) =>
    query(
      'INSERT INTO rfid_cards (uid, user_id, vehicle_id, status) VALUES (?, ?, ?, "ACTIVE")',
      [uid, user_id, vehicle_id]
    ),

  setStatus: (id, status) =>
    query('UPDATE rfid_cards SET status = ? WHERE id = ?', [status, id]),

  setStatusByUid: (uid, status) =>
    query('UPDATE rfid_cards SET status = ? WHERE uid = ?', [status, uid]),

  getAll: ({ page = 1, limit = 20 } = {}) => {
    const offset = (page - 1) * limit;
    return query(`SELECT r.*, v.plate_number, u.name as owner_name
                  FROM rfid_cards r
                  LEFT JOIN vehicles v ON r.vehicle_id = v.id
                  LEFT JOIN users u ON r.user_id = u.id
                  ORDER BY r.created_at DESC LIMIT ? OFFSET ?`, [limit, offset]);
  },

  count: () => queryOne('SELECT COUNT(*) as total FROM rfid_cards'),

  deleteById: (id) => query('DELETE FROM rfid_cards WHERE id = ?', [id])
};

module.exports = RfidModel;
