const mqttClient = require('./mqttClient');
const { MQTT_TOPICS, MQTT_COMMANDS } = require('../config/mqtt');
const logger = require('../utils/logger');

/**
 * Publish a command to MQTT topic
 */
function publish(topic, payload, qos = 1) {
  const client = typeof mqttClient.getMqttClient === 'function' ? mqttClient.getMqttClient() : null;
  if (!client || !client.connected) {
    logger.warn(`MQTT not connected — cannot publish to ${topic}`);
    return false;
  }
  const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
  client.publish(topic, message, { qos }, (err) => {
    if (err) logger.error(`MQTT publish error [${topic}]:`, err.message);
    else logger.debug(`MQTT OUT [${topic}]: ${message}`);
  });
  return true;
}

// ========================
//  Gate commands & Control
// ========================
const barrierTimers = { IN: null, OUT: null };

function publishOpenGate(direction, details = {}) {
  const topic = direction === 'IN' ? MQTT_TOPICS.CMD_GATE_IN : MQTT_TOPICS.CMD_GATE_OUT;
  const cmd   = direction === 'IN' ? MQTT_COMMANDS.OPEN_GATE_IN : MQTT_COMMANDS.OPEN_GATE_OUT;

  const payload = {
    command: cmd,
    direction,
    plate: details.plate || details.plate_number || '',
    user: details.user || details.owner_name || '',
    slot_code: details.slot_code || '',
    fee: details.fee !== undefined ? details.fee : null,
    timestamp: new Date().toISOString()
  };

  const sent = publish(topic, payload);
  logger.info(`🚪 Lệnh mở Barrier ${direction} đã gửi tới MQTT: ${JSON.stringify(payload)}`);

  // Xóa timer cũ nếu có
  if (barrierTimers[direction]) {
    clearTimeout(barrierTimers[direction]);
    barrierTimers[direction] = null;
  }

  // Timeout an toàn cấp máy chủ (chỉ đóng sau 25s nếu ESP32 hoàn toàn không gửi GATE_PASSED)
  barrierTimers[direction] = setTimeout(() => {
    logger.warn(`⚠️ Timeout an toàn 25s tại máy chủ — Gửi lệnh ĐÓNG Barrier ${direction} dự phòng`);
    publishCloseGate(direction);
    barrierTimers[direction] = null;
  }, 25000);

  return sent;
}

function publishCloseGate(direction) {
  if (barrierTimers[direction]) {
    clearTimeout(barrierTimers[direction]);
    barrierTimers[direction] = null;
  }
  const topic = direction === 'IN' ? MQTT_TOPICS.CMD_GATE_IN : MQTT_TOPICS.CMD_GATE_OUT;
  const cmd   = direction === 'IN' ? MQTT_COMMANDS.CLOSE_GATE_IN : MQTT_COMMANDS.CLOSE_GATE_OUT;
  return publish(topic, { command: cmd, direction, timestamp: new Date().toISOString() });
}

// ========================
//  Light commands
// ========================
function publishLightOn() {
  return publish(MQTT_TOPICS.CMD_LIGHT, { command: MQTT_COMMANDS.LIGHT_ON, timestamp: new Date().toISOString() });
}

function publishLightOff() {
  return publish(MQTT_TOPICS.CMD_LIGHT, { command: MQTT_COMMANDS.LIGHT_OFF, timestamp: new Date().toISOString() });
}

// ========================
//  Generic command publisher
// ========================
function publishCommand(topic, command, extra = {}) {
  return publish(topic, { command, ...extra, timestamp: new Date().toISOString() });
}

// ========================
//  Alert commands (OLED & Buzzer warning)
// ========================
function publishAlert(extra = {}) {
  return publish(MQTT_TOPICS.CMD_ALERT, { command: 'ALERT', ...extra, timestamp: new Date().toISOString() });
}

module.exports = {
  publish,
  publishOpenGate,
  publishCloseGate,
  publishLightOn,
  publishLightOff,
  publishCommand,
  publishAlert
};
