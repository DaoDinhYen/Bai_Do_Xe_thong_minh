# Smart Parking System — Backend

## Cấu trúc thư mục

```
backend_csdl/
├── csdl/
│   └── smart_parking.sql          ← Schema + Seed data
├── src/
│   ├── config/        db.js, mqtt.js
│   ├── middleware/    auth.js, errorHandler.js
│   ├── models/        *.js (15 models)
│   ├── controllers/   *.js (14 controllers)
│   ├── routes/        *.js (14 route files)
│   ├── services/      authService, bookingService, paymentService, accessService, feeCalculator
│   ├── mqtt/          mqttClient.js, mqttHandler.js, mqttPublisher.js
│   ├── socket/        socketHandler.js
│   └── utils/         logger.js, response.js, plateNormalizer.js
├── .env               ← Copy từ .env.example và điền thông tin thật
├── package.json
└── server.js
```

## Cài đặt & Chạy

### Bước 1: Cài phụ thuộc
```bash
cd backend_csdl
npm install
```

### Bước 2: Cấu hình .env
```
DB_PASSWORD=your_mysql_password
```

### Bước 3: Import Database
```bash
mysql -u root -p < csdl/smart_parking.sql
```
Hoặc mở MySQL Workbench → File → Run SQL Script → chọn `smart_parking.sql`

### Bước 4: Cài MQTT Broker (nếu chưa có)
- Download Mosquitto: https://mosquitto.org/download/
- Chạy: `mosquitto`

### Bước 5: Chạy server
```bash
npm run dev     # Development (auto-reload)
npm start       # Production
```

Server khởi động tại: `http://localhost:3000`

## API Endpoints

| Nhóm | Base URL |
|------|----------|
| Auth | `/api/auth` |
| User | `/api/users` |
| Vehicle | `/api/vehicles` |
| Parking | `/api/parking` |
| Booking | `/api/bookings` |
| Payment | `/api/payment` |
| RFID | `/api/rfid` |
| Device | `/api/devices` |
| Camera | `/api/camera` |
| Access | `/api/access` |
| History | `/api/history` |
| Statistics | `/api/statistics` |
| Admin | `/api/admin` |
| Notification | `/api/notifications` |

## Tài khoản mặc định

| Role | Email | Password |
|------|-------|----------|
| ADMIN | admin@smartparking.com | Admin@123456 |
| USER  | user@smartparking.com  | User@123456 *(cần tạo riêng)* |

> **Lưu ý:** Password trong seed data là hash bcrypt của `Admin@123456`. Cần chạy `npm run db:init` hoặc tạo user mới bằng API `/api/auth/register`.

## Database Tables

| Bảng | Mô tả |
|------|-------|
| users | Tài khoản người dùng |
| vehicles | Phương tiện của user |
| parking_slots | Chỗ đỗ xe A01-A06 + virtual slots |
| parking_rates | Bảng giá theo loại xe |
| rfid_cards | Thẻ RFID |
| bookings | Đặt chỗ trước |
| parking_history | Lịch sử vào/ra |
| transactions | Giao dịch ví điện tử |
| devices | ESP32 #1, #2 |
| device_logs | Nhật ký thiết bị |
| system_logs | Nhật ký hệ thống |
| notifications | Thông báo |
| cameras | Camera IN/OUT |
| camera_records | Kết quả ANPR/LPR |
| guest_parking_sessions | Phiên gửi xe khách vãng lai |

## MQTT Topics

| Topic | Hướng | Mô tả |
|-------|-------|-------|
| `parking/esp32_1/slot/A01..A06` | ESP32→Server | Trạng thái cảm biến IR chỗ đỗ |
| `parking/esp32_2/rfid/in` | ESP32→Server | RFID quét cổng vào |
| `parking/esp32_2/rfid/out` | ESP32→Server | RFID quét cổng ra |
| `parking/esp32_2/gate/in` | ESP32→Server | Cảm biến IR sau barie vào |
| `parking/esp32_2/gate/out` | ESP32→Server | Cảm biến IR sau barie ra |
| `parking/device/status` | ESP32→Server | Heartbeat |
| `parking/cmd/gate_in` | Server→ESP32 | Lệnh mở/đóng barie vào |
| `parking/cmd/gate_out` | Server→ESP32 | Lệnh mở/đóng barie ra |
| `parking/cmd/light` | Server→ESP32 | Điều khiển đèn |

## Socket.IO Events

| Event | Mô tả |
|-------|-------|
| `slot_status_changed` | Trạng thái chỗ đỗ thay đổi |
| `barrier_status` | Trạng thái barie |
| `device_status` | ESP32 online/offline |
| `rfid_event` | RFID quét + kết quả xác thực |
| `camera_detection` | Camera nhận diện biển số |
| `new_notification` | Thông báo mới |
| `admin_alert` | Cảnh báo Admin |
| `light_status` | Trạng thái đèn |
