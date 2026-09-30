const ParkingSlotModel = require('../models/parkingSlotModel');
const ParkingHistoryModel = require('../models/parkingHistoryModel');
const BookingModel = require('../models/bookingModel');
const UserModel = require('../models/userModel');
const DeviceModel = require('../models/deviceModel');
const { query, queryOne } = require('../config/db');
const { success } = require('../utils/response');

const statisticsController = {
  // GET /api/statistics/dashboard — Main dashboard stats
  async getDashboard(req, res, next) {
    try {
      const [slotSummary, todayRevenue, userCount, deviceList, activeGuest] = await Promise.all([
        ParkingSlotModel.getSummary(),
        ParkingHistoryModel.getTodayRevenue(),
        UserModel.count(),
        DeviceModel.getAll(),
        queryOne(`SELECT COUNT(*) as count FROM guest_parking_sessions WHERE exit_time IS NULL`)
      ]);

      const [todayEntries, activeBookings] = await Promise.all([
        queryOne(`SELECT COUNT(*) as count FROM parking_history WHERE DATE(entry_time) = CURDATE()`),
        queryOne(`SELECT COUNT(*) as count FROM bookings WHERE status IN ('CONFIRMED','ACTIVE')`)
      ]);

      const now = new Date();
      const monthRevenue = await ParkingHistoryModel.getMonthRevenue(now.getFullYear(), now.getMonth() + 1);

      // Extract slot counts
      const totalSlots    = parseInt(slotSummary?.total || 0);
      const freeSlots     = parseInt(slotSummary?.free_count || 0);
      const occupiedSlots = parseInt(slotSummary?.occupied_count || 0);
      const reservedSlots = parseInt(slotSummary?.reserved_count || 0);
      const disabledSlots = parseInt(slotSummary?.disabled_count || 0);
      const freePct       = totalSlots > 0 ? Math.round((freeSlots / totalSlots) * 100) : 0;
      const occupiedPct   = totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0;
      const reservedPct   = totalSlots > 0 ? Math.round((reservedSlots / totalSlots) * 100) : 0;

      // Top vehicles
      let topVehicles = [];
      try {
        topVehicles = await query(`
          SELECT COALESCE(v.plate_number, '—') as plate_number,
                 COUNT(*) as visit_count
          FROM parking_history ph
          LEFT JOIN vehicles v ON ph.vehicle_id = v.id
          WHERE v.plate_number IS NOT NULL
          GROUP BY v.plate_number
          ORDER BY visit_count DESC
          LIMIT 5
        `);
      } catch (errTop) {
        topVehicles = [];
      }

      // Recent Activity combining parking entries, exits, guests and bookings
      let recent_activity = [];
      try {
        const recentActivityRows = await query(`
          (
            SELECT ph.entry_time as act_time, 'Đã vào' as act_type,
                   CONCAT('Xe ', COALESCE(v.plate_number, 'chưa rõ'), ' vào chỗ ', COALESCE(ps.slot_code, 'bãi')) as act_title,
                   COALESCE(u.name, 'Xe đã đăng ký') as act_detail
            FROM parking_history ph
            LEFT JOIN vehicles v ON ph.vehicle_id = v.id
            LEFT JOIN parking_slots ps ON ph.slot_id = ps.id
            LEFT JOIN users u ON ph.user_id = u.id
            WHERE ph.entry_time IS NOT NULL
          )
          UNION ALL
          (
            SELECT ph.exit_time as act_time, 'Đã ra' as act_type,
                   CONCAT('Xe ', COALESCE(v.plate_number, 'chưa rõ'), ' đã rời bãi') as act_title,
                   CONCAT('Phí gửi: ', FORMAT(COALESCE(ph.fee, 0), 0), ' đ') as act_detail
            FROM parking_history ph
            LEFT JOIN vehicles v ON ph.vehicle_id = v.id
            WHERE ph.exit_time IS NOT NULL
          )
          UNION ALL
          (
            SELECT gs.entry_time as act_time, 'Guest' as act_type,
                   CONCAT('Khách vãng lai ', gs.license_plate, ' vào chỗ ', COALESCE(gs.parking_slot, 'bãi')) as act_title,
                   'Khách vãng lai' as act_detail
            FROM guest_parking_sessions gs
            WHERE gs.entry_time IS NOT NULL
          )
          UNION ALL
          (
            SELECT b.created_at as act_time, 'Booking' as act_type,
                   CONCAT('Đặt chỗ ', COALESCE(ps.slot_code, '—'), ' (', b.booking_code, ')') as act_title,
                   COALESCE(u.name, 'Người dùng') as act_detail
            FROM bookings b
            LEFT JOIN parking_slots ps ON b.slot_id = ps.id
            LEFT JOIN vehicles v ON b.vehicle_id = v.id
            LEFT JOIN users u ON b.user_id = u.id
          )
          ORDER BY act_time DESC
          LIMIT 10
        `);

        recent_activity = recentActivityRows.map(r => {
          const d = new Date(r.act_time);
          const timeStr = isNaN(d.getTime()) ? '—' : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
          return {
            time: timeStr,
            type: r.act_type,
            title: r.act_title,
            detail: r.act_detail
          };
        });
      } catch (e) {
        recent_activity = [];
      }

      const esp1 = deviceList.find(d => d.device_code === 'ESP32_1');
      const esp2 = deviceList.find(d => d.device_code === 'ESP32_2');

      return success(res, {
        slots: slotSummary,
        total_slots: totalSlots,
        free_slots: freeSlots,
        free_pct: freePct,
        occupied_slots: occupiedSlots,
        occupied_pct: occupiedPct,
        reserved_slots: reservedSlots,
        reserved_pct: reservedPct,
        disabled_slots: disabledSlots,
        guest_sessions: activeGuest?.count || 0,
        recent_activity,
        top_vehicles: topVehicles,
        today_revenue: todayRevenue.revenue || 0,
        today_sessions: todayRevenue.sessions || 0,
        month_revenue: monthRevenue.revenue || 0,
        month_sessions: monthRevenue.sessions || 0,
        total_users: userCount.total || 0,
        today_entries: todayEntries.count || 0,
        active_bookings: activeBookings.count || 0,
        devices: deviceList.map(d => ({ device_code: d.device_code, name: d.name, status: d.status, last_seen: d.last_seen })),
        esp32_1_status: esp1?.status || 'ONLINE',
        esp32_2_status: esp2?.status || 'ONLINE',
        camera_in_status: 'ONLINE',
        camera_out_status: 'ONLINE',
        mqtt_status: 'ONLINE',
        db_status: 'ONLINE',
        server_status: 'ONLINE'
      });
    } catch (err) { next(err); }
  },

  // GET /api/statistics/revenue?days=30
  async getRevenue(req, res, next) {
    try {
      const days = parseInt(req.query.days) || 30;
      const [entriesList, exitsList, bookingsList] = await Promise.all([
        query(`
          SELECT DATE(entry_time) as date, COUNT(*) as entries
          FROM parking_history
          WHERE entry_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
          GROUP BY DATE(entry_time)
        `, [days]),
        query(`
          SELECT DATE(exit_time) as date, COUNT(*) as exits, COALESCE(SUM(fee), 0) as revenue
          FROM parking_history
          WHERE exit_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
          GROUP BY DATE(exit_time)
        `, [days]),
        query(`
          SELECT DATE(created_at) as date, COUNT(*) as bookings
          FROM bookings
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
          GROUP BY DATE(created_at)
        `, [days])
      ]);

      const dateMap = {};
      const toDateKey = (val) => {
        if (!val) return null;
        const dt = new Date(val);
        if (isNaN(dt.getTime())) return String(val).slice(0, 10);
        const yyyy = dt.getFullYear();
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const dd = String(dt.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      };

      const getOrInit = (key) => {
        if (!dateMap[key]) {
          dateMap[key] = { date: key, entries: 0, exits: 0, bookings: 0, revenue: 0, sessions: 0 };
        }
        return dateMap[key];
      };

      entriesList.forEach(r => {
        const k = toDateKey(r.date);
        if (k) getOrInit(k).entries += Number(r.entries || 0);
      });

      exitsList.forEach(r => {
        const k = toDateKey(r.date);
        if (k) {
          const exitsCount = Number(r.exits || 0);
          getOrInit(k).exits += exitsCount;
          getOrInit(k).sessions += exitsCount;
          getOrInit(k).revenue += Number(r.revenue || 0);
        }
      });

      bookingsList.forEach(r => {
        const k = toDateKey(r.date);
        if (k) getOrInit(k).bookings += Number(r.bookings || 0);
      });

      const daily = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
      return success(res, daily);
    } catch (err) { next(err); }
  },

  // GET /api/statistics/slots-usage
  async getSlotsUsage(req, res, next) {
    try {
      const usage = await query(`
        SELECT ps.slot_code, ps.zone,
          COUNT(ph.id) as total_sessions,
          COALESCE(SUM(ph.fee), 0) as total_revenue,
          COALESCE(AVG(ph.duration), 0) as avg_duration_minutes
        FROM parking_slots ps
        LEFT JOIN parking_history ph ON ps.id = ph.slot_id AND ph.exit_time IS NOT NULL
        GROUP BY ps.id, ps.slot_code, ps.zone
        ORDER BY total_sessions DESC
      `);
      return success(res, usage);
    } catch (err) { next(err); }
  },

  // GET /api/statistics/peak-hours
  async getPeakHours(req, res, next) {
    try {
      const peak = await query(`
        SELECT HOUR(entry_time) as hour, COUNT(*) as sessions
        FROM parking_history
        WHERE entry_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY HOUR(entry_time)
        ORDER BY hour ASC
      `);
      return success(res, peak);
    } catch (err) { next(err); }
  },

  // GET /api/statistics/monthly?year=2026
  async getMonthly(req, res, next) {
    try {
      const year = parseInt(req.query.year) || new Date().getFullYear();
      const monthly = await query(`
        SELECT MONTH(exit_time) as month,
          COALESCE(SUM(fee), 0) as revenue,
          COUNT(*) as sessions
        FROM parking_history
        WHERE YEAR(exit_time) = ? AND payment_status = 'PAID'
        GROUP BY MONTH(exit_time)
        ORDER BY month ASC
      `, [year]);
      return success(res, monthly);
    } catch (err) { next(err); }
  },

  // GET /api/statistics/booking-stats
  async getBookingStats(req, res, next) {
    try {
      const stats = await queryOne(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled,
          SUM(CASE WHEN status = 'EXPIRED' THEN 1 ELSE 0 END) as expired,
          SUM(CASE WHEN status IN ('CONFIRMED','ACTIVE') THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as today
        FROM bookings
      `);
      return success(res, stats);
    } catch (err) { next(err); }
  }
};

module.exports = statisticsController;
