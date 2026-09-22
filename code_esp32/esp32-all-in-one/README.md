# HƯỚNG DẪN FIRMWARE ESP32 ALL-IN-ONE (1 BOARD DUY NHẤT + OLED SH1106G)
> Dự án: **Hệ thống Bãi Đỗ Xe Thông Minh (Smart Parking System)**  
> Môi trường phát triển: **Arduino IDE** (C/C++ cho ESP32)  
> Bo mạch: **ESP32 Dev Module (30-pin hoặc 38-pin)**

---

## 📌 1. Giới thiệu phiên bản All-In-One
Phiên bản này gom toàn bộ linh kiện của cả 2 ESP32 trước đây (`esp32-gate` và `esp32-slot`) vào chạy trên **1 con ESP32 duy nhất**:
- **6 Cảm biến hồng ngoại IR** quản lý vị trí đỗ xe A01 – A06.
- **2 Cảm biến hồng ngoại IR** phát hiện xe qua cổng (sau Barie Vào và Barie Ra).
- **2 Động cơ Servo** điều khiển 2 Barie (Vào và Ra).
- **1 Đầu đọc thẻ RFID RC522** dùng chung cho kiểm soát vào/ra.
- **1 Màn hình OLED 128x64 SH1106G (I2C)** hiển thị Dashboard trực quan: trạng thái kết nối mạng, số chỗ trống, ma trận 6 ô đỗ, trạng thái Barie và thẻ quét.
- **1 Relay** điều khiển đèn chiếu sáng bãi xe.

---

## 🔌 2. Bảng sơ đồ nối dây phần cứng (Pinout Mapping)

| STT | Thiết bị | Chân thiết bị | Chân ESP32 | Ghi chú kỹ thuật |
|:---:|---|:---:|:---:|---|
| **1** | **Màn hình OLED SH1106G** | **SDA** | **GPIO 21** | I2C Data |
| | | **SCL** | **GPIO 22** | I2C Clock |
| | | **VCC / GND** | **3V3 / GND** | Nguồn 3.3V hoặc 5V tùy loại module OLED |
| **2** | **Cảm biến IR Chỗ đỗ A01** | OUT | **GPIO 13** | Cảm biến hồng ngoại FC-51 (có kéo trở nội) |
| **3** | **Cảm biến IR Chỗ đỗ A02** | OUT | **GPIO 14** | Cảm biến hồng ngoại FC-51 |
| **4** | **Cảm biến IR Chỗ đỗ A03** | OUT | **GPIO 27** | Cảm biến hồng ngoại FC-51 |
| **5** | **Cảm biến IR Chỗ đỗ A04** | OUT | **GPIO 26** | Cảm biến hồng ngoại FC-51 |
| **6** | **Cảm biến IR Chỗ đỗ A05** | OUT | **GPIO 25** | Cảm biến hồng ngoại FC-51 |
| **7** | **Cảm biến IR Chỗ đỗ A06** | OUT | **GPIO 33** | Cảm biến hồng ngoại FC-51 |
| **8** | **Cảm biến IR Cổng Vào** | OUT | **GPIO 34** | Phát hiện xe qua Barie Vào (*GPIO 34 Input-only*) |
| **9** | **Cảm biến IR Cổng Ra** | OUT | **GPIO 35** | Phát hiện xe qua Barie Ra (*GPIO 35 Input-only*) |
| **10**| **Servo Barie Vào** | Tín hiệu (Cam/Vàng) | **GPIO 32** | Điều khiển Barie Vào (0° đóng, 90° mở) |
| **11**| **Servo Barie Ra** | Tín hiệu (Cam/Vàng) | **GPIO 16** | Điều khiển Barie Ra (0° đóng, 90° mở) |
| **12**| **Đầu đọc thẻ RFID RC522** | **SDA / SS** | **GPIO 5** | SPI Chip Select |
| | | **RST** | **GPIO 17** | Chân Reset |
| | | **SCK** | **GPIO 18** | SPI Clock |
| | | **MISO** | **GPIO 19** | SPI Master In Slave Out |
| | | **MOSI** | **GPIO 23** | SPI Master Out Slave In |
| | | **3.3V / GND** | **3V3 / GND** | ⚠️ **BẮT BUỘC NGUỒN 3.3V** (Không cấp 5V) |
| **13**| **Module Relay Đèn** | IN | **GPIO 4** | Điều khiển đèn chiếu sáng (Active LOW) |

