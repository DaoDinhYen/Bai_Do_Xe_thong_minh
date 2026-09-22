/**
 * ============================================================
 * ĐỒ ÁN THIẾT KẾ HỆ THỐNG IoT — BÃI ĐỖ XE THÔNG MINH
 * FIRMWARE ESP32 #1: QUẢN LÝ 6 VỊ TRÍ ĐỖ XE (A01 - A06)
 * ============================================================
 * Sử dụng Arduino IDE (C/C++), WiFi.h, PubSubClient.h
 * Cơ chế: Non-blocking millis(), Debounce chống nhiễu cảm biến,
 * chỉ gửi MQTT khi có sự thay đổi trạng thái và gửi Heartbeat định kỳ.
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include "config.h"

// Cấu trúc quản lý từng chỗ đỗ xe
struct SlotSensor {
  const char* slotCode;
  int pin;
  bool isOccupied;           // Trạng thái đã xác nhận (true = có xe, false = trống)
  bool lastRawState;         // Trạng thái đọc thô gần nhất
  unsigned long lastDebounceTime; // Thời điểm bắt đầu đổi trạng thái thô
  bool initialReported;      // Đã báo cáo trạng thái khởi động chưa
};

// Khởi tạo danh sách 6 vị trí đỗ xe
SlotSensor slots[NUM_SLOTS] = {
  {"A01", PIN_IR_A01, false, false, 0, false},
  {"A02", PIN_IR_A02, false, false, 0, false},
  {"A03", PIN_IR_A03, false, false, 0, false},
  {"A04", PIN_IR_A04, false, false, 0, false},
  {"A05", PIN_IR_A05, false, false, 0, false},
  {"A06", PIN_IR_A06, false, false, 0, false}
};

WiFiClient espClient;
PubSubClient mqttClient(espClient);

unsigned long lastHeartbeatTime = 0;
unsigned long lastMqttReconnectAttempt = 0;
unsigned long lastWifiReconnectAttempt = 0;

// ============================================================
// KHỞI TẠO KẾT NỐI WIFI (Non-blocking)
// ============================================================
void setupWiFi() {
  Serial.println("[BOOT] ESP32 SLOT START");
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
// GỬI HEARTBEAT ĐỊNH KỲ LÊN SERVER
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
  } else {
    Serial.println("[HEARTBEAT] Send failed");
  }
}

// ============================================================
// GỬI TRẠNG THÁI Ô ĐỖ XE LÊN MQTT
// ============================================================
void publishSlotStatus(const char* slotCode, bool isOccupied) {
  if (!mqttClient.connected()) return;

  char topic[64];
  snprintf(topic, sizeof(topic), "%s%s", TOPIC_SLOT_PREFIX, slotCode);

  const char* typeStr = isOccupied ? "SLOT_OCCUPIED" : "SLOT_FREE";
  
  char payload[160];
  snprintf(payload, sizeof(payload),
    "{\"type\":\"%s\",\"slot_code\":\"%s\",\"device_id\":\"%s\",\"occupied\":%s}",
    typeStr, slotCode, DEVICE_ID, isOccupied ? "true" : "false"
  );

  if (mqttClient.publish(topic, payload, true)) { // Retain = true để server/app luôn thấy state mới nhất
    Serial.print("[IR] ");
    Serial.print(slotCode);
    Serial.print(" = ");
    Serial.println(isOccupied ? "OCCUPIED" : "FREE");
  } else {
    Serial.print("[MQTT] Publish failed for slot ");
    Serial.println(slotCode);
  }
}

// ============================================================
// KẾT NỐI LẠI MQTT (Non-blocking)
// ============================================================
void reconnectMQTT() {
  if (mqttClient.connected()) return;

  unsigned long now = millis();
  if (now - lastMqttReconnectAttempt < RECONNECT_INTERVAL) return;
  lastMqttReconnectAttempt = now;

  Serial.println("[MQTT] Attempting connection...");
  
  bool connected = false;
  if (strlen(MQTT_USER) > 0) {
    connected = mqttClient.connect(DEVICE_ID, MQTT_USER, MQTT_PASSWORD);
  } else {
    connected = mqttClient.connect(DEVICE_ID);
  }

  if (connected) {
    Serial.println("[MQTT] Connected");
    sendHeartbeat();

    // Đồng bộ lại trạng thái của cả 6 ô đỗ lên server ngay sau khi kết nối
    for (int i = 0; i < NUM_SLOTS; i++) {
      publishSlotStatus(slots[i].slotCode, slots[i].isOccupied);
      slots[i].initialReported = true;
    }
  } else {
    Serial.print("[MQTT] Connect failed, rc=");
    Serial.println(mqttClient.state());
  }
}

// ============================================================
// QUÉT VÀ XỬ LÝ 6 CẢM BIẾN IR (DEBOUNCE LỌC NHIỄU)
// ============================================================
void readSlotSensors() {
  unsigned long now = millis();

  for (int i = 0; i < NUM_SLOTS; i++) {
    int pinVal = digitalRead(slots[i].pin);
    bool rawOccupied = (pinVal == IR_ACTIVE_LEVEL);

    // Kiểm tra nếu giá trị thô có sự thay đổi
    if (rawOccupied != slots[i].lastRawState) {
      slots[i].lastDebounceTime = now;
      slots[i].lastRawState = rawOccupied;
    }

    // Nếu tín hiệu ổn định vượt quá thời gian debounce
    if ((now - slots[i].lastDebounceTime) > DEBOUNCE_DELAY_MS) {
      if (rawOccupied != slots[i].isOccupied || !slots[i].initialReported) {
        slots[i].isOccupied = rawOccupied;
        slots[i].initialReported = true;
        publishSlotStatus(slots[i].slotCode, slots[i].isOccupied);
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

  // Khởi tạo các chân GPIO cảm biến hồng ngoại
  for (int i = 0; i < NUM_SLOTS; i++) {
    pinMode(slots[i].pin, INPUT_PULLUP);
    
    // Đọc trạng thái ban đầu
    int initialVal = digitalRead(slots[i].pin);
    slots[i].isOccupied = (initialVal == IR_ACTIVE_LEVEL);
    slots[i].lastRawState = slots[i].isOccupied;
    slots[i].lastDebounceTime = millis();
    slots[i].initialReported = false;
  }

  // Khởi tạo WiFi
  setupWiFi();

  // Khởi tạo MQTT
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setBufferSize(512);
}

// ============================================================
// MAIN LOOP (Hoàn toàn Non-blocking)
// ============================================================
void loop() {
  unsigned long now = millis();

  // 1. Kiểm tra và duy trì kết nối WiFi
  if (WiFi.status() != WL_CONNECTED) {
    if (now - lastWifiReconnectAttempt > RECONNECT_INTERVAL) {
      lastWifiReconnectAttempt = now;
      Serial.println("[WIFI] Reconnecting...");
      WiFi.reconnect();
    }
  } else {
    // 2. Kiểm tra và duy trì kết nối MQTT
    if (!mqttClient.connected()) {
      reconnectMQTT();
    } else {
      mqttClient.loop();
    }
  }

  // 3. Quét cảm biến chỗ đỗ xe
  readSlotSensors();

  // 4. Gửi Heartbeat định kỳ
  if (now - lastHeartbeatTime >= HEARTBEAT_INTERVAL) {
    lastHeartbeatTime = now;
    sendHeartbeat();
  }
}
