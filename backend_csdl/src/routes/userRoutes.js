const router = require('express').Router();
const ctrl = require('../controllers/userController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// User routes (self)
router.get('/profile',    authenticate, ctrl.getProfile);
router.put('/profile',    authenticate, ctrl.updateProfile);
router.get('/wallet',     authenticate, ctrl.getWallet);

// Admin routes
router.get('/',                          authenticate, requireAdmin, ctrl.getAllUsers);
router.post('/',                         authenticate, requireAdmin, ctrl.createUserAdmin);
router.get('/:id',                       authenticate, requireAdmin, ctrl.getUserById);
router.put('/:id',                       authenticate, requireAdmin, ctrl.updateUserAdmin);
router.put('/:id/status',                authenticate, requireAdmin, ctrl.setUserStatus);
router.post('/:id/reset-password',       authenticate, requireAdmin, ctrl.resetPassword);

module.exports = router;
