#ifndef CONFIG_H
#define CONFIG_H

// ============================================================
// CẤU HÌNH FIRMWARE ESP32 ALL-IN-ONE (1 BOARD DUY NHẤT)
// Dự án: Hệ Thống Bãi Đỗ Xe Thông Minh (Smart Parking System)
// Tích hợp: 6 IR Chỗ đỗ (A01-A06) + 2 IR Cổng + 2 Servo Barie +
//           1 Đầu đọc RFID RC522 + 1 Màn hình OLED SH1106G + Relay Đèn
// ============================================================

// ------------------------------------------------------------
// 1. CẤU HÌNH MẠNG WIFI
// ------------------------------------------------------------
#define WIFI_SSID           "DYP05"       // Thay bằng tên WiFi của bạn
#define WIFI_PASSWORD       "12344321"   // Thay bằng mật khẩu WiFi của bạn

// ------------------------------------------------------------
// 2. CẤU HÌNH MQTT BROKER (Máy tính chạy Backend Node.js)
// ------------------------------------------------------------
#define MQTT_SERVER         "192.168.1.64"        // Địa chỉ IP của máy chủ MQTT / Backend
#define MQTT_PORT           1883                   // Port MQTT chuẩn (1883)
#define MQTT_USER           ""                     // Để trống nếu không dùng tài khoản
#define MQTT_PASSWORD       ""                     // Để trống nếu không dùng mật khẩu

// ------------------------------------------------------------
// 3. THÔNG TIN THIẾT BỊ
// ------------------------------------------------------------
#define DEVICE_ID_SLOT      "ESP32_SLOT_01"        // Ánh xạ đến ESP32_1 trong CSDL
#define DEVICE_ID_GATE      "ESP32_GATE_01"        // Ánh xạ đến ESP32_2 trong CSDL
#define DEVICE_ID_MAIN      "ESP32_ALL_IN_ONE"     // Định danh client MQTT
#define FIRMWARE_VERSION    "2.0.0"

// ------------------------------------------------------------
// 4. MQTT TOPICS (Khớp 100% với Backend Node.js)
// ------------------------------------------------------------
// Gửi trạng thái 6 vị trí đỗ xe: parking/esp32_1/slot/A01 .. A06
#define TOPIC_SLOT_PREFIX   "parking/esp32_1/slot/"

// Gửi sự kiện quét thẻ RFID (1 đầu đọc dùng chung Vào/Ra)
#define TOPIC_RFID          "parking/esp32_2/rfid"

// Gửi sự kiện xe qua cổng barie
#define TOPIC_GATE_IN_EVENT "parking/esp32_2/gate/in"
#define TOPIC_GATE_OUT_EVENT "parking/esp32_2/gate/out"

// Báo cáo trạng thái đèn
#define TOPIC_LIGHT_STATUS  "parking/esp32_2/light"

// Báo cáo nhịp tim định kỳ (Heartbeat)
#define TOPIC_DEVICE_STATUS "parking/device/status"

// Các topic nhận lệnh điều khiển từ Backend / Web Admin
#define TOPIC_CMD_GATE_IN   "parking/cmd/gate_in"   // Mở / Đóng Barie Vào
#define TOPIC_CMD_GATE_OUT  "parking/cmd/gate_out"  // Mở / Đóng Barie Ra
#define TOPIC_CMD_LIGHT     "parking/cmd/light"     // Bật / Tắt Đèn
#define TOPIC_CMD_ALERT     "parking/cmd/alert"     // Báo động đỗ xe sai vị trí / Cảnh báo

// ------------------------------------------------------------
// 5. CẤU HÌNH SƠ ĐỒ CHÂN PHẦN CỨNG (PIN MAPPING)
// ------------------------------------------------------------

// A. Màn hình OLED SH1106G (I2C)
#define OLED_I2C_ADDRESS    0x3C
#define OLED_SCREEN_WIDTH   128
#define OLED_SCREEN_HEIGHT  64
#define OLED_PIN_SDA        21
#define OLED_PIN_SCL        22
#define OLED_RESET_PIN      -1   // Không dùng chân Reset phần cứng

// B. 6 Cảm biến hồng ngoại IR quản lý vị trí đỗ xe (A01 - A06)
#define PIN_IR_A01          13
#define PIN_IR_A02          14
#define PIN_IR_A03          27
#define PIN_IR_A04          26
#define PIN_IR_A05          25
#define PIN_IR_A06          33
#define NUM_PARKING_SLOTS   6

// C. 2 Cảm biến hồng ngoại IR cổng (sau Barie phát hiện xe đã qua cổng)
// Chú ý: GPIO 34 và GPIO 35 là chân Input-only, không có pullup nội
#define PIN_IR_GATE_IN      34   // Cảm biến sau barie Vào
#define PIN_IR_GATE_OUT     35   // Cảm biến sau barie Ra

