const { topUp } = require('../services/paymentService');
const TransactionModel = require('../models/transactionModel');
const UserModel = require('../models/userModel');
const { success, created, badRequest, paginated, error } = require('../utils/response');

const paymentController = {
  // POST /api/payment/topup
  async topUp(req, res, next) {
    try {
      const { amount } = req.body;
      if (!amount || amount <= 0) return badRequest(res, 'Số tiền nạp phải lớn hơn 0');
      if (amount > 50000000) return badRequest(res, 'Số tiền nạp tối đa 50,000,000 VNĐ');

      const result = await topUp(req.user.id, parseFloat(amount), `Nạp tiền vào ví: ${parseFloat(amount).toLocaleString('vi-VN')} VNĐ`);
      return success(res, result, `Nạp tiền thành công: ${parseFloat(amount).toLocaleString('vi-VN')} VNĐ`);
    } catch (err) {
      if (err.statusCode) return error(res, err.message, err.statusCode);
      next(err);
    }
  },

  // GET /api/payment/transactions — My transactions
  async getMyTransactions(req, res, next) {
    try {
      const { page = 1, limit = 20, type = '' } = req.query;
      const [transactions, countRow] = await Promise.all([
        TransactionModel.getByUser({ userId: req.user.id, page: +page, limit: +limit, type }),
        TransactionModel.countByUser(req.user.id, type)
      ]);
      return paginated(res, transactions, countRow.total, page, limit);
    } catch (err) { next(err); }
  },

  // GET /api/payment/balance
  async getBalance(req, res, next) {
    try {
      const user = await UserModel.findById(req.user.id);
      return success(res, { wallet_balance: user.wallet_balance });
    } catch (err) { next(err); }
  },

  // === ADMIN ===
  async getAllTransactions(req, res, next) {
    try {
      const { page = 1, limit = 20, type = '', status = '', search = '', date = '', sort_by = 'created_at', sort_order = 'DESC' } = req.query;
      const [transactions, countRow] = await Promise.all([
        TransactionModel.getAll({ page: +page, limit: +limit, type, status, search, date, sort_by, sort_order }),
        TransactionModel.count({ type, status, search, date })
      ]);
      return paginated(res, transactions, countRow.total, page, limit);
    } catch (err) { next(err); }
  },

  // POST /api/admin/payment/adjust-wallet  (admin manual adjustment)
  async adjustWallet(req, res, next) {
    try {
      const { user_id, amount, description } = req.body;
      if (!user_id || amount === undefined) return badRequest(res, 'user_id và amount là bắt buộc');
      const result = await topUp(user_id, parseFloat(amount), description || `Admin điều chỉnh ví: ${amount}`);
      return success(res, result, 'Điều chỉnh ví thành công');
    } catch (err) { next(err); }
  }
};

module.exports = paymentController;
