const UserModel = require('../models/userModel');
const AuthService = require('../services/authService');
const { success, created, badRequest, notFound, forbidden, paginated, error } = require('../utils/response');

const userController = {
  // GET /api/users/profile
  async getProfile(req, res, next) {
    try {
      const user = await UserModel.findById(req.user.id);
      if (!user) return notFound(res, 'Người dùng không tồn tại');
      return success(res, user);
    } catch (err) { next(err); }
  },

  // PUT /api/users/profile
  async updateProfile(req, res, next) {
    try {
      const { name, phone } = req.body;
      const updates = {};
      if (name) updates.name = name;
      if (phone) updates.phone = phone;
      if (!Object.keys(updates).length) return badRequest(res, 'Không có dữ liệu cập nhật');

      await UserModel.updateById(req.user.id, updates);
      const updated = await UserModel.findById(req.user.id);
      return success(res, updated, 'Cập nhật thông tin thành công');
    } catch (err) { next(err); }
  },

  // GET /api/users/wallet
  async getWallet(req, res, next) {
    try {
      const user = await UserModel.findById(req.user.id);
      return success(res, { wallet_balance: user.wallet_balance });
    } catch (err) { next(err); }
  },

  // === ADMIN ONLY ===

  // GET /api/admin/users
  async getAllUsers(req, res, next) {
    try {
      const { page = 1, limit = 20, search = '', role = '', status = '', sort_by = 'created_at', sort_order = 'DESC' } = req.query;
      const [users, countRow] = await Promise.all([
        UserModel.getAll({ page: +page, limit: +limit, search, role, status, sort_by, sort_order }),
        UserModel.count({ search, role, status })
      ]);
      return paginated(res, users, countRow.total, page, limit);
    } catch (err) { next(err); }
  },

  // POST /api/admin/users — Create new user
  async createUserAdmin(req, res, next) {
    try {
      const { name, email, phone, password, role = 'USER', wallet_balance = 0 } = req.body;
      if (!name || !email || !password) return badRequest(res, 'Họ tên, email và mật khẩu là bắt buộc');
      const existing = await UserModel.findByEmail(email);
      if (existing) return badRequest(res, 'Email này đã tồn tại trong hệ thống');
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 12);
      const result = await UserModel.create({ name, email, phone, password: hashedPassword, role });
      if (wallet_balance > 0) {
        await UserModel.updateWallet(result.insertId, parseFloat(wallet_balance));
      }
      const newUser = await UserModel.findById(result.insertId);
      return created(res, newUser, 'Tạo người dùng thành công');
    } catch (err) { next(err); }
  },

  // GET /api/admin/users/:id
  async getUserById(req, res, next) {
    try {
      const user = await UserModel.findById(req.params.id);
      if (!user) return notFound(res, 'Người dùng không tồn tại');
      return success(res, user);
    } catch (err) { next(err); }
  },

  // PUT /api/admin/users/:id/status
  async setUserStatus(req, res, next) {
    try {
      let { status } = req.body;
      if (status === 'BANNED') status = 'BLOCKED';
      if (!['ACTIVE', 'BLOCKED'].includes(status)) return badRequest(res, 'Trạng thái không hợp lệ (ACTIVE/BLOCKED)');
      if (parseInt(req.params.id) === req.user.id) return forbidden(res, 'Không thể tự khóa chính mình');
      await UserModel.setStatus(req.params.id, status);
      return success(res, null, `Tài khoản đã được ${status === 'BLOCKED' ? 'khóa' : 'mở khóa'}`);
    } catch (err) { next(err); }
  },

  // PUT /api/admin/users/:id
  async updateUserAdmin(req, res, next) {
    try {
      const { name, phone, role } = req.body;
      const updates = {};
      if (name) updates.name = name;
      if (phone) updates.phone = phone;
      if (role && ['USER', 'ADMIN'].includes(role)) updates.role = role;
      await UserModel.updateById(req.params.id, updates);
      const updated = await UserModel.findById(req.params.id);
      return success(res, updated, 'Cập nhật thành công');
    } catch (err) { next(err); }
  },

  // POST /api/admin/users/:id/reset-password
  async resetPassword(req, res, next) {
    try {
      const { new_password } = req.body;
      if (!new_password || new_password.length < 6) return badRequest(res, 'Mật khẩu mới phải ít nhất 6 ký tự');
      await AuthService.resetPasswordByAdmin(req.params.id, new_password);
      return success(res, null, 'Đặt lại mật khẩu thành công');
    } catch (err) { next(err); }
  }
};

module.exports = userController;
