const router = require('express').Router();
const ctrl = require('../controllers/parkingController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Public / User routes
router.get('/slots',           authenticate, ctrl.getAllSlots);
router.get('/slots/summary',   authenticate, ctrl.getSummary);
router.get('/slots/available', authenticate, ctrl.getAvailable);
router.get('/slots/:id',       authenticate, ctrl.getSlotById);
router.get('/rates',           ctrl.getRates);  // public — used for fee estimation

// Admin routes
router.post('/slots',          authenticate, requireAdmin, ctrl.createSlot);
router.put('/slots/:id',       authenticate, requireAdmin, ctrl.updateSlot);
router.post('/rates',          authenticate, requireAdmin, ctrl.createRate);
router.put('/rates/batch',     authenticate, requireAdmin, ctrl.batchUpdateRates);
router.put('/rates/:id',       authenticate, requireAdmin, ctrl.updateRate);

module.exports = router;
