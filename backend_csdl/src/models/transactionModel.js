const { query, queryOne } = require('../config/db');

const TransactionModel = {
  findById: (id) =>
    queryOne('SELECT * FROM transactions WHERE id = ?', [id]),

  create: ({ user_id, type, amount, description, status = 'SUCCESS', reference_id = null }) =>
    query(
      'INSERT INTO transactions (user_id, type, amount, description, status, reference_id) VALUES (?, ?, ?, ?, ?, ?)',
      [user_id, type, amount, description, status, reference_id]
    ),

  getByUser: ({ userId, page = 1, limit = 20, type = '' }) => {
    const offset = (page - 1) * limit;
    let sql = `SELECT * FROM transactions WHERE user_id = ?`;
    const params = [userId];
    if (type) { sql += ` AND type = ?`; params.push(type); }
    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    return query(sql, params);
  },

  countByUser: (userId, type = '') => {
    let sql = `SELECT COUNT(*) as total FROM transactions WHERE user_id = ?`;
    const params = [userId];
    if (type) { sql += ` AND type = ?`; params.push(type); }
    return queryOne(sql, params);
  },

  getAll: ({ page = 1, limit = 20, type = '', status = '', search = '', date = '', sort_by = 'created_at', sort_order = 'DESC' } = {}) => {
    const offset = (page - 1) * limit;
    let sql = `SELECT t.*, u.name as user_name, u.email as user_email
               FROM transactions t
               LEFT JOIN users u ON t.user_id = u.id WHERE 1=1`;
    const params = [];
    if (type) { sql += ` AND t.type = ?`; params.push(type); }
    if (status) { sql += ` AND t.status = ?`; params.push(status); }
    if (date) { sql += ` AND DATE(t.created_at) = ?`; params.push(date); }
    if (search) {
      sql += ` AND (u.name LIKE ? OR u.email LIKE ? OR t.description LIKE ? OR CAST(t.id AS CHAR) = ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, search);
    }
    const safeSort = ['created_at', 'amount', 'id'].includes(sort_by) ? sort_by : 'created_at';
    const safeOrder = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    sql += ` ORDER BY t.${safeSort} ${safeOrder} LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    return query(sql, params);
  },

  count: ({ type = '', status = '', search = '', date = '' } = {}) => {
    let sql = `SELECT COUNT(*) as total
               FROM transactions t
               LEFT JOIN users u ON t.user_id = u.id WHERE 1=1`;
    const params = [];
    if (type) { sql += ` AND t.type = ?`; params.push(type); }
    if (status) { sql += ` AND t.status = ?`; params.push(status); }
    if (date) { sql += ` AND DATE(t.created_at) = ?`; params.push(date); }
    if (search) {
      sql += ` AND (u.name LIKE ? OR u.email LIKE ? OR t.description LIKE ? OR CAST(t.id AS CHAR) = ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, search);
    }
    return queryOne(sql, params);
  },

  // Types: TOP_UP, BOOKING_PAYMENT, PARKING_PAYMENT, REFUND
  TYPES: {
    TOP_UP:          'TOP_UP',
    BOOKING_PAYMENT: 'BOOKING_PAYMENT',
    PARKING_PAYMENT: 'PARKING_PAYMENT',
    REFUND:          'REFUND'
  }
};

module.exports = TransactionModel;
