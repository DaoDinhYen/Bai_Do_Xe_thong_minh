/**
 * ============================================================================
 * ĐỒ ÁN THIẾT KẾ HỆ THỐNG IoT — BÃI ĐỖ XE THÔNG MINH (SMART PARKING SYSTEM)
 * FIRMWARE ESP32 ALL-IN-ONE (PHIÊN BẢN GỘP 1 BO MẠCH DUY NHẤT + OLED SH1106G)
 * ============================================================================
 * Môi trường: Arduino IDE (C/C++), tương thích ESP32 Dev Module
 * 
 * TÍNH NĂNG TÍCH HỢP TOÀN DIỆN:
 * 1. Quản lý 6 vị trí đỗ xe A01 - A06 bằng cảm biến hồng ngoại IR (Lọc nhiễu Debounce).
 * 2. Quản lý Cổng vào/ra: 1 Đầu đọc RFID RC522 (dùng chung), 2 Động cơ Servo Barie.
 * 3. Tự động đóng Barie sau khi xe qua cảm biến cổng (IR34 Vào, IR35 Ra) & Timeout 15s.
 * 4. Điều khiển Relay đèn chiếu sáng bãi xe.
 * 5. Màn hình OLED 128x64 SH1106G hiển thị Dashboard trực quan:
 *    - Trạng thái WiFi / MQTT Broker / IP.
 *    - Ma trận 6 vị trí đỗ xe thời gian thực (Trống / Đã đỗ).
 *    - Trạng thái 2 Barie (Đóng/Mở) và Banner popup khi quẹt thẻ / xe qua.
 * 6. Cơ chế Non-blocking hoàn toàn với millis(), tự phục hồi kết nối WiFi & MQTT.
 * 7. Gửi Heartbeat định kỳ cho cả 2 thiết bị ảo (ESP32_1 & ESP32_2) để Backend
 *    và Web Admin luôn nhận diện hệ thống Online đầy đủ.
 * ============================================================================
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ESP32Servo.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SH110X.h>
#include "config.h"

// ============================================================================
// ĐỊNH NGHĨA TRẠNG THÁI CỔNG BARIE
// ============================================================================
enum GateState {
  GATE_STATE_CLOSED,          // Barie đang đóng (0 độ)
  GATE_STATE_OPEN_WAIT_CAR,   // Barie mở (90 độ), đang chờ xe tiến vào cảm biến cổng
  GATE_STATE_CAR_IN_ZONE,     // Xe đang ở trong vùng cảm biến dưới barie
  GATE_STATE_MANUAL_OPEN      // Mở thủ công bởi Admin (không tự đóng tự động)
};

GateState stateGateIn  = GATE_STATE_CLOSED;
GateState stateGateOut = GATE_STATE_CLOSED;

unsigned long gateInOpenedTime      = 0;
unsigned long gateOutOpenedTime     = 0;
unsigned long gateInClearStartTime  = 0;
unsigned long gateOutClearStartTime = 0;

// ============================================================================
// CẤU TRÚC QUẢN LÝ TỪNG VỊ TRÍ ĐỖ XE (A01 - A06)
// ============================================================================
struct SlotSensor {
  const char* slotCode;
  int pin;
  bool isOccupied;               // Trạng thái đã xác nhận (true = có xe, false = trống)
  bool lastRawState;             // Trạng thái đọc thô gần nhất
  unsigned long lastDebounceTime;// Mốc thời gian bắt đầu đổi trạng thái thô
  bool initialReported;          // Đã gửi dữ liệu ban đầu lên server chưa
};

SlotSensor slots[NUM_PARKING_SLOTS] = {
  {"A01", PIN_IR_A01, false, false, 0, false},
  {"A02", PIN_IR_A02, false, false, 0, false},
  {"A03", PIN_IR_A03, false, false, 0, false},
  {"A04", PIN_IR_A04, false, false, 0, false},
  {"A05", PIN_IR_A05, false, false, 0, false},
  {"A06", PIN_IR_A06, false, false, 0, false}
};

int freeSlotCount = NUM_PARKING_SLOTS;

// ============================================================================
// KHỞI TẠO ĐỐI TƯỢNG PHẦN CỨNG
// ============================================================================
// 1. Màn hình OLED SH1106G (I2C)
Adafruit_SH1106G oled(OLED_SCREEN_WIDTH, OLED_SCREEN_HEIGHT, &Wire, OLED_RESET_PIN);

// 2. Đầu đọc thẻ RFID RC522 (SPI)
MFRC522 rfid(PIN_RFID_SS, PIN_RFID_RST);

// 3. Hai động cơ Servo Barie
Servo servoIn;
Servo servoOut;

// 4. Mạng WiFi và MQTT Client
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// ============================================================================
// BIẾN QUẢN LÝ THỜI GIAN & TRẠNG THÁI HỆ THỐNG
// ============================================================================
unsigned long lastHeartbeatTime       = 0;
unsigned long lastRfidScanTime        = 0;
String lastScannedUid                 = "";
unsigned long lastMqttReconnectAttempt= 0;
unsigned long lastWifiReconnectAttempt= 0;
unsigned long lastOledUpdateTime      = 0;

// Trạng thái Đèn chiếu sáng
bool isLightOn = false;

// Banner thông báo tạm thời trên màn hình OLED
String bannerMessage = "";
unsigned long bannerExpiresAt = 0;

void setOledBanner(const String& msg, unsigned long durationMs = BANNER_DISPLAY_DURATION) {
  bannerMessage = msg;
  bannerExpiresAt = millis() + durationMs;
}

// ============================================================================
// KHỞI TẠO MÀN HÌNH OLED
// ============================================================================
void setupOLED() {
  Wire.begin(OLED_PIN_SDA, OLED_PIN_SCL);

  if (!oled.begin(OLED_I2C_ADDRESS, true)) {
    Serial.println(F("[OLED] Khong tim thay man hinh OLED SH1106!"));
    return;
  }

  oled.clearDisplay();
  oled.setTextColor(SH110X_WHITE);

  // Màn hình khởi động (Splash Screen)
  oled.setTextSize(1);
  oled.setCursor(14, 10);
  oled.println(F("SMART PARKING IOT"));
  oled.drawFastHLine(0, 22, 128, SH110X_WHITE);

  oled.setCursor(10, 30);
  oled.println(F("ESP32 ALL-IN-ONE"));
  oled.setCursor(16, 44);
  oled.println(F("Dang khoi dong..."));

  oled.display();
  delay(1200);
}

// ============================================================================
// VẼ GIAO DIỆN DASHBOARD LÊN OLED (NON-BLOCKING)
// ============================================================================
void updateOLED() {
  unsigned long now = millis();
  if (now - lastOledUpdateTime < OLED_REFRESH_INTERVAL) return;
  lastOledUpdateTime = now;

  oled.clearDisplay();

  // ------------------------------------------------------------
  // PHẦN 1: HEADER (Dòng 0 - 12)
  // Hiển thị trạng thái mạng & số chỗ trống
  // ------------------------------------------------------------
  oled.setTextSize(1);
  oled.setTextColor(SH110X_WHITE);

  // Trạng thái WiFi & MQTT
  oled.setCursor(0, 0);
  if (WiFi.status() == WL_CONNECTED) {
    oled.print(F("W:OK "));
  } else {
    oled.print(F("W:-- "));
  }

  if (mqttClient.connected()) {
    oled.print(F("M:OK"));
  } else {
    oled.print(F("M:--"));
  }

  // Số lượng vị trí còn trống
  oled.setCursor(72, 0);
  oled.print(F("P:"));
  oled.print(freeSlotCount);
  oled.print(F("/"));
  oled.print(NUM_PARKING_SLOTS);

  // Đường kẻ phân cách Header
  oled.drawFastHLine(0, 11, 128, SH110X_WHITE);

  // ------------------------------------------------------------
  // PHẦN 2: MA TRẬN 6 VỊ TRÍ ĐỖ XE A01 - A06 (Dòng 14 - 44)
  // Thiết kế dạng thẻ khối (Box): Đen/Trắng đảo ngược khi có xe
  // ------------------------------------------------------------
  const int boxW = 38;
  const int boxH = 13;
  const int colX[3] = {2, 45, 88};
  const int rowY[2] = {14, 30};

  for (int i = 0; i < NUM_PARKING_SLOTS; i++) {
    int col = i % 3;
    int row = i / 3;
    int x = colX[col];
    int y = rowY[row];

    if (slots[i].isOccupied) {
      // Có xe đỗ: Khối trắng đặc, chữ đen nổi bật
      oled.fillRoundRect(x, y, boxW, boxH, 2, SH110X_WHITE);
      oled.setTextColor(SH110X_BLACK);
      oled.setCursor(x + 3, y + 3);
      oled.print(slots[i].slotCode);
      oled.print(F(":X"));
    } else {
      // Ô trống: Viền trắng mảnh, nền đen, chữ trắng
      oled.drawRoundRect(x, y, boxW, boxH, 2, SH110X_WHITE);
      oled.setTextColor(SH110X_WHITE);
      oled.setCursor(x + 3, y + 3);
      oled.print(slots[i].slotCode);
      oled.print(F(":O"));
    }
  }

  // Đường kẻ phân cách Footer
  oled.drawFastHLine(0, 46, 128, SH110X_WHITE);

  // ------------------------------------------------------------
  // PHẦN 3: FOOTER (Dòng 49 - 63)
  // Ưu tiên hiển thị Banner thông báo sự kiện (Quẹt thẻ / Xe qua cổng)
  // Nếu không có thông báo thì hiển thị trạng thái Barie Vào/Ra
  // ------------------------------------------------------------
  oled.setTextColor(SH110X_WHITE);

  if (now < bannerExpiresAt && bannerMessage.length() > 0) {
    // Hiển thị thông báo sự kiện tạm thời
    oled.setCursor(0, 51);
    oled.print(bannerMessage);
  } else {
    // Hiển thị trạng thái 2 cổng Barie
    oled.setCursor(2, 51);
    oled.print(F("IN:"));
    if (stateGateIn == GATE_STATE_CLOSED) {
      oled.print(F("DONG"));
    } else {
      oled.print(F("MO"));
    }

    oled.setCursor(68, 51);
    oled.print(F("OUT:"));
    if (stateGateOut == GATE_STATE_CLOSED) {
      oled.print(F("DONG"));
    } else {
      oled.print(F("MO"));
    }
  }

  oled.display();
}

// ============================================================================
// KHỞI TẠO WIFI (NON-BLOCKING RETRY)
// ============================================================================
void setupWiFi() {
  Serial.println(F("[BOOT] ESP32 ALL-IN-ONE START"));
  Serial.print(F("[WIFI] Dang ket noi toi SSID: "));
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(400);
    Serial.print(F("."));
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(F("\n[WIFI] Ket noi WiFi thanh cong!"));
    Serial.print(F("[WIFI] IP Address: "));
    Serial.println(WiFi.localIP());
    setOledBanner("WiFi: " + WiFi.localIP().toString(), 3000);
  } else {
    Serial.println(F("\n[WIFI] Chua ket noi duoc. Se tu dong ket noi lai trong nen."));
    setOledBanner(F("WiFi: Mat ket noi!"), 2500);
  }
}

// ============================================================================
// ĐIỀU KHIỂN ĐỘNG CƠ SERVO BARIE CỔNG VÀO (IN)
// ============================================================================
void openGateIn(bool isManual = false, const String& customBanner = "") {
  if (!servoIn.attached()) {
    servoIn.attach(PIN_SERVO_IN, 500, 2400);
  }
  servoIn.write(SERVO_IN_ANGLE_OPEN);
  gateInOpenedTime = millis();
  gateInClearStartTime = 0;
  stateGateIn = isManual ? GATE_STATE_MANUAL_OPEN : GATE_STATE_OPEN_WAIT_CAR;
  Serial.println(F("[BARRIER IN] DA MO (OPEN)"));
  if (customBanner.length() > 0) {
    setOledBanner(customBanner, 4000);
  } else {
    setOledBanner(F("BARIE VAO: MO"), 3000);
  }
}

void closeGateIn() {
  if (!servoIn.attached()) {
    servoIn.attach(PIN_SERVO_IN, 500, 2400);
  }
  servoIn.write(SERVO_IN_ANGLE_CLOSED);
  stateGateIn = GATE_STATE_CLOSED;
  gateInClearStartTime = 0;
  Serial.println(F("[BARRIER IN] DA DONG (CLOSE)"));
  setOledBanner(F("BARIE VAO: DONG"), 2000);
}

// ============================================================================
// ĐIỀU KHIỂN ĐỘNG CƠ SERVO BARIE CỔNG RA (OUT)
// ============================================================================
void openGateOut(bool isManual = false, const String& customBanner = "") {
  if (!servoOut.attached()) {
    servoOut.attach(PIN_SERVO_OUT, 500, 2400);
  }
  servoOut.write(SERVO_OUT_ANGLE_OPEN);
  gateOutOpenedTime = millis();
  gateOutClearStartTime = 0;
  stateGateOut = isManual ? GATE_STATE_MANUAL_OPEN : GATE_STATE_OPEN_WAIT_CAR;
  Serial.println(F("[BARRIER OUT] >>> DA MO BARIE RA (OPEN 90 DEG) <<<"));
  Serial.print(F("[IR OUT] Cam bien ngoai barie hien tai: "));
  Serial.println((digitalRead(PIN_IR_GATE_OUT) == IR_ACTIVE_LEVEL) ? F("CO XE (ACTIVE)") : F("THONG THOANG (CLEAR)"));
  if (customBanner.length() > 0) {
    setOledBanner(customBanner, 4000);
  } else {
    setOledBanner(F("BARIE RA: MO"), 3000);
  }
}

void closeGateOut() {
  if (!servoOut.attached()) {
    servoOut.attach(PIN_SERVO_OUT, 500, 2400);
  }
  servoOut.write(SERVO_OUT_ANGLE_CLOSED);
  stateGateOut = GATE_STATE_CLOSED;
  gateOutClearStartTime = 0;
  Serial.println(F("[BARRIER OUT] >>> DA DONG BARIE RA (CLOSE 0 DEG) <<<"));
  setOledBanner(F("BARIE RA: DONG"), 2000);
}

// ============================================================================
// ĐIỀU KHIỂN RELAY ĐÈN BÃI XE
// ============================================================================
void setLight(bool turnOn) {
  isLightOn = turnOn;
  if (ENABLE_RELAY) {
    digitalWrite(PIN_RELAY_LIGHT, isLightOn ? RELAY_ACTIVE_LEVEL : !RELAY_ACTIVE_LEVEL);
  }
  Serial.print(F("[LIGHT] "));
  Serial.println(isLightOn ? F("BAT (ON)") : F("TAT (OFF)"));

  if (mqttClient.connected()) {
    char payload[64];
    snprintf(payload, sizeof(payload), "{\"status\":\"%s\"}", isLightOn ? "ON" : "OFF");
    mqttClient.publish(TOPIC_LIGHT_STATUS, payload, true);
  }
}

// ============================================================================
// GỬI TRẠNG THÁI Ô ĐỖ XE LÊN MQTT BROKER
// ============================================================================
void publishSlotStatus(const char* slotCode, bool isOccupied) {
  if (!mqttClient.connected()) return;

  char topic[64];
  snprintf(topic, sizeof(topic), "%s%s", TOPIC_SLOT_PREFIX, slotCode);

  const char* typeStr = isOccupied ? "SLOT_OCCUPIED" : "SLOT_FREE";
  
  char payload[160];
  snprintf(payload, sizeof(payload),
    "{\"type\":\"%s\",\"slot_code\":\"%s\",\"device_id\":\"%s\",\"occupied\":%s}",
    typeStr, slotCode, DEVICE_ID_SLOT, isOccupied ? "true" : "false"
  );

  if (mqttClient.publish(topic, payload, true)) {
    Serial.print(F("[IR SLOT] "));
    Serial.print(slotCode);
    Serial.print(F(" -> "));
    Serial.println(isOccupied ? F("OCCUPIED") : F("FREE"));
  } else {
    Serial.print(F("[MQTT] Gui trang thai o do that bai: "));
    Serial.println(slotCode);
  }
}

// ============================================================================
// GỬI HEARTBEAT ĐỊNH KỲ (ĐỒNG BỘ CẢ 2 THIẾT BỊ ẢO TRÊN CSDL VÀ WEB ADMIN)
// ============================================================================
void sendHeartbeat() {
  if (!mqttClient.connected()) return;

  char payload[180];

  // 1. Báo cáo cho ESP32_SLOT_01 (ESP32_1)
  snprintf(payload, sizeof(payload),
    "{\"device_code\":\"%s\",\"status\":\"ONLINE\",\"ip_address\":\"%s\",\"firmware_version\":\"%s\"}",
    DEVICE_ID_SLOT, WiFi.localIP().toString().c_str(), FIRMWARE_VERSION
  );
  mqttClient.publish(TOPIC_DEVICE_STATUS, payload);

  // 2. Báo cáo cho ESP32_GATE_01 (ESP32_2)
  snprintf(payload, sizeof(payload),
    "{\"device_code\":\"%s\",\"status\":\"ONLINE\",\"ip_address\":\"%s\",\"firmware_version\":\"%s\"}",
    DEVICE_ID_GATE, WiFi.localIP().toString().c_str(), FIRMWARE_VERSION
  );
  mqttClient.publish(TOPIC_DEVICE_STATUS, payload);

  Serial.println(F("[HEARTBEAT] Da gui nhip tim cho Slot & Gate"));
}

// ============================================================================
// XỬ LÝ LỆNH NHẬN ĐƯỢC TỪ BACKEND NODE.JS / WEB ADMIN QUA MQTT
// ============================================================================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  char message[256];
  if (length >= sizeof(message)) length = sizeof(message) - 1;
  memcpy(message, payload, length);
  message[length] = '\0';

  String topicStr = String(topic);
  String msgStr   = String(message);

  Serial.print(F("[MQTT IN] Topic: "));
  Serial.print(topicStr);
  Serial.print(F(" | Payload: "));
  Serial.println(msgStr);

  // 1. Lệnh điều khiển Barie Cổng Vào (IN)
  if (topicStr == TOPIC_CMD_GATE_IN) {
    if (msgStr.indexOf("OPEN") >= 0) {
      bool isManual = (msgStr.indexOf("MANUAL") >= 0);
      String banner = "";
      int pIdx = msgStr.indexOf("\"plate\":\"");
      if (pIdx >= 0) {
        int pEnd = msgStr.indexOf("\"", pIdx + 9);
        if (pEnd > pIdx + 9) {
          String pl = msgStr.substring(pIdx + 9, pEnd);
          banner = "VAO: " + pl;
          int sIdx = msgStr.indexOf("\"slot_code\":\"");
          if (sIdx >= 0) {
            int sEnd = msgStr.indexOf("\"", sIdx + 13);
            if (sEnd > sIdx + 13) banner += " -> " + msgStr.substring(sIdx + 13, sEnd);
          }
        }
      }
      openGateIn(isManual, banner);
    } else if (msgStr.indexOf("CLOSE") >= 0) {
      closeGateIn();
    }
  }
  // 2. Lệnh điều khiển Barie Cổng Ra (OUT)
  else if (topicStr == TOPIC_CMD_GATE_OUT) {
    if (msgStr.indexOf("OPEN") >= 0) {
      bool isManual = (msgStr.indexOf("MANUAL") >= 0);
      String banner = "";
      int pIdx = msgStr.indexOf("\"plate\":\"");
      if (pIdx >= 0) {
        int pEnd = msgStr.indexOf("\"", pIdx + 9);
        if (pEnd > pIdx + 9) {
          String pl = msgStr.substring(pIdx + 9, pEnd);
          banner = "RA: " + pl;
          int fIdx = msgStr.indexOf("\"fee\":");
          if (fIdx >= 0) {
            int fEnd = msgStr.indexOf(",", fIdx + 6);
            if (fEnd < 0) fEnd = msgStr.indexOf("}", fIdx + 6);
            if (fEnd > fIdx + 6) {
              String feeVal = msgStr.substring(fIdx + 6, fEnd);
              feeVal.trim();
              if (feeVal != "null") banner += " (" + feeVal + "d)";
            }
          }
        }
      }
      openGateOut(isManual, banner);
    } else if (msgStr.indexOf("CLOSE") >= 0) {
      closeGateOut();
    }
  }
  // 3. Lệnh điều khiển Đèn bãi xe
  else if (topicStr == TOPIC_CMD_LIGHT) {
    if (msgStr.indexOf("LIGHT_ON") >= 0 || msgStr.indexOf("\"ON\"") >= 0) {
      setLight(true);
    } else if (msgStr.indexOf("LIGHT_OFF") >= 0 || msgStr.indexOf("\"OFF\"") >= 0) {
      setLight(false);
    }
  }
  // 4. Lệnh cảnh báo đỗ nhầm chỗ / Báo động từ Server
  else if (topicStr == TOPIC_CMD_ALERT) {
    String alertBanner = F("CANH BAO: DO SAI CHO!");
    int mIdx = msgStr.indexOf("\"message\":\"");
    if (mIdx >= 0) {
      int mEnd = msgStr.indexOf("\"", mIdx + 11);
      if (mEnd > mIdx + 11) alertBanner = msgStr.substring(mIdx + 11, mEnd);
    }
    setOledBanner(alertBanner, 6000);
    Serial.print(F("[ALERT OLED] "));
    Serial.println(alertBanner);
  }
}

// ============================================================================
// KẾT NỐI LẠI MQTT BROKER (NON-BLOCKING)
// ============================================================================
void reconnectMQTT() {
  if (mqttClient.connected()) return;

  unsigned long now = millis();
  if (now - lastMqttReconnectAttempt < RECONNECT_INTERVAL) return;
  lastMqttReconnectAttempt = now;

  Serial.println(F("[MQTT] Dang thu ket noi toi Broker..."));

  bool connected = false;
  if (strlen(MQTT_USER) > 0) {
    connected = mqttClient.connect(DEVICE_ID_MAIN, MQTT_USER, MQTT_PASSWORD);
  } else {
    connected = mqttClient.connect(DEVICE_ID_MAIN);
  }

  if (connected) {
    Serial.println(F("[MQTT] Ket noi Broker thanh cong!"));

    // Đăng ký nhận lệnh từ Backend / Web Admin
    mqttClient.subscribe(TOPIC_CMD_GATE_IN, 1);
    mqttClient.subscribe(TOPIC_CMD_GATE_OUT, 1);
    mqttClient.subscribe(TOPIC_CMD_LIGHT, 1);
    mqttClient.subscribe(TOPIC_CMD_ALERT, 1);

    // Gửi Heartbeat báo danh
    sendHeartbeat();

    // Đồng bộ ngay lập tức trạng thái của cả 6 vị trí đỗ xe
    for (int i = 0; i < NUM_PARKING_SLOTS; i++) {
      publishSlotStatus(slots[i].slotCode, slots[i].isOccupied);
      slots[i].initialReported = true;
    }

    // Đồng bộ trạng thái đèn
    setLight(isLightOn);
  } else {
    Serial.print(F("[MQTT] Ket noi that bai, ma loi rc="));
    Serial.println(mqttClient.state());
  }
}

// ============================================================================
// QUÉT VÀ XỬ LÝ 6 CẢM BIẾN Ô ĐỖ XE (DEBOUNCE LỌC NHIỄU)
// ============================================================================
void readSlotSensors() {
  unsigned long now = millis();
  int currentFree = 0;

  for (int i = 0; i < NUM_PARKING_SLOTS; i++) {
    int pinVal = digitalRead(slots[i].pin);
    bool rawOccupied = (pinVal == IR_ACTIVE_LEVEL);

    // Phát hiện thay đổi trạng thái thô
    if (rawOccupied != slots[i].lastRawState) {
      slots[i].lastDebounceTime = now;
      slots[i].lastRawState = rawOccupied;
    }

    // Tín hiệu đã ổn định vượt quá thời gian Debounce (250ms)
    if ((now - slots[i].lastDebounceTime) > DEBOUNCE_DELAY_MS) {
      if (rawOccupied != slots[i].isOccupied || !slots[i].initialReported) {
        slots[i].isOccupied = rawOccupied;
        slots[i].initialReported = true;
        publishSlotStatus(slots[i].slotCode, slots[i].isOccupied);
      }
    }

    if (!slots[i].isOccupied) {
      currentFree++;
    }
  }

  freeSlotCount = currentFree;
}

// ============================================================================
// ĐỌC VÀ XỬ LÝ ĐẦU ĐỌC THẺ RFID RC522 (DUY NHẤT 1 MODULE DÙNG CHUNG)
// ============================================================================
void handleRfid() {
  // Kiểm tra có thẻ mới áp vào không
  if (!rfid.PICC_IsNewCardPresent()) return;
  if (!rfid.PICC_ReadCardSerial()) return;

  // Định dạng UID chuẩn HEX viết hoa (ví dụ: A1:B2:C3:D4)
  String uidStr = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (i > 0) uidStr += ":";
    if (rfid.uid.uidByte[i] < 0x10) uidStr += "0";
    uidStr += String(rfid.uid.uidByte[i], HEX);
  }
  uidStr.toUpperCase();

  unsigned long now = millis();

  // Cooldown lọc chống đọc thẻ dồn dập
  if (uidStr != lastScannedUid || (now - lastRfidScanTime > RFID_READ_COOLDOWN)) {
    lastScannedUid = uidStr;
    lastRfidScanTime = now;

    Serial.print(F("[RFID] Phat hien the UID = "));
    Serial.println(uidStr);

    // Hiển thị banner pop-up trên màn hình OLED
    setOledBanner("THE: " + uidStr, 3500);

    // Gửi sự kiện quét thẻ lên Backend Node.js
    if (mqttClient.connected()) {
      char payload[160];
      snprintf(payload, sizeof(payload),
        "{\"device_id\":\"%s\",\"rfid_uid\":\"%s\",\"uid\":\"%s\"}",
        DEVICE_ID_GATE, uidStr.c_str(), uidStr.c_str()
      );
      mqttClient.publish(TOPIC_RFID, payload);
    }

    // Nếu cấu hình chế độ STANDALONE DEMO: Tự động mở Barie Vào để test linh kiện
    if (STANDALONE_DEMO_MODE) {
      Serial.println(F("[DEMO] Che do Standalone: Tu dong mo Barie 1!"));
      openGateIn(false);
    }
  }

  // Kết thúc phiên giao tiếp với thẻ hiện tại
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
}

// ============================================================================
// XỬ LÝ LOGIC ĐÓNG/MỞ BARIE TỰ ĐỘNG BẰNG CẢM BIẾN HỒNG NGOẠI CỔNG
// ============================================================================
void handleGateAutomations() {
  unsigned long now = millis();

  // ------------------------------------------------------------
  // 1. TỰ ĐỘNG HÓA CỔNG VÀO (IN GATE AUTOMATION)
  // ------------------------------------------------------------
  bool carInZoneIN = (digitalRead(PIN_IR_GATE_IN) == IR_ACTIVE_LEVEL);

  if (stateGateIn == GATE_STATE_OPEN_WAIT_CAR) {
    if (carInZoneIN) {
      stateGateIn = GATE_STATE_CAR_IN_ZONE;
      gateInClearStartTime = 0;
      setOledBanner(F("XE DANG QUA CONG IN"), 2500);
    } else if (now - gateInOpenedTime > GATE_AUTO_CLOSE_TIMEOUT) {
      // Quá 15 giây không có xe tiến vào -> Tự động đóng an toàn
      Serial.println(F("[BARRIER IN] Het thoi gian cho (Timeout)! Tu dong dong..."));
      closeGateIn();
      if (mqttClient.connected()) {
        mqttClient.publish(TOPIC_GATE_IN_EVENT, "{\"type\":\"GATE_TIMEOUT\"}");
      }
    }
  } else if (stateGateIn == GATE_STATE_CAR_IN_ZONE) {
    // Xe đang trong vùng cảm biến -> Chờ xe đi qua hoàn toàn và ổn định (Debounce 500ms)
    if (carInZoneIN) {
      gateInClearStartTime = 0; // Vẫn còn xe che cảm biến
    } else {
      if (gateInClearStartTime == 0) {
        gateInClearStartTime = now; // Bắt đầu tính thời gian thông thoáng
      } else if (now - gateInClearStartTime >= GATE_CLEAR_CONFIRM_MS) {
        // Đã thông thoáng liên tục >= 500ms -> Xe đã qua hoàn toàn!
        Serial.println(F("[IR IN] XE DA QUA CONG HOAN TOAN"));
        closeGateIn();
        if (mqttClient.connected()) {
          mqttClient.publish(TOPIC_GATE_IN_EVENT, "{\"type\":\"GATE_PASSED\"}");
        }
        setOledBanner(F("XE QUA CONG VAO"), 2500);
        gateInClearStartTime = 0;
      }
    }
  }

  // ------------------------------------------------------------
  // 2. TỰ ĐỘNG HÓA CỔNG RA (OUT GATE AUTOMATION)
  // CẢM BIẾN IR ĐẶT NGOÀI BARIE:
  // - Bước 1: Barie mở -> Xe đỗ trong bãi bắt đầu lăn bánh qua thanh chắn.
  // - Bước 2: Xe tiến tới cảm biến IR ngoài Barie -> IR kích hoạt (carInZoneOUT = true).
  // - Bước 3: Đuôi xe vượt qua hẳn cảm biến IR ngoài Barie -> IR thông thoáng >= 800ms -> ĐÓNG BARIE!
  // ------------------------------------------------------------
  bool carInZoneOUT = (digitalRead(PIN_IR_GATE_OUT) == IR_ACTIVE_LEVEL);

  if (stateGateOut == GATE_STATE_OPEN_WAIT_CAR) {
    // Hoãn an toàn GATE_INITIAL_IGNORE_MS (1.5s) ngay sau khi mở cửa để xe bắt đầu lăn bánh
    // và tránh trường hợp bóng thanh chắn barie lay động làm nhiễu cảm biến
    if ((now - gateOutOpenedTime >= GATE_INITIAL_IGNORE_MS) && carInZoneOUT) {
      stateGateOut = GATE_STATE_CAR_IN_ZONE;
      gateOutClearStartTime = 0;
      Serial.println(F("[IR OUT] Phat hien xe dang di qua cam bien IR ngoai Barie!"));
      setOledBanner(F("XE DANG QUA CONG RA"), 2500);
    } else if (now - gateOutOpenedTime > GATE_AUTO_CLOSE_TIMEOUT) {
      // Quá 15 giây không có xe qua -> Tự động đóng an toàn chống kẹt
      Serial.println(F("[BARRIER OUT] Het thoi gian cho (Timeout 15s)! Tu dong dong..."));
      closeGateOut();
      if (mqttClient.connected()) {
        mqttClient.publish(TOPIC_GATE_OUT_EVENT, "{\"type\":\"GATE_TIMEOUT\"}");
      }
    }
  } else if (stateGateOut == GATE_STATE_CAR_IN_ZONE) {
    // Xe đang ở vùng cảm biến ngoài Barie -> Chờ toàn bộ thân xe đi qua hoàn toàn
    if (carInZoneOUT) {
      gateOutClearStartTime = 0; // Vẫn còn thân xe che cảm biến
    } else {
      if (gateOutClearStartTime == 0) {
        gateOutClearStartTime = now; // Bắt đầu tính thời gian thông thoáng ổn định
      } else if (now - gateOutClearStartTime >= GATE_CLEAR_CONFIRM_MS) {
        // Đã thông thoáng liên tục >= 800ms -> Xe đã ra khỏi bãi hoàn toàn! ĐÓNG CỬA!
        Serial.println(F("[IR OUT] >>> XE DA QUA CAM BIEN NGOAI BARIE HOAN TOAN -> DONG BARIE RA! <<<"));
        closeGateOut();
        if (mqttClient.connected()) {
          mqttClient.publish(TOPIC_GATE_OUT_EVENT, "{\"type\":\"GATE_PASSED\"}");
        }
        setOledBanner(F("XE QUA CONG RA"), 2500);
        gateOutClearStartTime = 0;
      }
    }
  }
}

// ============================================================================
// SETUP
// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(300);

  Serial.println();
  Serial.println(F("=================================================="));
  Serial.println(F("   HE THONG BAI DO XE THONG MINH (ALL-IN-ONE)     "));
  Serial.println(F("=================================================="));

  // 1. Khởi tạo màn hình OLED SH1106G
  setupOLED();

  // 2. Khởi tạo chân cảm biến vị trí đỗ xe (IR A01 - A06)
  for (int i = 0; i < NUM_PARKING_SLOTS; i++) {
    pinMode(slots[i].pin, INPUT_PULLUP);
    int initialVal = digitalRead(slots[i].pin);
    slots[i].isOccupied = (initialVal == IR_ACTIVE_LEVEL);
    slots[i].lastRawState = slots[i].isOccupied;
    slots[i].lastDebounceTime = millis();
    slots[i].initialReported = false;
  }

  // 3. Khởi tạo chân cảm biến IR cổng Vào và Ra (GPIO 34 & 35 là input-only)
  pinMode(PIN_IR_GATE_IN, INPUT);
  pinMode(PIN_IR_GATE_OUT, INPUT);

  // 4. Khởi tạo Relay Đèn chiếu sáng
  if (ENABLE_RELAY) {
    pinMode(PIN_RELAY_LIGHT, OUTPUT);
    digitalWrite(PIN_RELAY_LIGHT, !RELAY_ACTIVE_LEVEL); // Mặc định ban đầu tắt đèn
  }

  // 5. Khởi tạo 2 Động cơ Servo Barie
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);
  servoIn.setPeriodHertz(50);
  servoOut.setPeriodHertz(50);
  servoIn.attach(PIN_SERVO_IN, 500, 2400);
  servoOut.attach(PIN_SERVO_OUT, 500, 2400);

  // Mặc định đóng cả 2 Barie
  servoIn.write(SERVO_IN_ANGLE_CLOSED);
  servoOut.write(SERVO_OUT_ANGLE_CLOSED);

  // 6. Khởi tạo giao tiếp SPI & Đầu đọc thẻ RFID RC522
  SPI.begin(PIN_RFID_SCK, PIN_RFID_MISO, PIN_RFID_MOSI, PIN_RFID_SS);
  rfid.PCD_Init();
  delay(100);
  rfid.PCD_DumpVersionToSerial();

  // 7. Khởi tạo kết nối WiFi
  setupWiFi();

  // 8. Khởi tạo MQTT Client
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setBufferSize(512);

  Serial.println(F(">>> HE THONG DA SAN SANG HOAT DONG! <<<"));
  setOledBanner(F("HE THONG SAN SANG!"), 2000);
}

// ============================================================================
// MAIN LOOP (HOÀN TOÀN NON-BLOCKING VỚI MILLIS)
// ============================================================================
void loop() {
  unsigned long now = millis();

  // 1. Duy trì kết nối WiFi
  if (WiFi.status() != WL_CONNECTED) {
    if (now - lastWifiReconnectAttempt > RECONNECT_INTERVAL) {
      lastWifiReconnectAttempt = now;
      Serial.println(F("[WIFI] Mat mang, dang ket noi lai..."));
      WiFi.reconnect();
    }
  } else {
    // 2. Duy trì kết nối MQTT Broker
    if (!mqttClient.connected()) {
      reconnectMQTT();
    } else {
      mqttClient.loop();
    }
  }

  // 3. Đọc và lọc nhiễu 6 cảm biến vị trí đỗ xe A01 - A06
  readSlotSensors();

  // 4. Quét và xử lý thẻ RFID RC522
  handleRfid();

  // 5. Xử lý tự động đóng Barie bằng cảm biến IR cổng & Timeout
  handleGateAutomations();

  // 6. Cập nhật giao diện màn hình OLED SH1106G
  updateOLED();

  // 7. Gửi nhịp tim Heartbeat định kỳ mỗi 30 giây
  if (now - lastHeartbeatTime >= HEARTBEAT_INTERVAL) {
    lastHeartbeatTime = now;
    sendHeartbeat();
  }
}
