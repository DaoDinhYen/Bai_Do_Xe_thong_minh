const { query, queryOne } = require('../config/db');

const NotificationModel = {
  create: ({ user_id, title, message, type = 'INFO' }) =>
    query(
      'INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (?, ?, ?, ?, 0)',
      [user_id, title, message, type]
    ),

  getByUser: ({ userId, page = 1, limit = 20, unreadOnly = false }) => {
    const offset = (page - 1) * limit;
    let sql = `SELECT * FROM notifications WHERE user_id = ?`;
    const params = [userId];
    if (unreadOnly) { sql += ` AND is_read = 0`; }
    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    return query(sql, params);
  },

  countUnread: (userId) =>
    queryOne('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0', [userId]),

  markRead: (id, userId) =>
    query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, userId]),

  markAllRead: (userId) =>
    query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]),

  deleteById: (id) =>
    query('DELETE FROM notifications WHERE id = ?', [id]),

  // Broadcast to all admins
  createForAdmins: async (title, message, type = 'ALERT') => {
    const admins = await query("SELECT id FROM users WHERE role = 'ADMIN'");
    const inserts = admins.map(a =>
      query('INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (?, ?, ?, ?, 0)', [a.id, title, message, type])
    );
    return Promise.all(inserts);
  },

  TYPES: {
    INFO:    'INFO',
    SUCCESS: 'SUCCESS',
    WARNING: 'WARNING',
    ALERT:   'ALERT',
    ERROR:   'ERROR'
  }
};

module.exports = NotificationModel;
