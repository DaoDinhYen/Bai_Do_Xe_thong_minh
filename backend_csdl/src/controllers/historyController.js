const ParkingHistoryModel = require('../models/parkingHistoryModel');
const GuestSessionModel = require('../models/guestSessionModel');
const { success, notFound, forbidden, paginated } = require('../utils/response');

const historyController = {
  // GET /api/history — My parking history
  async getMyHistory(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const [history, countRow] = await Promise.all([
        ParkingHistoryModel.getByUser({ userId: req.user.id, page: +page, limit: +limit }),
        ParkingHistoryModel.count({ userId: req.user.id })
      ]);
      return paginated(res, history, countRow.total, page, limit);
    } catch (err) { next(err); }
  },

  // GET /api/history/:id
  async getHistoryById(req, res, next) {
    try {
      const record = await ParkingHistoryModel.findById(req.params.id);
      if (!record) return notFound(res, 'Không tìm thấy lịch sử gửi xe');
      if (record.user_id !== req.user.id && req.user.role !== 'ADMIN') return forbidden(res);
      return success(res, record);
    } catch (err) { next(err); }
  },

  // === ADMIN ===
  async getAllHistory(req, res, next) {
    try {
      const { page = 1, limit = 20, search = '', status = '', date = '', sort_by = 'entry_time', sort_order = 'DESC' } = req.query;
      const [history, countRow] = await Promise.all([
        ParkingHistoryModel.getAll({ page: +page, limit: +limit, search, status, date, sort_by, sort_order }),
        ParkingHistoryModel.count({ search, status, date })
      ]);
      return paginated(res, history, countRow.total, page, limit);
    } catch (err) { next(err); }
  },

  // GET /api/admin/history/guest-sessions
  async getGuestSessions(req, res, next) {
    try {
      const { page = 1, limit = 20, status = '', date = '', search = '' } = req.query;
      const [sessions, countRow] = await Promise.all([
        GuestSessionModel.getAll({ page: +page, limit: +limit, status, date, search }),
        GuestSessionModel.count({ status, date, search })
      ]);
      return paginated(res, sessions, countRow.total, page, limit);
    } catch (err) { next(err); }
  },

  // GET /api/admin/history/guest-sessions/active
  async getActiveGuestSessions(req, res, next) {
    try {
      const sessions = await GuestSessionModel.getActive();
      return success(res, sessions);
    } catch (err) { next(err); }
  }
};

module.exports = historyController;