// D. 2 Động cơ Servo điều khiển Barie
#define PIN_SERVO_IN        32   // Servo Barie Cổng Vào
#define PIN_SERVO_OUT       16   // Servo Barie Cổng Ra

// E. Đầu đọc thẻ RFID RC522 (Giao tiếp SPI)
// Chú ý: Cấp nguồn 3.3V cho RC522 (Cấp 5V sẽ làm hỏng module)
#define PIN_RFID_SS         5    // SDA / SS
#define PIN_RFID_RST        17   // Reset (GPIO 17)
#define PIN_RFID_SCK        18   // SCK
#define PIN_RFID_MISO       19   // MISO
#define PIN_RFID_MOSI       23   // MOSI

// F. Relay điều khiển đèn bãi xe (Tùy chọn)
#define PIN_RELAY_LIGHT     4    // Chân điều khiển Relay (GPIO 4)
#define ENABLE_RELAY        true // Đặt false nếu không lắp relay

// ------------------------------------------------------------
// 6. CẤU HÌNH THÔNG SỐ HOẠT ĐỘNG
// ------------------------------------------------------------
// Mức logic kích hoạt cảm biến hồng ngoại IR (FC-51):
// LOW khi có vật cản (xe đỗ / xe qua), HIGH khi thông thoáng
#define IR_ACTIVE_LEVEL         LOW

// Mức kích hoạt Relay: Thường là Active LOW với module relay 5V
#define RELAY_ACTIVE_LEVEL      LOW

// Góc quay độc lập của 2 Động cơ Servo Barie (Dễ dàng đảo góc nếu 2 servo lắp đối xứng ngược chiều)
#define SERVO_IN_ANGLE_CLOSED   0    // Barie Vào: 0 độ (Đóng nằm ngang)
#define SERVO_IN_ANGLE_OPEN     90   // Barie Vào: 90 độ (Mở dựng đứng)

#define SERVO_OUT_ANGLE_CLOSED  180    // Barie Ra: 0 độ (Đóng nằm ngang)
#define SERVO_OUT_ANGLE_OPEN    90   // Barie Ra: 90 độ (Mở dựng đứng - Sửa thành 0 hoặc 180 nếu thanh gạt lắp ngược)

// Macro tương thích ngược
#define SERVO_ANGLE_CLOSED      SERVO_IN_ANGLE_CLOSED
#define SERVO_ANGLE_OPEN        SERVO_IN_ANGLE_OPEN

// ------------------------------------------------------------
// 7. CẤU HÌNH THỜI GIAN ĐIỀU KHIỂN (Non-blocking với millis)
// ------------------------------------------------------------
#define DEBOUNCE_DELAY_MS       250   // Lọc rung nhiễu cảm biến ô đỗ (250ms ổn định)
#define GATE_CLEAR_CONFIRM_MS   800   // Xe phải đi qua cảm biến IR cổng và thông thoáng ổn định >= 800ms mới đóng barie
#define GATE_INITIAL_IGNORE_MS  1500  // Hoãn 1.5s sau khi mở để xe bắt đầu lăn bánh, tránh bóng thanh chắn gây đóng nhầm
#define GATE_AUTO_CLOSE_TIMEOUT 15000 // Tự động đóng barie sau 15s nếu xe không đi qua (bảo vệ chống kẹt)
#define RFID_READ_COOLDOWN      2000  // Khoảng cách tối thiểu giữa 2 lần quét cùng 1 thẻ (2s)
#define HEARTBEAT_INTERVAL      30000 // Gửi heartbeat định kỳ mỗi 30 giây
#define RECONNECT_INTERVAL      5000  // Khoảng thời gian thử kết nối lại WiFi/MQTT (5s)
#define OLED_REFRESH_INTERVAL   200   // Tần số cập nhật màn hình OLED (200ms)
#define BANNER_DISPLAY_DURATION 3000  // Thời gian hiển thị thông báo popup trên OLED (3s)

// ------------------------------------------------------------
// 8. CHẾ ĐỘ THỬ NGHIỆM ĐỘC LẬP (STANDALONE DEMO FALLBACK)
// ------------------------------------------------------------
// Nếu đặt true: Quét thẻ RFID sẽ tự động mở Servo Vào ngay lập tức
// (thuận tiện cho việc test phần cứng khi chưa bật Backend Server).
// Nếu đặt false: Chỉ mở Barie khi Backend xác thực và gửi lệnh MQTT OPEN.
#define STANDALONE_DEMO_MODE    false 

#endif // CONFIG_H
