const router = require('express').Router();
const ctrl = require('../controllers/statisticsController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/dashboard',     authenticate, requireAdmin, ctrl.getDashboard);
router.get('/revenue',       authenticate, requireAdmin, ctrl.getRevenue);
router.get('/slots-usage',   authenticate, requireAdmin, ctrl.getSlotsUsage);
router.get('/peak-hours',    authenticate, requireAdmin, ctrl.getPeakHours);
router.get('/monthly',       authenticate, requireAdmin, ctrl.getMonthly);
router.get('/bookings',      authenticate, requireAdmin, ctrl.getBookingStats);

module.exports = router;
