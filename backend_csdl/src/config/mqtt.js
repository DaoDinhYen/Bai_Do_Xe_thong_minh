/**
 * MQTT Configuration
 * Centralizes all MQTT topic names
 */
const MQTT_TOPICS = {
  // ESP32 #1 — Slot sensors
  SLOT_PREFIX: process.env.MQTT_TOPIC_SLOT_PREFIX || 'parking/esp32_1/slot',

  // ESP32 #2 — RFID
  RFID_IN:  process.env.MQTT_TOPIC_RFID_IN  || 'parking/esp32_2/rfid/in',
  RFID_OUT: process.env.MQTT_TOPIC_RFID_OUT || 'parking/esp32_2/rfid/out',

  // ESP32 #2 — Gate sensors
  GATE_IN:  process.env.MQTT_TOPIC_GATE_IN  || 'parking/esp32_2/gate/in',
  GATE_OUT: process.env.MQTT_TOPIC_GATE_OUT || 'parking/esp32_2/gate/out',

  // ESP32 #2 — Light relay
  LIGHT: process.env.MQTT_TOPIC_LIGHT || 'parking/esp32_2/light',

  // Device heartbeat
  DEVICE_STATUS: process.env.MQTT_TOPIC_DEVICE_STATUS || 'parking/device/status',

  // Commands to ESP32
  CMD_GATE_IN:  process.env.MQTT_TOPIC_CMD_GATE_IN  || 'parking/cmd/gate_in',
  CMD_GATE_OUT: process.env.MQTT_TOPIC_CMD_GATE_OUT || 'parking/cmd/gate_out',
  CMD_LIGHT:    process.env.MQTT_TOPIC_CMD_LIGHT    || 'parking/cmd/light'
};

// Commands server can send
const MQTT_COMMANDS = {
  OPEN_GATE_IN:   'OPEN_GATE_IN',
  CLOSE_GATE_IN:  'CLOSE_GATE_IN',
  OPEN_GATE_OUT:  'OPEN_GATE_OUT',
  CLOSE_GATE_OUT: 'CLOSE_GATE_OUT',
  LIGHT_ON:       'LIGHT_ON',
  LIGHT_OFF:      'LIGHT_OFF'
};

// Messages from ESP32
const MQTT_MESSAGES = {
  SLOT_FREE:     'SLOT_FREE',
  SLOT_OCCUPIED: 'SLOT_OCCUPIED',
  RFID_DETECTED: 'RFID_DETECTED',
  GATE_PASSED:   'GATE_PASSED',
  GATE_STATUS:   'GATE_STATUS',
  DEVICE_STATUS: 'DEVICE_STATUS',
  HEARTBEAT:     'HEARTBEAT'
};

module.exports = { MQTT_TOPICS, MQTT_COMMANDS, MQTT_MESSAGES };
