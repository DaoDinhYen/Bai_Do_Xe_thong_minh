const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'smart_parking',
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  waitForConnections: true,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '+07:00'
});

/**
 * Test database connection on startup
 */
async function connectDB() {
  const connection = await pool.getConnection();
  await connection.ping();
  connection.release();
  return pool;
}

/**
 * Execute query with params
 * @param {string} sql
 * @param {Array} params
 * @returns {Promise<Array>}
 */
async function query(sql, params = []) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    logger.error('DB Query Error:', { sql, error: error.message });
    throw error;
  }
}

/**
 * Execute query and return first row
 */
async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

/**
 * Get a connection from pool (for transactions)
 */
async function getConnection() {
  return pool.getConnection();
}

module.exports = { pool, connectDB, query, queryOne, getConnection };
