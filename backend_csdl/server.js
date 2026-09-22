require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { connectDB } = require('./src/config/db');
const { initMQTT } = require('./src/mqtt/mqttClient');
const { initSocketIO } = require('./src/socket/socketHandler');
const routes = require('./src/routes/index');
const errorHandler = require('./src/middleware/errorHandler');
const logger = require('./src/utils/logger');

const app = express();
const httpServer = http.createServer(app);

// =====================
//  Socket.IO Setup
// =====================
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Make io accessible in routes/controllers
app.set('io', io);

// =====================
//  Security Middleware
// =====================
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// =====================
//  Body Parsers
// =====================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =====================
//  Static Files
// =====================
const path = require('path');
const fs = require('fs');

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve ANPR captures
const captureDir = path.join(__dirname, '..', 'anpr-service', 'captures');
if (!fs.existsSync(captureDir)) {
  try { fs.mkdirSync(captureDir, { recursive: true }); } catch {}
}
app.use('/captures', express.static(captureDir));

// =====================
//  Serve Admin Web Frontend
// =====================
// Thư mục web nằm ở ../web tương đối so với backend_csdl/
const webDir = path.join(__dirname, '..', 'web');
app.use(express.static(webDir));
logger.info(`📁 Serving static web from: ${webDir}`);

// =====================
//  Request Logger
// =====================
app.use((req, res, next) => {
  if (req.url.startsWith('/api')) {
    logger.info(`[${req.method}] ${req.url} - ${req.ip}`);
  }
  next();
});

// =====================
//  Health Check
// =====================
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Smart Parking Backend is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// =====================
//  API Routes
// =====================
app.use('/api', routes);

// =====================
//  Fallback: serve index.html cho tất cả route không phải /api
// =====================
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      message: `API route ${req.originalUrl} not found`
    });
  }
  // Trả về index.html để client-side routing hoạt động
  res.sendFile(path.join(webDir, 'index.html'));
});

// =====================
//  Global Error Handler
// =====================
app.use(errorHandler);

// =====================
//  Start Server
// =====================
const PORT = process.env.PORT || 3000;

async function ensureAdminAccount() {
  try {
    const UserModel = require('./src/models/userModel');
    const bcrypt = require('bcryptjs');
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@smartparking.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
    const admin = await UserModel.findByEmail(adminEmail);
    if (admin) {
      const match = await bcrypt.compare(adminPassword, admin.password).catch(() => false);
      if (!match) {
        const newHash = await bcrypt.hash(adminPassword, 10);
        await UserModel.updatePassword(admin.id, newHash);
        logger.info(`🔒 Admin password synchronized with configuration (.env)`);
      }
    }
  } catch (err) {
    logger.warn(`Could not auto-sync admin account: ${err.message}`);
  }
}

async function ensureDatabaseColumns() {
  try {
    const { query } = require('./src/config/db');
    const cols = await query('SHOW COLUMNS FROM parking_history');
    const names = cols.map(c => c.Field);
    if (!names.includes('entry_image')) {
      await query('ALTER TABLE parking_history ADD COLUMN entry_image VARCHAR(500) NULL');
      logger.info('Added entry_image column to parking_history');
    }
    if (!names.includes('exit_image')) {
      await query('ALTER TABLE parking_history ADD COLUMN exit_image VARCHAR(500) NULL');
      logger.info('Added exit_image column to parking_history');
    }
  } catch (err) {
    logger.warn(`Could not ensure database columns: ${err.message}`);
  }
}

async function startServer() {
  try {
    // 1. Connect to MySQL
    await connectDB();
    logger.info('✅ MySQL Database connected');

    // Tự động kiểm tra & đồng bộ CSDL và tài khoản admin từ code
    await ensureAdminAccount();
    await ensureDatabaseColumns();

    // 2. Initialize Socket.IO
    initSocketIO(io);
    logger.info('✅ Socket.IO initialized');

    // 3. Connect MQTT
    initMQTT(io);
    logger.info('✅ MQTT client connecting...');

    // 4. Start HTTP server
    httpServer.listen(PORT, () => {
      logger.info(`✅ Smart Parking Backend running on port ${PORT}`);
      logger.info(`   Environment: ${process.env.NODE_ENV}`);
      logger.info(`   API Base URL: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});

startServer();
