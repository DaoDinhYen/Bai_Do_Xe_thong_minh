const { query, queryOne } = require('../config/db');

const ParkingRateModel = {
  getAll: () =>
    query('SELECT * FROM parking_rates ORDER BY vehicle_type'),

  getByVehicleType: (vehicleType) =>
    queryOne('SELECT * FROM parking_rates WHERE vehicle_type = ? AND status = "ACTIVE"', [vehicleType]),

  create: ({ vehicle_type, price_per_hour, minimum_fee, maximum_fee }) =>
    query(
      'INSERT INTO parking_rates (vehicle_type, price_per_hour, minimum_fee, maximum_fee, status) VALUES (?, ?, ?, ?, "ACTIVE")',
      [vehicle_type, price_per_hour, minimum_fee || 0, maximum_fee || null]
    ),

  updateById: (id, fields) => {
    const keys = Object.keys(fields);
    const sql = `UPDATE parking_rates SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ?`;
    return query(sql, [...Object.values(fields), id]);
  },

  deleteById: (id) => query('DELETE FROM parking_rates WHERE id = ?', [id]),

  // Default rate fallback
  getDefault: () =>
    queryOne("SELECT * FROM parking_rates WHERE vehicle_type = 'CAR' AND status = 'ACTIVE' LIMIT 1")
};

module.exports = ParkingRateModel;
