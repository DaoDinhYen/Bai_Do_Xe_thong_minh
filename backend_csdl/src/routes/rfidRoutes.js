const router = require('express').Router();
const ctrl = require('../controllers/rfidController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/cards',              authenticate, requireAdmin, ctrl.getAllCards);
router.get('/cards/:uid',         authenticate, requireAdmin, ctrl.getCardByUid);
router.post('/register',          authenticate, requireAdmin, ctrl.registerCard);
router.put('/cards/:id/status',   authenticate, requireAdmin, ctrl.setCardStatus);
router.delete('/cards/:id',       authenticate, requireAdmin, ctrl.deleteCard);
router.post('/simulate-scan',     authenticate, requireAdmin, ctrl.simulateScan);

module.exports = router;
