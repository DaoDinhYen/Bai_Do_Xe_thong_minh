const router = require('express').Router();
const ctrl = require('../controllers/deviceController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/',                  authenticate, ctrl.getAllDevices);
router.get('/logs/all',          authenticate, requireAdmin, ctrl.getAllDeviceLogs);
router.get('/:id',               authenticate, ctrl.getDeviceById);
router.get('/:id/logs',          authenticate, requireAdmin, ctrl.getDeviceLogs);
router.post('/',                 authenticate, requireAdmin, ctrl.createDevice);
router.put('/:id',               authenticate, requireAdmin, ctrl.updateDevice);
router.post('/barrier/control',  authenticate, requireAdmin, ctrl.controlBarrier);
router.post('/light/control',    authenticate, requireAdmin, ctrl.controlLight);

module.exports = router;
