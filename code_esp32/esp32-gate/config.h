#ifndef CONFIG_H
#define CONFIG_H

// ============================================================
// CẤU HÌNH ESP32 #2 — QUẢN LÝ CỔNG VÀO/RA & ĐÈN BÃI XE
// Hệ thống: Smart Parking System (Arduino IDE)
// Quản lý: 1 RFID RC522 DUY NHẤT, 2 Servo, 2 Gate IR, 1 Relay
// ============================================================

// 1. Cấu hình WiFi
#define WIFI_SSID       "Your_WiFi_SSID"       // Thay bằng tên WiFi của bạn
#define WIFI_PASSWORD   "Your_WiFi_Password"   // Thay bằng mật khẩu WiFi của bạn

// 2. Cấu hình MQTT Broker
#define MQTT_SERVER     "192.168.1.100"        // Địa chỉ IP máy tính chạy Backend / MQTT
#define MQTT_PORT       1883
#define MQTT_USER       ""
#define MQTT_PASSWORD   ""

// 3. Thông tin thiết bị
#define DEVICE_ID           "ESP32_GATE_01"
#define FIRMWARE_VERSION    "1.0.0"

// 4. MQTT Topics kết nối với Backend Node.js
#define TOPIC_RFID              "parking/esp32_2/rfid"       // RFID scan gửi lên server
#define TOPIC_GATE_IN_EVENT     "parking/esp32_2/gate/in"     // Trạng thái xe qua cổng vào
#define TOPIC_GATE_OUT_EVENT    "parking/esp32_2/gate/out"    // Trạng thái xe qua cổng ra
#define TOPIC_LIGHT_STATUS      "parking/esp32_2/light"       // Báo cáo trạng thái đèn
#define TOPIC_DEVICE_STATUS     "parking/device/status"      // Heartbeat

// Các topic nhận lệnh điều khiển từ Backend / Admin Web
#define TOPIC_CMD_GATE_IN       "parking/cmd/gate_in"        // Lệnh mở/đóng barie vào
#define TOPIC_CMD_GATE_OUT      "parking/cmd/gate_out"       // Lệnh mở/đóng barie ra
#define TOPIC_CMD_LIGHT         "parking/cmd/light"          // Lệnh bật/tắt đèn

// 5. Cấu hình Pin Mapping
// A. Giao tiếp SPI cho 1 đầu đọc RFID RC522 DUY NHẤT
#define PIN_RFID_SS             5    // SDA / SS
#define PIN_RFID_RST            22   // RST
#define PIN_RFID_SCK            18   // SCK
#define PIN_RFID_MISO           19   // MISO
#define PIN_RFID_MOSI           23   // MOSI

// B. Điều khiển Servo Barie (ESP32PWM / ESP32Servo)
#define PIN_SERVO_IN            2    // Servo barie vào
#define PIN_SERVO_OUT           4    // Servo barie ra

// C. Cảm biến IR sau Barie phát hiện xe qua cổng
#define PIN_IR_GATE_IN          16   // Cảm biến sau barie vào
#define PIN_IR_GATE_OUT         17   // Cảm biến sau barie ra

// D. Relay điều khiển đèn mô hình
#define PIN_RELAY_LIGHT         32   // Relay điều khiển đèn bãi xe

// 6. Cấu hình thông số điều khiển
#define SERVO_ANGLE_CLOSED      0    // Góc barie nằm ngang (đóng)
#define SERVO_ANGLE_OPEN        90   // Góc barie dựng đứng (mở)

#define IR_ACTIVE_LEVEL         LOW  // Mức kích hoạt khi có xe (LOW đối với cảm biến FC-51)
#define RELAY_ACTIVE_LEVEL      LOW  // Mức kích hoạt relay (thường là Active LOW cho module 5V)

// 7. Cấu hình thời gian an toàn (Non-blocking)
#define GATE_AUTO_CLOSE_TIMEOUT 15000 // Tự động đóng sau 15 giây nếu xe không qua (chống kẹt)
#define RFID_READ_COOLDOWN      2000  // Khoảng cách tối thiểu giữa 2 lần quét thẻ (2 giây)
#define HEARTBEAT_INTERVAL      30000 // Gửi heartbeat mỗi 30 giây
#define RECONNECT_INTERVAL      5000  // Thử kết nối lại sau 5 giây

#endif // CONFIG_H