> ⚠️ **Lưu ý nguồn cấp**:
> - Khi cắm cùng lúc 2 động cơ Servo và 8 cảm biến IR, dòng tiêu thụ có thể đạt 1A - 1.5A khi Servo quay. Nên cấp nguồn ngoài 5V/2A cho chân VCC của Servo và cảm biến (nối chung Mass GND với ESP32) để tránh ESP32 bị sụt áp khởi động lại.

---

## 💻 3. Cài đặt thư viện trên Arduino IDE

Mở Arduino IDE ➔ **Sketch ➔ Include Library ➔ Manage Libraries...** và cài đặt các thư viện sau:
1. **PubSubClient** (bởi *Nick O'Leary*) — Giao tiếp MQTT.
2. **MFRC522** (bởi *GithubCommunity*) — Đọc thẻ RFID RC522.
3. **ESP32Servo** (bởi *Kevin Harrington*) — Điều khiển Servo xung PWM trên ESP32.
4. **Adafruit GFX Library** (bởi *Adafruit*) — Thư viện đồ họa cốt lõi.
5. **Adafruit SH110X** (bởi *Adafruit*) — Điều khiển màn hình OLED SH1106 / SH1107.

---

## ⚙️ 4. Hướng dẫn cấu hình và nạp Code

1. Mở file `code_esp32/esp32-all-in-one/esp32-all-in-one.ino` bằng Arduino IDE.
2. Mở tab `config.h` bên cạnh và tùy chỉnh các thông số:
   ```cpp
   #define WIFI_SSID       "Tên_WiFi_Của_Bạn"
   #define WIFI_PASSWORD   "Mật_Khẩu_WiFi"
   #define MQTT_SERVER     "192.168.1.xxx"   // Địa chỉ IP của máy chạy Backend Node.js
   ```
3. Nếu muốn kiểm tra linh kiện nhanh độc lập không cần bật máy chủ:
   - Đổi dòng `#define STANDALONE_DEMO_MODE false` thành `true`.
   - Khi đó, mỗi lần quẹt thẻ RFID thì Servo 1 (Barie Vào) sẽ tự động mở ngay lập tức!
4. Cắm cáp kết nối ESP32 với máy tính.
5. Tại menu **Tools**:
   - **Board**: Chọn `ESP32 Dev Module`.
   - **Port**: Chọn đúng cổng COM của ESP32.
   - **Upload Speed**: `921600` (hoặc `115200`).
6. Nhấn nút **Upload (Mũi tên sang phải)** để nạp code.

---

## 📺 5. Giao diện Màn hình OLED SH1106G

Màn hình hiển thị bố cục 3 phần trực quan:
```text
+--------------------------------+
| W:OK M:OK              P: 4/6  |  <- Header: WiFi, MQTT, Số chỗ trống
+--------------------------------+
| [A01:X]   [A02:O]   [A03:O]    |  <- Ma trận 6 vị trí đỗ xe
| [A04:O]   [A05:X]   [A06:O]    |     (X: Có xe - khối trắng đặc; O: Trống)
+--------------------------------+
| IN: DONG          OUT: DONG    |  <- Footer: Trạng thái Barie Vào / Ra
+--------------------------------+
```
- Khi quẹt thẻ RFID: Dòng Footer sẽ hiển thị Banner: `THE: A1:B2:C3:D4` trong 3.5 giây.
- Khi xe đi qua cảm biến cổng: Dòng Footer hiển thị `XE DANG QUA CONG IN` / `XE QUA CONG VAO`.

---

## 🔄 6. Cơ chế Tự động đóng Barie & An toàn
1. Khi nhận lệnh mở Barie từ Backend / Web Admin (hoặc quẹt thẻ hợp lệ):
   - Barie quay góc 90° (dựng đứng).
   - ESP32 chuyển sang trạng thái chờ xe tiến vào cảm biến hồng ngoại cổng.
2. Khi xe tiến vào che cảm biến cổng (IR 34 cho cổng vào, IR 35 cho cổng ra):
   - ESP32 ghi nhận xe đang trong khu vực barie.
3. Khi đuôi xe đi qua khỏi cảm biến cổng:
   - Barie tự động hạ xuống góc 0° (đóng).
   - Gửi bản tin MQTT `GATE_PASSED` lên máy chủ.
4. **Timeout an toàn (15 giây)**:
   - Nếu barie đã mở mà không có xe đi qua sau 15 giây, barie tự động hạ xuống để tránh rủi ro an toàn và gửi bản tin `GATE_TIMEOUT`.
