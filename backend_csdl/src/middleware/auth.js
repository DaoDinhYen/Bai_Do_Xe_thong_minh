const jwt = require('jsonwebtoken');
const { queryOne } = require('../config/db');
const { unauthorized, forbidden } = require('../utils/response');

/**
 * Verify JWT token middleware
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorized(res, 'Access token is required');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh user from DB to check status
    const user = await queryOne(
      'SELECT id, name, email, role, status FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!user) {
      return unauthorized(res, 'User not found');
    }

    if (user.status === 'BLOCKED') {
      return forbidden(res, 'Your account has been blocked');
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return unauthorized(res, 'Token has expired');
    }
    if (err.name === 'JsonWebTokenError') {
      return unauthorized(res, 'Invalid token');
    }
    return unauthorized(res, 'Authentication failed');
  }
};

/**
 * Require ADMIN role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return forbidden(res, 'Admin access required');
  }
  next();
};

/**
 * Require USER role (or admin can also access)
 */
const requireUser = (req, res, next) => {
  if (!req.user) {
    return unauthorized(res, 'Authentication required');
  }
  next();
};

/**
 * Optional auth — attach user if token present, but don't fail if not
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await queryOne(
        'SELECT id, name, email, role, status FROM users WHERE id = ?',
        [decoded.id]
      );
      req.user = user || null;
    }
  } catch {
    req.user = null;
  }
  next();
};

module.exports = { authenticate, requireAdmin, requireUser, optionalAuth };
