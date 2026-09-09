const { getMqttClient } = require('./mqttClient');
const { MQTT_TOPICS, MQTT_COMMANDS } = require('../config/mqtt');
const logger = require('../utils/logger');

/**
 * Publish a command to MQTT topic
 */
function publish(topic, payload, qos = 1) {
  const client = getMqttClient();
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
//  Gate commands
// ========================
function publishOpenGate(direction) {
  const topic = direction === 'IN' ? MQTT_TOPICS.CMD_GATE_IN : MQTT_TOPICS.CMD_GATE_OUT;
  const cmd   = direction === 'IN' ? MQTT_COMMANDS.OPEN_GATE_IN : MQTT_COMMANDS.OPEN_GATE_OUT;
  return publish(topic, { command: cmd, timestamp: new Date().toISOString() });
}

function publishCloseGate(direction) {
  const topic = direction === 'IN' ? MQTT_TOPICS.CMD_GATE_IN : MQTT_TOPICS.CMD_GATE_OUT;
  const cmd   = direction === 'IN' ? MQTT_COMMANDS.CLOSE_GATE_IN : MQTT_COMMANDS.CLOSE_GATE_OUT;
  return publish(topic, { command: cmd, timestamp: new Date().toISOString() });
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

module.exports = {
  publish,
  publishOpenGate,
  publishCloseGate,
  publishLightOn,
  publishLightOff,
  publishCommand
};
