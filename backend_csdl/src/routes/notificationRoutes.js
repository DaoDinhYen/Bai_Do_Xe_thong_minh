const router = require('express').Router();
const ctrl = require('../controllers/notificationController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/',              authenticate, ctrl.getMyNotifications);
router.get('/unread-count',  authenticate, ctrl.getUnreadCount);
router.put('/read-all',      authenticate, ctrl.markAllRead);
router.put('/:id/read',      authenticate, ctrl.markRead);

// Admin
router.post('/push',         authenticate, requireAdmin, ctrl.pushNotification);
router.post('/broadcast',    authenticate, requireAdmin, ctrl.broadcastToAdmins);

module.exports = router;
