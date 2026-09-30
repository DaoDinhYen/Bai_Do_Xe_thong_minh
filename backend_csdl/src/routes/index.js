const express = require('express');
const router = express.Router();

const authRoutes         = require('./authRoutes');
const userRoutes         = require('./userRoutes');
const vehicleRoutes      = require('./vehicleRoutes');
const parkingRoutes      = require('./parkingRoutes');
const bookingRoutes      = require('./bookingRoutes');
const paymentRoutes      = require('./paymentRoutes');
const rfidRoutes         = require('./rfidRoutes');
const deviceRoutes       = require('./deviceRoutes');
const cameraRoutes       = require('./cameraRoutes');
const accessRoutes       = require('./accessRoutes');
const historyRoutes      = require('./historyRoutes');
const statisticsRoutes   = require('./statisticsRoutes');
const adminRoutes        = require('./adminRoutes');
const notificationRoutes = require('./notificationRoutes');
const aiRoutes           = require('./aiRoutes');

router.use('/auth',          authRoutes);
router.use('/users',         userRoutes);
router.use('/vehicles',      vehicleRoutes);
router.use('/parking',       parkingRoutes);
router.use('/bookings',      bookingRoutes);
router.use('/payment',       paymentRoutes);
router.use('/rfid',          rfidRoutes);
router.use('/devices',       deviceRoutes);
router.use('/camera',        cameraRoutes);
router.use('/access',        accessRoutes);
router.use('/history',       historyRoutes);
router.use('/statistics',    statisticsRoutes);
router.use('/admin',         adminRoutes);
router.use('/notifications', notificationRoutes);
router.use('/ai',            aiRoutes);

module.exports = router;
