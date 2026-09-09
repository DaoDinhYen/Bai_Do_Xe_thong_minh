/**
 * Payment Service — Wallet operations with transaction logging
 */
const UserModel = require('../models/userModel');
const TransactionModel = require('../models/transactionModel');
const { getConnection } = require('../config/db');

/**
 * Top up wallet balance
 */
async function topUp(userId, amount, description = 'Nạp tiền vào ví') {
  if (amount <= 0) throw Object.assign(new Error('Số tiền nạp phải lớn hơn 0'), { statusCode: 400 });

  const conn = await getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?', [amount, userId]);
    await conn.execute(
      'INSERT INTO transactions (user_id, type, amount, description, status) VALUES (?, ?, ?, ?, ?)',
      [userId, TransactionModel.TYPES.TOP_UP, amount, description, 'SUCCESS']
    );
    await conn.commit();
    const user = await UserModel.findById(userId);
    return { wallet_balance: user.wallet_balance, amount };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Deduct from wallet (booking payment)
 * Returns false if insufficient balance
 */
async function deductWallet(userId, amount, description, type = 'BOOKING_PAYMENT', referenceId = null) {
  const conn = await getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute('SELECT wallet_balance FROM users WHERE id = ? FOR UPDATE', [userId]);
    const balance = parseFloat(rows[0].wallet_balance);

    if (balance < amount) {
      await conn.rollback();
      return { success: false, reason: 'INSUFFICIENT_BALANCE', balance };
    }

    await conn.execute('UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?', [amount, userId]);
    await conn.execute(
      'INSERT INTO transactions (user_id, type, amount, description, status, reference_id) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, type, -amount, description, 'SUCCESS', referenceId]
    );

    await conn.commit();
    const [updated] = await conn.execute('SELECT wallet_balance FROM users WHERE id = ?', [userId]);
    return { success: true, new_balance: parseFloat(updated[0].wallet_balance) };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Refund to wallet
 */
async function refundWallet(userId, amount, description, referenceId = null) {
  const conn = await getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?', [amount, userId]);
    await conn.execute(
      'INSERT INTO transactions (user_id, type, amount, description, status, reference_id) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, TransactionModel.TYPES.REFUND, amount, description, 'SUCCESS', referenceId]
    );
    await conn.commit();
    return { success: true, refund_amount: amount };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Handle parking checkout payment:
 * - Compare actual fee vs already-paid booking fee
 * - Charge extra if overstayed, refund if stayed less
 */
async function handleParkingCheckout({ userId, actualFee, paidFee, historyId, vehicleId }) {
  const diff = actualFee - (paidFee || 0);
  let result = { action: 'NONE', amount: 0 };

  if (diff > 0) {
    // User owes more — charge extra
    const payment = await deductWallet(
      userId, diff,
      `Phí gửi xe phát sinh thêm (phiên #${historyId})`,
      'PARKING_PAYMENT', historyId
    );
    if (!payment.success) throw Object.assign(new Error('Số dư ví không đủ để thanh toán phí phát sinh'), { statusCode: 402 });
    result = { action: 'CHARGED', amount: diff, new_balance: payment.new_balance };
  } else if (diff < 0) {
    // User overpaid — refund
    const refund = await refundWallet(userId, Math.abs(diff), `Hoàn tiền gửi xe (phiên #${historyId})`, historyId);
    result = { action: 'REFUNDED', amount: Math.abs(diff) };
  }

  return result;
}

module.exports = { topUp, deductWallet, refundWallet, handleParkingCheckout };
