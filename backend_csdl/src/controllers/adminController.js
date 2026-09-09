const SystemLogModel = require('../models/systemLogModel');
const { query, queryOne } = require('../config/db');
const { success, paginated } = require('../utils/response');

const adminController = {
  // GET /api/admin/system-logs
  async getSystemLogs(req, res, next) {
    try {
      const { page = 1, limit = 50, action = '', search = '', date = '' } = req.query;
      const [logs, countRow] = await Promise.all([
        SystemLogModel.getAll({ page: +page, limit: +limit, action, search, date }),
        SystemLogModel.count({ action, search, date })
      ]);
      return paginated(res, logs, countRow.total, page, limit);
    } catch (err) { next(err); }
  },

  // GET /api/admin/alerts — Active alerts/warnings
  async getAlerts(req, res, next) {
    try {
      // Get recent unread admin notifications as alerts
      const alerts = await query(`
        SELECT n.*, u.name as user_name
        FROM notifications n
        LEFT JOIN users u ON n.user_id = u.id
        WHERE n.type IN ('ALERT','WARNING') AND n.is_read = 0
        ORDER BY n.created_at DESC LIMIT 50
      `);
      return success(res, alerts);
    } catch (err) { next(err); }
  },

  // GET /api/admin/system-config — System configuration
  async getSystemConfig(req, res, next) {
    try {
      return success(res, {
        walk_in_allowed: process.env.WALK_IN_ALLOWED === 'true',
        anpr_confidence_threshold: parseFloat(process.env.ANPR_CONFIDENCE_THRESHOLD || 0.7),
        anpr_time_window_seconds: parseInt(process.env.ANPR_TIME_WINDOW_SECONDS || 30),
        barrier_timeout_seconds: parseInt(process.env.BARRIER_TIMEOUT_SECONDS || 15),
        default_price_per_hour: parseFloat(process.env.DEFAULT_PRICE_PER_HOUR || 10000),
        minimum_fee: parseFloat(process.env.MINIMUM_FEE || 10000)
      });
    } catch (err) { next(err); }
  },

  // GET /api/admin/overview
  async getOverview(req, res, next) {
    try {
      const [userStats, vehicleStats, bookingStats, slotStats] = await Promise.all([
        queryOne('SELECT COUNT(*) as total, SUM(CASE WHEN status="ACTIVE" THEN 1 ELSE 0 END) as active, SUM(CASE WHEN status="BLOCKED" THEN 1 ELSE 0 END) as blocked FROM users WHERE role="USER"'),
        queryOne('SELECT COUNT(*) as total FROM vehicles WHERE status="ACTIVE"'),
        queryOne('SELECT COUNT(*) as total, SUM(CASE WHEN status IN ("CONFIRMED","ACTIVE") THEN 1 ELSE 0 END) as active FROM bookings'),
        queryOne('SELECT COUNT(*) as total, SUM(CASE WHEN status="FREE" THEN 1 ELSE 0 END) as free, SUM(CASE WHEN status="OCCUPIED" THEN 1 ELSE 0 END) as occupied FROM parking_slots WHERE is_virtual=0')
      ]);

      return success(res, { users: userStats, vehicles: vehicleStats, bookings: bookingStats, slots: slotStats });
    } catch (err) { next(err); }
  }
};

module.exports = adminController;
