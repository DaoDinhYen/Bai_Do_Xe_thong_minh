const router = require('express').Router();
const ctrl = require('../controllers/bookingController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.post('/',             authenticate, ctrl.createBooking);
router.get('/',              authenticate, ctrl.getMyBookings);
router.get('/estimate',      authenticate, ctrl.estimateFee);
router.get('/all',           authenticate, requireAdmin, ctrl.getAllBookings);
router.get('/:id',           authenticate, ctrl.getBookingById);
router.put('/:id/cancel',    authenticate, ctrl.cancelBooking);

module.exports = router;
