#ifndef CONFIG_H
#define CONFIG_H

// ============================================================
// CẤU HÌNH ESP32 #1 — QUẢN LÝ 6 CHỖ ĐỖ XE (A01 - A06)
// Hệ thống: Smart Parking System (Arduino IDE)
// ============================================================

// 1. Cấu hình WiFi
#define WIFI_SSID       "Your_WiFi_SSID"       // Thay bằng tên WiFi của bạn
#define WIFI_PASSWORD   "Your_WiFi_Password"   // Thay bằng mật khẩu WiFi của bạn

// 2. Cấu hình MQTT Broker (Máy tính chạy Node.js / Mosquitto)
#define MQTT_SERVER     "192.168.1.100"        // Địa chỉ IP máy tính chạy MQTT Broker
#define MQTT_PORT       1883                   // Cổng MQTT Broker (mặc định 1883)
#define MQTT_USER       ""                     // Để trống nếu không có user
#define MQTT_PASSWORD   ""                     // Để trống nếu không có password

// 3. Thông tin thiết bị
#define DEVICE_ID           "ESP32_SLOT_01"
#define FIRMWARE_VERSION    "1.0.0"

// 4. MQTT Topics (Khớp hoàn toàn với Backend Node.js)
#define TOPIC_SLOT_PREFIX   "parking/esp32_1/slot/" // Ghép với A01..A06
#define TOPIC_DEVICE_STATUS "parking/device/status"

// 5. Cấu hình Pin Mapping 6 Cảm biến IR (Chân an toàn trên ESP32 DevKit)
#define PIN_IR_A01          13
#define PIN_IR_A02          14
#define PIN_IR_A03          27
#define PIN_IR_A04          26
#define PIN_IR_A05          25
#define PIN_IR_A06          33

#define NUM_SLOTS           6

// Mức logic kích hoạt của cảm biến hồng ngoại IR (FC-51):
// - LOW: Khi có vật cản (xe đỗ) -> Chân OUT cảm biến xuống mức LOW
// - HIGH: Khi không có vật cản (chỗ trống) -> Chân OUT cảm biến ở mức HIGH
#define IR_ACTIVE_LEVEL     LOW

// 6. Cấu hình thời gian (Non-blocking với millis)
#define DEBOUNCE_DELAY_MS   250      // Lọc rung nhiễu cảm biến (250ms ổn định mới ghi nhận)
#define HEARTBEAT_INTERVAL  30000    // Gửi heartbeat mỗi 30 giây
#define RECONNECT_INTERVAL  5000     // Thử kết nối lại sau 5 giây nếu mất mạng

#endif // CONFIG_H
