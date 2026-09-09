const AuthService = require('../services/authService');
const { success, created, badRequest, error } = require('../utils/response');

const authController = {
  async register(req, res, next) {
    try {
      const { name, email, phone, password } = req.body;
      if (!name || !email || !password) return badRequest(res, 'name, email, password là bắt buộc');
      if (password.length < 6) return badRequest(res, 'Mật khẩu phải ít nhất 6 ký tự');

      const user = await AuthService.register({ name, email, phone, password });
      return created(res, { user }, 'Đăng ký thành công');
    } catch (err) {
      if (err.statusCode) return error(res, err.message, err.statusCode);
      next(err);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) return badRequest(res, 'Email và mật khẩu là bắt buộc');

      const result = await AuthService.login({ email, password, ip_address: req.ip });
      return success(res, result, 'Đăng nhập thành công');
    } catch (err) {
      if (err.statusCode) return error(res, err.message, err.statusCode);
      next(err);
    }
  },

  async logout(req, res, next) {
    try {
      // JWT is stateless — client just drops the token
      // Optionally: add token to blacklist in Redis/DB
      return success(res, null, 'Đăng xuất thành công');
    } catch (err) { next(err); }
  },

  async refreshToken(req, res, next) {
    try {
      const { refresh_token } = req.body;
      if (!refresh_token) return badRequest(res, 'Refresh token là bắt buộc');
      const token = await AuthService.refreshAccessToken(refresh_token);
      return success(res, { token }, 'Token đã được làm mới');
    } catch (err) {
      if (err.statusCode) return error(res, err.message, err.statusCode);
      next(err);
    }
  },

  async changePassword(req, res, next) {
    try {
      const { current_password, new_password } = req.body;
      if (!current_password || !new_password) return badRequest(res, 'Mật khẩu hiện tại và mới là bắt buộc');
      if (new_password.length < 6) return badRequest(res, 'Mật khẩu mới phải ít nhất 6 ký tự');

      await AuthService.changePassword(req.user.id, { currentPassword: current_password, newPassword: new_password });
      return success(res, null, 'Đổi mật khẩu thành công');
    } catch (err) {
      if (err.statusCode) return error(res, err.message, err.statusCode);
      next(err);
    }
  }
};

module.exports = authController;
