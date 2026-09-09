const router = require('express').Router();
const ctrl = require('../controllers/cameraController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// ANPR service sends detection (no auth needed from internal service, but use API key in production)
router.post('/detection',       ctrl.receiveDetection);

// Admin
router.get('/',                 authenticate, requireAdmin, ctrl.getAllCameras);
router.get('/records',          authenticate, requireAdmin, ctrl.getRecords);
router.get('/records/latest',   authenticate, requireAdmin, ctrl.getLatestDetections);
router.post('/register',        authenticate, requireAdmin, ctrl.createCamera);

module.exports = router;
