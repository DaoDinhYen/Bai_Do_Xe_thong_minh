const mqtt = require('mqtt');
const logger = require('../utils/logger');
const { MQTT_TOPICS } = require('../config/mqtt');
const { handleMqttMessage } = require('./mqttHandler');

let client = null;

function initMQTT(io) {
  const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';

  const options = {
    clientId: process.env.MQTT_CLIENT_ID || `smart_parking_${Date.now()}`,
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 10000
  };

  if (process.env.MQTT_USERNAME) {
    options.username = process.env.MQTT_USERNAME;
    options.password = process.env.MQTT_PASSWORD;
  }

  client = mqtt.connect(brokerUrl, options);

  client.on('connect', () => {
    logger.info(`✅ MQTT connected to ${brokerUrl}`);

    // Subscribe to all ESP32 topics
    const topics = [
      `${MQTT_TOPICS.SLOT_PREFIX}/+`,         // parking/esp32_1/slot/+
      MQTT_TOPICS.RFID_IN,
      MQTT_TOPICS.RFID_OUT,
      MQTT_TOPICS.GATE_IN,
      MQTT_TOPICS.GATE_OUT,
      MQTT_TOPICS.LIGHT,
      MQTT_TOPICS.DEVICE_STATUS
    ];

    client.subscribe(topics, { qos: 1 }, (err) => {
      if (err) {
        logger.error('MQTT subscribe error:', err);
      } else {
        logger.info('MQTT subscribed to topics:', topics);
      }
    });
  });

  client.on('message', (topic, payload) => {
    try {
      const message = payload.toString();
      logger.debug(`MQTT IN [${topic}]: ${message}`);
      handleMqttMessage(topic, message, io);
    } catch (err) {
      logger.error('MQTT message parse error:', err);
    }
  });

  client.on('error', (err) => {
    logger.error('MQTT error:', err.message);
  });

  client.on('reconnect', () => {
    logger.warn('MQTT reconnecting...');
  });

  client.on('offline', () => {
    logger.warn('MQTT client offline');
  });

  client.on('disconnect', () => {
    logger.warn('MQTT disconnected');
  });

  return client;
}

function getMqttClient() {
  return client;
}

module.exports = { initMQTT, getMqttClient };
