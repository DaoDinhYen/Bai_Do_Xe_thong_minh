const { query, queryOne } = require('../config/db');

const UserModel = {
  findById: (id) =>
    queryOne('SELECT id, name, email, phone, role, wallet_balance, status, created_at FROM users WHERE id = ?', [id]),

  findByEmail: (email) =>
    queryOne('SELECT * FROM users WHERE email = ?', [email]),

  findByPhone: (phone) =>
    queryOne('SELECT * FROM users WHERE phone = ?', [phone]),

  create: ({ name, email, phone, password, role = 'USER' }) =>
    query(
      'INSERT INTO users (name, email, phone, password, role, wallet_balance, status) VALUES (?, ?, ?, ?, ?, 0, "ACTIVE")',
      [name, email, phone, password, role]
    ),

  updateById: (id, fields) => {
    const keys = Object.keys(fields);
    const sql = `UPDATE users SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ?`;
    return query(sql, [...Object.values(fields), id]);
  },

  updatePassword: (id, hashedPassword) =>
    query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]),

  updateWallet: (id, amount) =>
    query('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?', [amount, id]),

  setStatus: (id, status) =>
    query('UPDATE users SET status = ? WHERE id = ?', [status, id]),

  getAll: ({ page = 1, limit = 20, search = '', role = '', status = '', sort_by = 'created_at', sort_order = 'DESC' } = {}) => {
    const offset = (page - 1) * limit;
    let sql = `SELECT id, name, email, phone, role, wallet_balance, status, created_at FROM users WHERE 1=1`;
    const params = [];
    if (search) { sql += ` AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)`; const s = `%${search}%`; params.push(s, s, s); }
    if (role) { sql += ` AND role = ?`; params.push(role); }
    if (status) {
      const s = status === 'BANNED' ? 'BLOCKED' : status;
      sql += ` AND status = ?`;
      params.push(s);
    }
    const safeSort = ['created_at', 'name', 'wallet_balance', 'id'].includes(sort_by) ? sort_by : 'created_at';
    const safeOrder = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    sql += ` ORDER BY ${safeSort} ${safeOrder} LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    return query(sql, params);
  },

  count: ({ search = '', role = '', status = '' } = {}) => {
    let sql = `SELECT COUNT(*) as total FROM users WHERE 1=1`;
    const params = [];
    if (search) { sql += ` AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)`; const s = `%${search}%`; params.push(s, s, s); }
    if (role) { sql += ` AND role = ?`; params.push(role); }
    if (status) {
      const s = status === 'BANNED' ? 'BLOCKED' : status;
      sql += ` AND status = ?`;
      params.push(s);
    }
    return queryOne(sql, params);
  },

  deleteById: (id) => query('DELETE FROM users WHERE id = ?', [id])
};

module.exports = UserModel;
