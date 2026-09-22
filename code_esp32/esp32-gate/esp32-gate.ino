/**
 * ============================================================
 * ĐỒ ÁN THIẾT KẾ HỆ THỐNG IoT — BÃI ĐỖ XE THÔNG MINH
 * FIRMWARE ESP32 #2: QUẢN LÝ CỔNG VÀO/RA, 1 RC522, 2 SERVO, 2 IR, RELAY
 * ============================================================
 * Sử dụng Arduino IDE (C/C++), WiFi.h, PubSubClient.h, SPI.h, MFRC522.h, ESP32Servo.h
 * 
 * ĐẶC BIỆT:
 * - Sử dụng DUY NHẤT 1 ĐẦU ĐỌC THẺ RFID RC522 (dùng chung cho cả vào và ra)
 * - Tự động đóng barie sau khi xe đi qua hoàn toàn (cảm biến IR sau barie)
 * - Timeout an toàn (15s) tự đóng barie nếu xe không qua
 * - Hoàn toàn Non-blocking millis()
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ESP32Servo.h>
#include "config.h"

// Trạng thái của từng cổng barie
enum GateState {
  GATE_STATE_CLOSED,
  GATE_STATE_OPEN_WAIT_CAR,   // Barie mở, đang đợi xe tiến vào cảm biến
  GATE_STATE_CAR_IN_ZONE,     // Xe đang ở trong vùng cảm biến dưới barie
  GATE_STATE_MANUAL_OPEN      // Mở thủ công bởi Admin (không tự đóng)
};

GateState stateGateIn  = GATE_STATE_CLOSED;
GateState stateGateOut = GATE_STATE_CLOSED;

unsigned long gateInOpenedTime  = 0;
unsigned long gateOutOpenedTime = 0;

// Đối tượng phần cứng
MFRC522 rfid(PIN_RFID_SS, PIN_RFID_RST);
Servo servoIn;
Servo servoOut;
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// Quản lý thời gian
unsigned long lastHeartbeatTime = 0;
unsigned long lastRfidScanTime  = 0;
String lastScannedUid           = "";
unsigned long lastMqttReconnect = 0;
unsigned long lastWifiReconnect = 0;

// Trạng thái đèn hiện tại
bool isLightOn = false;

// ============================================================
// KHỞI TẠO WIFI (Non-blocking)
// ============================================================
void setupWiFi() {
  Serial.println("[BOOT] ESP32 GATE START");
  Serial.print("[WIFI] Connecting to ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WIFI] Connected");
    Serial.print("[WIFI] IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[WIFI] Connection failed. Will retry in background.");
  }
}

// ============================================================
// ĐIỀU KHIỂN SERVO CỔNG VÀO (IN)
// ============================================================
void openGateIn(bool isManual = false) {
  servoIn.write(SERVO_ANGLE_OPEN);
  gateInOpenedTime = millis();
  stateGateIn = isManual ? GATE_STATE_MANUAL_OPEN : GATE_STATE_OPEN_WAIT_CAR;
  Serial.println("[BARRIER IN] OPEN");
}

void closeGateIn() {
  servoIn.write(SERVO_ANGLE_CLOSED);
  stateGateIn = GATE_STATE_CLOSED;
  Serial.println("[BARRIER IN] CLOSE");
}

// ============================================================
// ĐIỀU KHIỂN SERVO CỔNG RA (OUT)
// ============================================================
void openGateOut(bool isManual = false) {
  servoOut.write(SERVO_ANGLE_OPEN);
  gateOutOpenedTime = millis();
  stateGateOut = isManual ? GATE_STATE_MANUAL_OPEN : GATE_STATE_OPEN_WAIT_CAR;
  Serial.println("[BARRIER OUT] OPEN");
}

void closeGateOut() {
  servoOut.write(SERVO_ANGLE_CLOSED);
  stateGateOut = GATE_STATE_CLOSED;
  Serial.println("[BARRIER OUT] CLOSE");
}

// ============================================================
// ĐIỀU KHIỂN RELAY ĐÈN
// ============================================================
void setLight(bool turnOn) {
  isLightOn = turnOn;
  digitalWrite(PIN_RELAY_LIGHT, isLightOn ? RELAY_ACTIVE_LEVEL : !RELAY_ACTIVE_LEVEL);
  Serial.print("[LIGHT] ");
  Serial.println(isLightOn ? "ON" : "OFF");

  if (mqttClient.connected()) {
    char payload[64];
    snprintf(payload, sizeof(payload), "{\"status\":\"%s\"}", isLightOn ? "ON" : "OFF");
    mqttClient.publish(TOPIC_LIGHT_STATUS, payload, true);
  }
}

// ============================================================
// GỬI HEARTBEAT
// ============================================================
void sendHeartbeat() {
  if (!mqttClient.connected()) return;

  char payload[180];
  snprintf(payload, sizeof(payload),
    "{\"device_code\":\"%s\",\"status\":\"ONLINE\",\"ip_address\":\"%s\",\"firmware_version\":\"%s\"}",
    DEVICE_ID, WiFi.localIP().toString().c_str(), FIRMWARE_VERSION
  );

  if (mqttClient.publish(TOPIC_DEVICE_STATUS, payload)) {
    Serial.println("[HEARTBEAT] Sent");
  }
}

// ============================================================
// XỬ LÝ LỆNH TỪ BACKEND / WEB ADMIN QUA MQTT
// ============================================================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  char message[256];
  if (length >= sizeof(message)) length = sizeof(message) - 1;
  memcpy(message, payload, length);
  message[length] = '\0';

  String topicStr = String(topic);
  String msgStr   = String(message);

  Serial.print("[MQTT IN] Topic: ");
  Serial.print(topicStr);
  Serial.print(" | Payload: ");
  Serial.println(msgStr);

  // 1. Lệnh điều khiển Barie Cổng Vào (IN)
  if (topicStr == TOPIC_CMD_GATE_IN) {
    if (msgStr.indexOf("OPEN") >= 0) {
      bool isManual = (msgStr.indexOf("MANUAL") >= 0);
      openGateIn(isManual);
    } else if (msgStr.indexOf("CLOSE") >= 0) {
      closeGateIn();
    }
  }
  // 2. Lệnh điều khiển Barie Cổng Ra (OUT)
  else if (topicStr == TOPIC_CMD_GATE_OUT) {
    if (msgStr.indexOf("OPEN") >= 0) {
      bool isManual = (msgStr.indexOf("MANUAL") >= 0);
      openGateOut(isManual);
    } else if (msgStr.indexOf("CLOSE") >= 0) {
      closeGateOut();
    }
  }
  // 3. Lệnh điều khiển Đèn
  else if (topicStr == TOPIC_CMD_LIGHT) {
    if (msgStr.indexOf("LIGHT_ON") >= 0 || msgStr.indexOf("\"ON\"") >= 0) {
      setLight(true);
    } else if (msgStr.indexOf("LIGHT_OFF") >= 0 || msgStr.indexOf("\"OFF\"") >= 0) {
      setLight(false);
    }
  }
}

// ============================================================
// KẾT NỐI LẠI MQTT VÀ ĐĂNG KÝ CÁC TOPIC NHẬN LỆNH
// ============================================================
void reconnectMQTT() {
  if (mqttClient.connected()) return;

  unsigned long now = millis();
  if (now - lastMqttReconnect < RECONNECT_INTERVAL) return;
  lastMqttReconnect = now;

  Serial.println("[MQTT] Attempting connection...");

  bool connected = false;
  if (strlen(MQTT_USER) > 0) {
    connected = mqttClient.connect(DEVICE_ID, MQTT_USER, MQTT_PASSWORD);
  } else {
    connected = mqttClient.connect(DEVICE_ID);
  }

  if (connected) {
    Serial.println("[MQTT] Connected");

    // Đăng ký nhận các lệnh điều khiển từ Node.js Server
    mqttClient.subscribe(TOPIC_CMD_GATE_IN, 1);
    mqttClient.subscribe(TOPIC_CMD_GATE_OUT, 1);
    mqttClient.subscribe(TOPIC_CMD_LIGHT, 1);

    sendHeartbeat();
    setLight(isLightOn); // Đồng bộ trạng thái đèn
  } else {
    Serial.print("[MQTT] Connect failed, rc=");
    Serial.println(mqttClient.state());
  }
}

// ============================================================
// ĐỌC VÀ XỬ LÝ ĐẦU ĐỌC RFID RC522 DUY NHẤT
// ============================================================
void handleRfid() {
  // Kiểm tra có thẻ mới áp vào không
  if (!rfid.PICC_IsNewCardPresent()) return;
  if (!rfid.PICC_ReadCardSerial()) return;

  // Đọc UID thẻ định dạng chuẩn HEX viết hoa (A1:B2:C3:D4)
  String uidStr = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (i > 0) uidStr += ":";
    if (rfid.uid.uidByte[i] < 0x10) uidStr += "0";
    uidStr += String(rfid.uid.uidByte[i], HEX);
  }
  uidStr.toUpperCase();

  unsigned long now = millis();

  // Cooldown lọc quét liên tục cùng 1 thẻ
  if (uidStr != lastScannedUid || (now - lastRfidScanTime > RFID_READ_COOLDOWN)) {
    lastScannedUid = uidStr;
    lastRfidScanTime = now;

    Serial.print("[RFID] UID = ");
    Serial.println(uidStr);

    if (mqttClient.connected()) {
      char payload[160];
      snprintf(payload, sizeof(payload),
        "{\"device_id\":\"%s\",\"rfid_uid\":\"%s\",\"uid\":\"%s\"}",
        DEVICE_ID, uidStr.c_str(), uidStr.c_str()
      );

      mqttClient.publish(TOPIC_RFID, payload);
    }
  }

  // Kết thúc phiên đọc thẻ
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
}

// ============================================================
// XỬ LÝ LOGIC ĐÓNG/MỞ BARIE TỰ ĐỘNG BẰNG CẢM BIẾN IR
// ============================================================
void handleGateAutomations() {
  unsigned long now = millis();

  // ----------------------------------------------------
  // 1. CỔNG VÀO (IN GATE AUTOMATION)
  // ----------------------------------------------------
  bool carInZoneIN = (digitalRead(PIN_IR_GATE_IN) == IR_ACTIVE_LEVEL);

  if (stateGateIn == GATE_STATE_OPEN_WAIT_CAR) {
    if (carInZoneIN) {
      stateGateIn = GATE_STATE_CAR_IN_ZONE;
    } else if (now - gateInOpenedTime > GATE_AUTO_CLOSE_TIMEOUT) {
      // Quá 15 giây xe không tiến vào -> tự đóng an toàn
      Serial.println("[BARRIER IN] Timeout! Auto closing...");
      closeGateIn();
      if (mqttClient.connected()) {
        mqttClient.publish(TOPIC_GATE_IN_EVENT, "{\"type\":\"GATE_TIMEOUT\"}");
      }
    }
  } else if (stateGateIn == GATE_STATE_CAR_IN_ZONE) {
    // Khi xe đã qua khỏi vùng cảm biến hồng ngoại
    if (!carInZoneIN) {
      Serial.println("[IR IN] VEHICLE PASSED");
      closeGateIn();
      if (mqttClient.connected()) {
        mqttClient.publish(TOPIC_GATE_IN_EVENT, "{\"type\":\"GATE_PASSED\"}");
      }
    }
  }

  // ----------------------------------------------------
  // 2. CỔNG RA (OUT GATE AUTOMATION)
  // ----------------------------------------------------
  bool carInZoneOUT = (digitalRead(PIN_IR_GATE_OUT) == IR_ACTIVE_LEVEL);

  if (stateGateOut == GATE_STATE_OPEN_WAIT_CAR) {
    if (carInZoneOUT) {
      stateGateOut = GATE_STATE_CAR_IN_ZONE;
    } else if (now - gateOutOpenedTime > GATE_AUTO_CLOSE_TIMEOUT) {
      Serial.println("[BARRIER OUT] Timeout! Auto closing...");
      closeGateOut();
      if (mqttClient.connected()) {
        mqttClient.publish(TOPIC_GATE_OUT_EVENT, "{\"type\":\"GATE_TIMEOUT\"}");
      }
    }
  } else if (stateGateOut == GATE_STATE_CAR_IN_ZONE) {
    if (!carInZoneOUT) {
      Serial.println("[IR OUT] VEHICLE PASSED");
      closeGateOut();
      if (mqttClient.connected()) {
        mqttClient.publish(TOPIC_GATE_OUT_EVENT, "{\"type\":\"GATE_PASSED\"}");
      }
    }
  }
}

// ============================================================
// SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  delay(500);

  // 1. Cấu hình chân Relay Đèn
  pinMode(PIN_RELAY_LIGHT, OUTPUT);
  digitalWrite(PIN_RELAY_LIGHT, !RELAY_ACTIVE_LEVEL); // Ban đầu tắt đèn

  // 2. Cấu hình chân cảm biến IR sau barie
  pinMode(PIN_IR_GATE_IN, INPUT_PULLUP);
  pinMode(PIN_IR_GATE_OUT, INPUT_PULLUP);

  // 3. Khởi tạo 2 Servo Barie
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  servoIn.setPeriodHertz(50);
  servoOut.setPeriodHertz(50);
  servoIn.attach(PIN_SERVO_IN, 500, 2400);
  servoOut.attach(PIN_SERVO_OUT, 500, 2400);

  // Ban đầu đóng cả 2 barie
  servoIn.write(SERVO_ANGLE_CLOSED);
  servoOut.write(SERVO_ANGLE_CLOSED);

  // 4. Khởi tạo giao tiếp SPI & Đầu đọc thẻ RFID RC522 duy nhất
  SPI.begin(PIN_RFID_SCK, PIN_RFID_MISO, PIN_RFID_MOSI, PIN_RFID_SS);
  rfid.PCD_Init();
  delay(100);
  rfid.PCD_DumpVersionToSerial(); // In thông tin phiên bản RC522 lên Serial kiểm tra

  // 5. Khởi tạo WiFi
  setupWiFi();

  // 6. Khởi tạo MQTT Client
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setBufferSize(512);
}

// ============================================================
// MAIN LOOP (Hoàn toàn Non-blocking)
// ============================================================
void loop() {
  unsigned long now = millis();

  // Duy trì WiFi
  if (WiFi.status() != WL_CONNECTED) {
    if (now - lastWifiReconnect > RECONNECT_INTERVAL) {
      lastWifiReconnect = now;
      Serial.println("[WIFI] Reconnecting...");
      WiFi.reconnect();
    }
  } else {
    // Duy trì MQTT
    if (!mqttClient.connected()) {
      reconnectMQTT();
    } else {
      mqttClient.loop();
    }
  }

  // Quét thẻ RFID
  handleRfid();

  // Xử lý tự động đóng barie
  handleGateAutomations();

  // Gửi Heartbeat định kỳ
  if (now - lastHeartbeatTime >= HEARTBEAT_INTERVAL) {
    lastHeartbeatTime = now;
    sendHeartbeat();
  }
}
