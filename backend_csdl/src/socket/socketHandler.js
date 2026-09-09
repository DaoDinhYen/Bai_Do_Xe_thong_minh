const logger = require('../utils/logger');

let ioInstance = null;

function initSocketIO(io) {
  ioInstance = io;

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Client can join rooms (admin, user-specific)
    socket.on('join_room', (room) => {
      socket.join(room);
      logger.debug(`Socket ${socket.id} joined room: ${room}`);
    });

    socket.on('leave_room', (room) => {
      socket.leave(room);
    });

    // Ping-pong for connection health
    socket.on('ping_server', () => {
      socket.emit('pong_server', { timestamp: new Date().toISOString() });
    });

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id} — ${reason}`);
    });

    socket.on('error', (err) => {
      logger.error(`Socket error [${socket.id}]:`, err.message);
    });
  });

  return io;
}

/**
 * Emit an event to all connected clients
 */
function emitToAll(event, data) {
  if (ioInstance) ioInstance.emit(event, data);
}

/**
 * Emit to a specific room (e.g., 'admin' room or 'user-{id}')
 */
function emitToRoom(room, event, data) {
  if (ioInstance) ioInstance.to(room).emit(event, data);
}

/**
 * Emit slot status change
 */
function emitSlotUpdate(slotData) {
  emitToAll('slot_status_changed', slotData);
}

/**
 * Emit notification to specific user
 */
function emitNotification(userId, notification) {
  emitToRoom(`user-${userId}`, 'new_notification', notification);
}

/**
 * Emit admin alert
 */
function emitAdminAlert(alert) {
  emitToRoom('admin', 'admin_alert', alert);
}

function getIO() {
  return ioInstance;
}

module.exports = {
  initSocketIO,
  emitToAll,
  emitToRoom,
  emitSlotUpdate,
  emitNotification,
  emitAdminAlert,
  getIO
};
