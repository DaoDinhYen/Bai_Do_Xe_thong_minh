const logger = require('../utils/logger');
const { MQTT_TOPICS, MQTT_MESSAGES } = require('../config/mqtt');
const ParkingSlotModel = require('../models/parkingSlotModel');
const DeviceModel = require('../models/deviceModel');
const SystemLogModel = require('../models/systemLogModel');
const NotificationModel = require('../models/notificationModel');
const AccessService = require('../services/accessService');

/**
 * Route incoming MQTT messages to the correct handler
 */
async function handleMqttMessage(topic, message, io) {
  try {
    // Slot sensor: parking/esp32_1/slot/A01
    if (topic.startsWith(MQTT_TOPICS.SLOT_PREFIX)) {
      const slotCode = topic.split('/').pop();
      await handleSlotUpdate(slotCode, message, io);
      return;
    }

    switch (topic) {
      case MQTT_TOPICS.RFID_IN:
        await handleRfidScan(message, 'IN', io);
        break;
      case MQTT_TOPICS.RFID_OUT:
        await handleRfidScan(message, 'OUT', io);
        break;
      case MQTT_TOPICS.GATE_IN:
        await handleGateStatus(message, 'IN', io);
        break;
      case MQTT_TOPICS.GATE_OUT:
        await handleGateStatus(message, 'OUT', io);
        break;
      case MQTT_TOPICS.LIGHT:
        await handleLightStatus(message, io);
        break;
      case MQTT_TOPICS.DEVICE_STATUS:
        await handleDeviceStatus(message, io);
        break;
      default:
        logger.debug(`Unhandled MQTT topic: ${topic}`);
    }
  } catch (err) {
    logger.error(`MQTT handler error [${topic}]:`, err.message);
  }
}

// ========================
//  Slot sensor update
// ========================
async function handleSlotUpdate(slotCode, message, io) {
  let payload;
  try {
    payload = JSON.parse(message);
  } catch {
    payload = { type: message.trim() };
  }

  const isOccupied = payload.type === MQTT_MESSAGES.SLOT_OCCUPIED || message.trim() === MQTT_MESSAGES.SLOT_OCCUPIED;
  const newStatus = isOccupied ? 'OCCUPIED' : 'FREE';

  const slot = await ParkingSlotModel.findByCode(slotCode);
  if (!slot) {
    logger.warn(`MQTT: Unknown slot code: ${slotCode}`);
    return;
  }

  // Only update if status actually changed
  if (slot.status !== newStatus && slot.status !== 'RESERVED' || (slot.status === 'RESERVED' && isOccupied)) {
    const finalStatus = (slot.status === 'RESERVED' && isOccupied) ? 'OCCUPIED' : newStatus;
    await ParkingSlotModel.updateStatusByCode(slotCode, finalStatus);
    logger.info(`Slot ${slotCode}: ${slot.status} → ${finalStatus}`);

    // Emit real-time update
    io.emit('slot_status_changed', {
      slot_code: slotCode,
      slot_id: slot.id,
      old_status: slot.status,
      new_status: finalStatus,
      timestamp: new Date().toISOString()
    });

    // Conflict detection: RESERVED but sensor says FREE when it should be OCCUPIED
    if (slot.status === 'RESERVED' && !isOccupied) {
      logger.warn(`Conflict: Slot ${slotCode} is RESERVED but sensor reports FREE`);
      await NotificationModel.createForAdmins(
        'Xung đột chỗ đỗ xe',
        `Chỗ ${slotCode} đang RESERVED nhưng cảm biến báo TRỐNG. Vui lòng kiểm tra.`,
        'ALERT'
      );
    }
  }
}

// ========================
//  RFID scan at gate
// ========================
async function handleRfidScan(message, direction, io) {
  let payload;
  try {
    payload = JSON.parse(message);
  } catch {
    payload = { uid: message.trim() };
  }

  const rfidUid = payload.uid || payload.rfid_uid;
  if (!rfidUid) return;

  logger.info(`RFID ${direction}: ${rfidUid}`);

  await SystemLogModel.create({
    action: SystemLogModel.ACTIONS.RFID_SCAN,
    description: `RFID scanned at gate ${direction}: ${rfidUid}`
  });

  // Emit to admin dashboard
  io.emit('rfid_event', {
    rfid_uid: rfidUid,
    direction,
    timestamp: new Date().toISOString(),
    status: 'DETECTED'
  });

  // Trigger access check with RFID only (plate will be paired separately)
  await AccessService.handleRfidScan(rfidUid, direction, io);
}

// ========================
//  Gate IR sensor (car passed)
// ========================
async function handleGateStatus(message, direction, io) {
  let payload;
  try { payload = JSON.parse(message); } catch { payload = { type: message.trim() }; }

  logger.info(`Gate ${direction} event: ${JSON.stringify(payload)}`);

  io.emit('barrier_status', {
    direction,
    event: payload.type || message.trim(),
    timestamp: new Date().toISOString()
  });

  // If car passed, trigger gate close command
  if (payload.type === MQTT_MESSAGES.GATE_PASSED) {
    const { publishCloseGate } = require('./mqttPublisher');
    await publishCloseGate(direction);
    logger.info(`Auto-close gate ${direction} after car passed`);
  }
}

// ========================
//  Light relay status
// ========================
async function handleLightStatus(message, io) {
  let payload;
  try { payload = JSON.parse(message); } catch { payload = { status: message.trim() }; }

  logger.info(`Light status: ${payload.status}`);
  io.emit('light_status', { status: payload.status, timestamp: new Date().toISOString() });
}

// ========================
//  Device heartbeat
// ========================
async function handleDeviceStatus(message, io) {
  let payload;
  try { payload = JSON.parse(message); } catch {
    logger.warn('Invalid device status payload:', message);
    return;
  }

  const { device_code, status, ip_address, firmware_version } = payload;
  if (!device_code) return;

  await DeviceModel.updateStatusByCode(device_code, status || 'ONLINE', { ip_address, firmware_version });

  const device = await DeviceModel.findByCode(device_code);

  io.emit('device_status', {
    device_code,
    device_id: device?.id,
    status: status || 'ONLINE',
    timestamp: new Date().toISOString()
  });

  await SystemLogModel.create({
    device_id: device?.id,
    action: status === 'ONLINE' ? SystemLogModel.ACTIONS.DEVICE_ONLINE : SystemLogModel.ACTIONS.DEVICE_OFFLINE,
    description: `Device ${device_code} reported status: ${status}`
  });
}

module.exports = { handleMqttMessage };
