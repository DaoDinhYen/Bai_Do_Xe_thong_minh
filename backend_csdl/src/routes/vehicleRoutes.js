const router = require('express').Router();
const ctrl = require('../controllers/vehicleController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// User routes
router.get('/',              authenticate, ctrl.getMyVehicles);
router.get('/:id',           authenticate, ctrl.getVehicleById);
router.post('/',             authenticate, ctrl.createVehicle);
router.put('/:id',           authenticate, ctrl.updateVehicle);
router.delete('/:id',        authenticate, ctrl.deleteVehicle);
router.put('/:id/set-default', authenticate, ctrl.setDefault);

// Admin
router.get('/admin/all',     authenticate, requireAdmin, ctrl.getAllVehicles);

module.exports = router;
