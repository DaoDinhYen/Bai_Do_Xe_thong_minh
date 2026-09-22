# HƯỚNG DẪN LẬP TRÌNH & NẠP CODE ESP32 (ARDUINO IDE)
> Dự án: **Hệ thống Bãi Đỗ Xe Thông Minh (Smart Parking System)**  
> Môi trường phát triển: **Arduino IDE** (Không sử dụng PlatformIO).

---

## 📌 1. Cấu trúc thư mục phần cứng

```text
code_esp32/
├── esp32-all-in-one/         # Firmware ESP32 All-In-One: Gom toàn bộ vào 1 board + OLED SH1106G
│   ├── config.h             # Cấu hình WiFi, MQTT, Pinout 8 IR, 2 Servo, 1 RFID, 1 OLED, Relay
│   ├── esp32-all-in-one.ino # Mã nguồn Arduino C++ All-In-One
│   └── README.md            # Tài liệu hướng dẫn nối dây & nạp code All-In-One
├── esp32-slot/               # Firmware ESP32 #1 (Tách riêng): Quản lý 6 chỗ đỗ xe A01–A06
│   ├── config.h             # Cấu hình WiFi, MQTT, Pinout 6 cảm biến IR
│   └── esp32-slot.ino       # Mã nguồn Arduino C++
├── esp32-gate/               # Firmware ESP32 #2 (Tách riêng): Quản lý Cổng vào/ra & Đèn
│   ├── config.h             # Cấu hình WiFi, MQTT, 1 RFID RC522, 2 Servo, 2 IR, Relay
│   └── esp32-gate.ino       # Mã nguồn Arduino C++
└── README.md                # Tài liệu hướng dẫn chung
```


---

## 🔌 2. Bảng sơ đồ nối dây (Pin Mapping)

### 🔹 ESP32 #1 — Quản lý 6 Chỗ Đỗ Xe (IR A01 – A06)

| Thiết bị | Chân thiết bị | Chân ESP32 #1 | Ghi chú |
|---|:---:|:---:|---|
| **Cảm biến IR A01** | OUT | **GPIO 13** | Cảm biến hồng ngoại FC-51 chỗ A01 |
| **Cảm biến IR A02** | OUT | **GPIO 14** | Cảm biến hồng ngoại FC-51 chỗ A02 |
| **Cảm biến IR A03** | OUT | **GPIO 27** | Cảm biến hồng ngoại FC-51 chỗ A03 |
| **Cảm biến IR A04** | OUT | **GPIO 26** | Cảm biến hồng ngoại FC-51 chỗ A04 |
| **Cảm biến IR A05** | OUT | **GPIO 25** | Cảm biến hồng ngoại FC-51 chỗ A05 |
| **Cảm biến IR A06** | OUT | **GPIO 33** | Cảm biến hồng ngoại FC-51 chỗ A06 |
| **Nguồn chung 6 IR**| VCC / GND | **VIN (5V) / GND** | Nối chung nguồn 5V và GND với ESP32 |

> *Nguyên lý hoạt động*: Khi có xe đỗ vào ô, vật cản làm chân OUT cảm biến xuống mức **LOW** (`SLOT_OCCUPIED`). Khi ô trống, chân OUT ở mức **HIGH** (`SLOT_FREE`).

---

### 🔹 ESP32 #2 — Quản lý Cổng Vào/Ra, 1 RFID, 2 Servo, 2 Gate IR, 1 Relay

#### A. Đầu đọc RFID RC522 (1 Reader duy nhất dùng chung Vào/Ra)
> ⚠️ **Cực kỳ quan trọng**: Module RC522 hoạt động ở điện áp **3.3V**. Cấp 5V sẽ làm cháy module!

| Chân RC522 | Chân ESP32 #2 | Chức năng SPI |
|---|:---:|---|
| **VCC** | **3V3** | Nguồn 3.3V |
| **RST** | **GPIO 22** | Chân Reset |
| **GND** | **GND** | Mass chung |
| **MISO** | **GPIO 19** | SPI Master In Slave Out |
| **MOSI** | **GPIO 23** | SPI Master Out Slave In |
| **SCK** | **GPIO 18** | SPI Clock |
| **SDA / SS**| **GPIO 5** | SPI Chip Select |

#### B. 2 Động cơ Servo Barie (SG90 / MG90S)
| Servo | Chân tín hiệu (Dây Cam/Vàng) | Nguồn (Dây Đỏ) | Mass (Dây Nâu/Đen) |
|---|:---:|:---:|:---:|
| **Servo Barie IN** | **GPIO 2** | Nguồn 5V ngoài hoặc VIN | GND chung |
| **Servo Barie OUT**| **GPIO 4** | Nguồn 5V ngoài hoặc VIN | GND chung |

#### C. 2 Cảm biến IR sau Barie (Phát hiện xe đã qua cổng)
| Cảm biến | Chân OUT | Nguồn VCC | Mass GND |
|---|:---:|:---:|:---:|
| **IR Barie IN** | **GPIO 16** | 5V / 3.3V | GND |
| **IR Barie OUT**| **GPIO 17** | 5V / 3.3V | GND |

#### D. Relay điều khiển Đèn bãi xe
| Chân Relay | Chân ESP32 #2 | Ghi chú |
|---|:---:|---|
| **IN** | **GPIO 32** | Tín hiệu điều khiển kích đóng ngắt Relay |
| **VCC / GND** | **5V / GND** | Nguồn cấp cho cuộn hút module Relay |

---

## 💻 3. Hướng dẫn cài đặt & Nạp code bằng Arduino IDE

