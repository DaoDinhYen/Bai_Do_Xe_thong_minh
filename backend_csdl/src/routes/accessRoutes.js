const router = require('express').Router();
const ctrl = require('../controllers/accessController');

// These endpoints are called by ESP32 gateway or ANPR integration
// No JWT required (called from embedded systems), but consider API key in production
router.post('/verify',      ctrl.verify);
router.post('/rfid-only',   ctrl.rfidOnly);

module.exports = router;
