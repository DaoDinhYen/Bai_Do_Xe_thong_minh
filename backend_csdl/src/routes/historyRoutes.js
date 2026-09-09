const router = require('express').Router();
const ctrl = require('../controllers/historyController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// User — own history
router.get('/',              authenticate, ctrl.getMyHistory);
router.get('/:id',           authenticate, ctrl.getHistoryById);

// Admin — all history
router.get('/admin/all',             authenticate, requireAdmin, ctrl.getAllHistory);
router.get('/admin/guest-sessions',  authenticate, requireAdmin, ctrl.getGuestSessions);
router.get('/admin/guest-sessions/active', authenticate, requireAdmin, ctrl.getActiveGuestSessions);

module.exports = router;