### Bước 1: Tải và cài đặt Arduino IDE
- Tải phiên bản mới nhất (Arduino IDE 2.x hoặc 1.8.x) tại: [https://www.arduino.cc/en/software](https://www.arduino.cc/en/software)

### Bước 2: Cài đặt gói ESP32 Board Package
1. Mở Arduino IDE, vào **File -> Preferences**.
2. Tại ô **Additional boards manager URLs**, dán đường link:
   ```text
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Vào **Tools -> Board -> Boards Manager...**, tìm kiếm `esp32` và bấm **Install** (chọn phiên bản mới nhất của *Espressif Systems*).

### Bước 3: Cài đặt các thư viện cần thiết
Vào menu **Sketch -> Include Library -> Manage Libraries...**, tìm và cài đặt 3 thư viện sau:
1. **PubSubClient** (bởi *Nick O'Leary*) — Thư viện MQTT Client.
2. **MFRC522** (bởi *GithubCommunity*) — Thư viện đọc thẻ RFID RC522.
3. **ESP32Servo** (bởi *Kevin Harrington*) — Thư viện điều khiển Servo trên ESP32.

### Bước 4: Cấu hình nạp code
1. Cắm cáp Micro-USB/Type-C nối ESP32 với máy tính.
2. Mở Arduino IDE:
   - Để nạp **ESP32 #1**: Mở file `code_esp32/esp32-slot/esp32-slot.ino`.
   - Để nạp **ESP32 #2**: Mở file `code_esp32/esp32-gate/esp32-gate.ino`.
3. Mở tab `config.h` bên cạnh và điều chỉnh:
   - `WIFI_SSID`: Tên WiFi nhà bạn.
   - `WIFI_PASSWORD`: Mật khẩu WiFi.
   - `MQTT_SERVER`: Địa chỉ IP máy tính chạy Backend Node.js (xem bằng lệnh `ipconfig` trên Windows, ví dụ `192.168.1.15`).
4. Tại menu **Tools**:
   - **Board**: Chọn `ESP32 Dev Module`.
   - **Upload Speed**: `921600` (hoặc `115200`).
   - **Port**: Chọn đúng cổng COM của board ESP32 vừa cắm (ví dụ `COM3`, `COM4`...).
5. Bấm nút **Upload (mũi tên sang phải)** để biên dịch và nạp code.  
   *(Nếu màn hình hiển thị `Connecting......`, hãy nhấn giữ nút **BOOT** trên board ESP32 1-2 giây rồi thả ra).*

---

## 📺 4. Kiểm tra qua Serial Monitor

Mở **Tools -> Serial Monitor**, chỉnh baudrate về **115200 baud**.

### Log mẫu của ESP32 #1 (Chỗ đỗ):
```text
[BOOT] ESP32 SLOT START
[WIFI] Connecting to MyHomeWiFi
.....
[WIFI] Connected
[WIFI] IP Address: 192.168.1.51
[MQTT] Attempting connection...
[MQTT] Connected
[HEARTBEAT] Sent
[IR] A01 = FREE
[IR] A02 = FREE
[IR] A03 = FREE
[IR] A04 = FREE
[IR] A05 = FREE
[IR] A06 = FREE
```
Khi đặt tay che cảm biến A01:
```text
[IR] A01 = OCCUPIED
```

### Log mẫu của ESP32 #2 (Cổng vào/ra):
```text
[BOOT] ESP32 GATE START
Firmware Version: 0x92 = v2.0
[WIFI] Connecting to MyHomeWiFi
....
[WIFI] Connected
[WIFI] IP Address: 192.168.1.52
[MQTT] Attempting connection...
[MQTT] Connected
[HEARTBEAT] Sent
```
Khi quét thẻ RFID:
```text
[RFID] UID = 33:7B:A2:14
```
Khi Backend gửi lệnh mở cổng vào và xe đi qua:
```text
[MQTT IN] Topic: parking/cmd/gate_in | Payload: {"command":"OPEN_GATE_IN"}
[BARRIER IN] OPEN
[IR IN] VEHICLE PASSED
[BARRIER IN] CLOSE
```

---

## ✅ 5. Danh sách kiểm tra phần cứng (Hardware Checklist)

| STT | Hạng mục kiểm tra | Thao tác thử nghiệm | Kết quả mong đợi |
|:---:|---|---|---|
| **01** | **IR A01 – A06** | Dùng tay hoặc mô hình xe che lần lượt 6 cảm biến chỗ đỗ | Serial in `A0x = OCCUPIED`, trên Web Admin & App chuyển sang màu đỏ |
| **02** | **RFID RC522** | Áp thẻ RFID hoặc thẻ móc khóa vào đầu đọc | Serial in `[RFID] UID = ...`, Backend nhận được sự kiện quét thẻ |
| **03** | **Servo IN** | Bấm nút "Mở Barrier Vào" trên Web Admin | Servo IN quay 90 độ nâng thanh chắn lên |
| **04** | **IR Barrier IN** | Đưa xe mô hình qua vị trí cảm biến sau barie | Serial in `[IR IN] VEHICLE PASSED` và Barie tự động đóng lại |
| **05** | **Timeout Barie** | Mở barie nhưng không cho xe đi qua | Sau 15 giây, Barie tự động hạ xuống an toàn |
| **06** | **Servo OUT** | Bấm nút "Mở Barrier Ra" trên Web Admin | Servo OUT quay 90 độ |
| **07** | **IR Barrier OUT**| Đưa xe qua cảm biến sau barie ra | Barie OUT tự động đóng lại |
| **08** | **Relay Đèn** | Bấm nút "Bật Đèn" / "Tắt Đèn" trên Web Admin | Module relay đóng/ngắt (nghe tiếng "tách"), đèn mô hình bật/tắt |
| **09** | **MQTT Reconnect**| Rút WiFi hoặc ngắt broker rồi kết nối lại | ESP32 tự động reconnect và gửi lại trạng thái mà không bị treo |
