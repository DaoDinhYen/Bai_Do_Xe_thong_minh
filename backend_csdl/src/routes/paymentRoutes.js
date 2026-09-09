const router = require('express').Router();
const ctrl = require('../controllers/paymentController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.post('/topup',             authenticate, ctrl.topUp);
router.get('/transactions',       authenticate, ctrl.getMyTransactions);
router.get('/balance',            authenticate, ctrl.getBalance);
router.get('/transactions/all',   authenticate, requireAdmin, ctrl.getAllTransactions);
router.post('/adjust-wallet',     authenticate, requireAdmin, ctrl.adjustWallet);

module.exports = router;
