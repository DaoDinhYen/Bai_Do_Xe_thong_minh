const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const SystemLogModel = require('../models/systemLogModel');

/**
 * Auth Service — Register, Login, Token management
 */

async function register({ name, email, phone, password }) {
  // Check duplicate
  const existing = await UserModel.findByEmail(email);
  if (existing) throw Object.assign(new Error('Email đã được sử dụng'), { statusCode: 409 });

  if (phone) {
    const existingPhone = await UserModel.findByPhone(phone);
    if (existingPhone) throw Object.assign(new Error('Số điện thoại đã được sử dụng'), { statusCode: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const result = await UserModel.create({ name, email, phone, password: hashedPassword });
  const user = await UserModel.findById(result.insertId);

  await SystemLogModel.create({ user_id: user.id, action: SystemLogModel.ACTIONS.REGISTER, description: `User registered: ${email}` });

  return user;
}

async function login({ email, password, ip_address }) {
  const user = await UserModel.findByEmail(email);
  if (!user) throw Object.assign(new Error('Email hoặc mật khẩu không đúng'), { statusCode: 401 });

  if (user.status === 'BLOCKED') throw Object.assign(new Error('Tài khoản đã bị khóa'), { statusCode: 403 });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw Object.assign(new Error('Email hoặc mật khẩu không đúng'), { statusCode: 401 });

  const token = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  await SystemLogModel.create({ user_id: user.id, action: SystemLogModel.ACTIONS.LOGIN, description: `Login from ${ip_address || 'unknown'}`, ip_address });

  const { password: _, ...safeUser } = user;
  return { user: safeUser, token, refreshToken };
}

function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
}

async function refreshAccessToken(refreshToken) {
  const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
  const user = await UserModel.findById(decoded.id);
  if (!user || user.status === 'BLOCKED') throw Object.assign(new Error('Invalid refresh token'), { statusCode: 401 });
  return generateAccessToken(user);
}

async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await UserModel.findByEmail((await UserModel.findById(userId)).email);
  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) throw Object.assign(new Error('Mật khẩu hiện tại không đúng'), { statusCode: 400 });

  const hashed = await bcrypt.hash(newPassword, 12);
  await UserModel.updatePassword(userId, hashed);
}

async function resetPasswordByAdmin(userId, newPassword) {
  const hashed = await bcrypt.hash(newPassword, 12);
  await UserModel.updatePassword(userId, hashed);
}

module.exports = { register, login, refreshAccessToken, changePassword, resetPasswordByAdmin, generateAccessToken };
