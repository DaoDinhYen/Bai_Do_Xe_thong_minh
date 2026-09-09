const NotificationModel = require('../models/notificationModel');
const { success, badRequest, notFound, paginated } = require('../utils/response');
const { emitNotification } = require('../socket/socketHandler');

const notificationController = {
  // GET /api/notifications — My notifications
  async getMyNotifications(req, res, next) {
    try {
      const { page = 1, limit = 20, unread_only = false } = req.query;
      const [notifications, unreadCount] = await Promise.all([
        NotificationModel.getByUser({ userId: req.user.id, page: +page, limit: +limit, unreadOnly: unread_only === 'true' }),
        NotificationModel.countUnread(req.user.id)
      ]);
      return success(res, { notifications, unread_count: unreadCount.count || 0 });
    } catch (err) { next(err); }
  },

  // PUT /api/notifications/:id/read
  async markRead(req, res, next) {
    try {
      await NotificationModel.markRead(req.params.id, req.user.id);
      return success(res, null, 'Đã đánh dấu đã đọc');
    } catch (err) { next(err); }
  },

  // PUT /api/notifications/read-all
  async markAllRead(req, res, next) {
    try {
      await NotificationModel.markAllRead(req.user.id);
      return success(res, null, 'Đã đánh dấu tất cả là đã đọc');
    } catch (err) { next(err); }
  },

  // GET /api/notifications/unread-count
  async getUnreadCount(req, res, next) {
    try {
      const result = await NotificationModel.countUnread(req.user.id);
      return success(res, { count: result.count || 0 });
    } catch (err) { next(err); }
  },

  // === ADMIN ===
  // POST /api/admin/notifications/push — Push notification to user
  async pushNotification(req, res, next) {
    try {
      const { user_id, title, message, type = 'INFO' } = req.body;
      if (!user_id || !title || !message) return badRequest(res, 'user_id, title, message là bắt buộc');

      const result = await NotificationModel.create({ user_id, title, message, type });
      // Emit real-time
      emitNotification(user_id, { id: result.insertId, title, message, type, is_read: 0, created_at: new Date().toISOString() });

      return success(res, null, 'Đã gửi thông báo');
    } catch (err) { next(err); }
  },

  // POST /api/admin/notifications/broadcast — Broadcast to all admins
  async broadcastToAdmins(req, res, next) {
    try {
      const { title, message, type = 'ALERT' } = req.body;
      if (!title || !message) return badRequest(res, 'title và message là bắt buộc');
      await NotificationModel.createForAdmins(title, message, type);
      return success(res, null, 'Đã broadcast đến Admin');
    } catch (err) { next(err); }
  }
};

module.exports = notificationController;
