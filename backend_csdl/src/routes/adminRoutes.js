const router = require('express').Router();
const ctrl = require('../controllers/adminController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/system-logs',   authenticate, requireAdmin, ctrl.getSystemLogs);
router.get('/alerts',        authenticate, requireAdmin, ctrl.getAlerts);
router.get('/config',        authenticate, requireAdmin, ctrl.getSystemConfig);
router.get('/overview',      authenticate, requireAdmin, ctrl.getOverview);

// Vehicle admin route  
const vehicleCtrl = require('../controllers/vehicleController');
router.get('/vehicles',      authenticate, requireAdmin, vehicleCtrl.getAllVehicles);

// User admin route
const userCtrl = require('../controllers/userController');
router.get('/users',         authenticate, requireAdmin, userCtrl.getAllUsers);
router.get('/users/:id',     authenticate, requireAdmin, userCtrl.getUserById);
router.put('/users/:id',     authenticate, requireAdmin, userCtrl.updateUserAdmin);
router.put('/users/:id/status', authenticate, requireAdmin, userCtrl.setUserStatus);
router.post('/users/:id/reset-password', authenticate, requireAdmin, userCtrl.resetPassword);

module.exports = router;
