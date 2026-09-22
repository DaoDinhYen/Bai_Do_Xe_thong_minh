-- ============================================================
-- SMART PARKING SYSTEM — MySQL Database Schema & Clean Demo Data
-- Phiên bản duy nhất: Tự động xóa CSDL cũ và tạo mới hoàn chỉnh từ đầu
-- Đặc điểm:
-- 1. Mỗi bảng có đầy đủ dữ liệu demo phong phú.
-- 2. HIỆN TẠI: BÃI XE VÀ CHỖ ĐỖ HOÀN TOÀN TRỐNG (FREE 100%).
-- 3. Người dùng demo (user1@gmail.com) có lịch sử ở mọi bảng trong quá khứ.
-- 4. Mã thẻ RFID thật của người dùng: 56:62:69:03.
-- ============================================================

DROP DATABASE IF EXISTS smart_parking;
CREATE DATABASE smart_parking
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE smart_parking;

-- ============================================================
-- 1. TABLE: users (Tài khoản người dùng)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(100) NOT NULL,
  email          VARCHAR(150) NOT NULL UNIQUE,
  phone          VARCHAR(20),
  password       VARCHAR(255) NOT NULL,
  role           ENUM('USER','ADMIN') NOT NULL DEFAULT 'USER',
  wallet_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  status         ENUM('ACTIVE','BLOCKED') NOT NULL DEFAULT 'ACTIVE',
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role  (role),
  INDEX idx_status (status)
) ENGINE=InnoDB;

-- ============================================================
-- 2. TABLE: vehicles (Phương tiện giao thông)
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicles (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL,
  plate_number  VARCHAR(20) NOT NULL UNIQUE COMMENT 'Chuẩn hóa: không dấu gạch, chấm, khoảng trắng',
  vehicle_type  ENUM('CAR','MOTORBIKE','TRUCK','OTHER') NOT NULL DEFAULT 'CAR',
  vehicle_name  VARCHAR(100),
  color         VARCHAR(50),
  rfid_uid      VARCHAR(50) UNIQUE,
  is_default    TINYINT(1) NOT NULL DEFAULT 0,
  status        ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id      (user_id),
  INDEX idx_plate_number (plate_number),
  INDEX idx_rfid_uid     (rfid_uid)
) ENGINE=InnoDB;

-- ============================================================
-- 3. TABLE: parking_slots (Vị trí đỗ xe)
-- ============================================================
CREATE TABLE IF NOT EXISTS parking_slots (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slot_code  VARCHAR(10) NOT NULL UNIQUE COMMENT 'A01, A02...',
  zone       VARCHAR(10) NOT NULL DEFAULT 'A',
  status     ENUM('FREE','OCCUPIED','RESERVED','DISABLED') NOT NULL DEFAULT 'FREE',
  sensor_id  VARCHAR(50) COMMENT 'ID cảm biến IR trên ESP32 #1',
  is_virtual TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0: Thật có cảm biến, 1: Ảo minh họa',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_status     (status),
  INDEX idx_zone       (zone),
  INDEX idx_is_virtual (is_virtual)
) ENGINE=InnoDB;

-- ============================================================
-- 4. TABLE: parking_rates (Bảng giá dịch vụ)
-- ============================================================
CREATE TABLE IF NOT EXISTS parking_rates (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vehicle_type   ENUM('CAR','MOTORBIKE','TRUCK','OTHER') NOT NULL DEFAULT 'CAR',
  price_per_hour DECIMAL(10,2) NOT NULL DEFAULT 10000.00,
  minimum_fee    DECIMAL(10,2) NOT NULL DEFAULT 10000.00,
  maximum_fee    DECIMAL(10,2) NULL,
  status         ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- 5. TABLE: rfid_cards (Thẻ từ phân quyền ra/vào)
-- ============================================================
CREATE TABLE IF NOT EXISTS rfid_cards (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uid        VARCHAR(50) NOT NULL UNIQUE COMMENT 'Mã UID đọc từ RC522',
  user_id    INT UNSIGNED,
  vehicle_id INT UNSIGNED,
  status     ENUM('ACTIVE','BLOCKED','LOST') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE SET NULL,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
  INDEX idx_uid        (uid),
  INDEX idx_user_id    (user_id),
  INDEX idx_vehicle_id (vehicle_id)
) ENGINE=InnoDB;

-- ============================================================
-- 6. TABLE: bookings (Đặt chỗ đỗ xe trước)
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_code  VARCHAR(20) NOT NULL UNIQUE,
  user_id       INT UNSIGNED NOT NULL,
  vehicle_id    INT UNSIGNED NOT NULL,
  slot_id       INT UNSIGNED NOT NULL,
  start_time    DATETIME NOT NULL,
  end_time      DATETIME NOT NULL,
  duration      DECIMAL(5,2) NOT NULL,
  unit_price    DECIMAL(10,2) NOT NULL,
  total_price   DECIMAL(10,2) NOT NULL,
  status        ENUM('PENDING','CONFIRMED','ACTIVE','COMPLETED','CANCELLED','EXPIRED') NOT NULL DEFAULT 'CONFIRMED',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)    REFERENCES users(id)         ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)      ON DELETE CASCADE,
  FOREIGN KEY (slot_id)    REFERENCES parking_slots(id) ON DELETE CASCADE,
  INDEX idx_user_id      (user_id),
  INDEX idx_slot_id      (slot_id),
  INDEX idx_status       (status),
  INDEX idx_start_time   (start_time),
  INDEX idx_booking_code (booking_code)
) ENGINE=InnoDB;

-- ============================================================
-- 7. TABLE: parking_history (Lịch sử các phiên đỗ xe)
-- ============================================================
CREATE TABLE IF NOT EXISTS parking_history (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id        INT UNSIGNED,
  vehicle_id     INT UNSIGNED,
  slot_id        INT UNSIGNED,
  rfid_uid       VARCHAR(50),
  booking_id     INT UNSIGNED COMMENT 'NULL nếu vào vãng lai/quẹt thẻ tự do',
  entry_time     DATETIME NOT NULL,
  exit_time      DATETIME,
  duration       INT COMMENT 'Thời gian đỗ (phút)',
  fee            DECIMAL(10,2),
  payment_status ENUM('PENDING','PAID','FAILED','REFUNDED') NOT NULL DEFAULT 'PENDING',
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)    REFERENCES users(id)         ON DELETE SET NULL,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)      ON DELETE SET NULL,
  FOREIGN KEY (slot_id)    REFERENCES parking_slots(id) ON DELETE SET NULL,
  FOREIGN KEY (booking_id) REFERENCES bookings(id)      ON DELETE SET NULL,
  INDEX idx_user_id        (user_id),
  INDEX idx_vehicle_id     (vehicle_id),
  INDEX idx_entry_time     (entry_time),
  INDEX idx_payment_status (payment_status),
  INDEX idx_rfid_uid       (rfid_uid)
) ENGINE=InnoDB;

-- ============================================================
-- 8. TABLE: transactions (Giao dịch ví điện tử)
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED NOT NULL,
  type         ENUM('TOP_UP','BOOKING_PAYMENT','PARKING_PAYMENT','REFUND') NOT NULL,
  amount       DECIMAL(15,2) NOT NULL COMMENT 'Dương: cộng tiền, Âm: trừ tiền',
  description  VARCHAR(255),
  status       ENUM('SUCCESS','FAILED','PENDING') NOT NULL DEFAULT 'SUCCESS',
  reference_id INT UNSIGNED,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_type    (type),
  INDEX idx_created (created_at)
) ENGINE=InnoDB;

-- ============================================================
-- 9. TABLE: devices (Thiết bị IoT phần cứng)
-- ============================================================
CREATE TABLE IF NOT EXISTS devices (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  device_code      VARCHAR(50) NOT NULL UNIQUE,
  device_type      ENUM('ESP32','SENSOR','SERVO','RFID_READER','RELAY','CAMERA','OTHER') NOT NULL,
  name             VARCHAR(100) NOT NULL,
  location         VARCHAR(100),
  status           ENUM('ONLINE','OFFLINE','ERROR') NOT NULL DEFAULT 'ONLINE',
  last_seen        TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address       VARCHAR(45),
  firmware_version VARCHAR(20),
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_device_code (device_code),
  INDEX idx_status      (status)
) ENGINE=InnoDB;

-- ============================================================
-- 10. TABLE: device_logs (Nhật ký sự kiện thiết bị)
-- ============================================================
CREATE TABLE IF NOT EXISTS device_logs (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  device_id  INT UNSIGNED NOT NULL,
  event      VARCHAR(100) NOT NULL,
  data       JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  INDEX idx_device_id (device_id),
  INDEX idx_created   (created_at)
) ENGINE=InnoDB;

-- ============================================================
-- 11. TABLE: system_logs (Nhật ký hoạt động hệ thống)
-- ============================================================
CREATE TABLE IF NOT EXISTS system_logs (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED,
  action      VARCHAR(50) NOT NULL,
  device_id   INT UNSIGNED,
  description TEXT,
  ip_address  VARCHAR(45),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE SET NULL,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL,
  INDEX idx_action  (action),
  INDEX idx_user_id (user_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB;

-- ============================================================
-- 12. TABLE: notifications (Thông báo cho người dùng)
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  title      VARCHAR(200) NOT NULL,
  message    TEXT NOT NULL,
  type       ENUM('INFO','SUCCESS','WARNING','ALERT','ERROR') NOT NULL DEFAULT 'INFO',
  is_read    TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read)
) ENGINE=InnoDB;

-- ============================================================
-- 13. TABLE: cameras (Camera nhận diện biển số ANPR)
-- ============================================================
CREATE TABLE IF NOT EXISTS cameras (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  camera_code VARCHAR(50) NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  location    VARCHAR(100),
  direction   ENUM('IN','OUT','MONITOR') NOT NULL DEFAULT 'IN',
  stream_url  VARCHAR(500),
  status      ENUM('ONLINE','OFFLINE','ERROR') NOT NULL DEFAULT 'ONLINE',
  last_seen   TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_camera_code (camera_code),
  INDEX idx_direction   (direction)
) ENGINE=InnoDB;

-- ============================================================
-- 14. TABLE: camera_records (Bản ghi ảnh chụp và OCR biển số)
-- ============================================================
CREATE TABLE IF NOT EXISTS camera_records (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  camera_id           INT UNSIGNED,
  user_id             INT UNSIGNED,
  vehicle_id          INT UNSIGNED,
  rfid_uid            VARCHAR(50),
  plate_number        VARCHAR(20),
  detected_plate      VARCHAR(50),
  image_path          VARCHAR(500),
  confidence          DECIMAL(5,4),
  direction           ENUM('IN','OUT') NOT NULL DEFAULT 'IN',
  verification_status ENUM('PENDING','ACCEPTED','REJECTED','MATCHED','MISMATCH','UNKNOWN','LOW_CONFIDENCE','NEED_REVIEW') NOT NULL DEFAULT 'MATCHED',
  captured_at         DATETIME NOT NULL,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (camera_id)  REFERENCES cameras(id)  ON DELETE SET NULL,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE SET NULL,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
  INDEX idx_plate_number (plate_number),
  INDEX idx_direction    (direction),
  INDEX idx_captured_at  (captured_at),
  INDEX idx_verification (verification_status)
) ENGINE=InnoDB;

-- ============================================================
-- 15. TABLE: guest_parking_sessions (Khách gửi xe vãng lai)
-- ============================================================
CREATE TABLE IF NOT EXISTS guest_parking_sessions (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  session_code       VARCHAR(20) NOT NULL UNIQUE,
  license_plate      VARCHAR(20),
  entry_time         DATETIME NOT NULL,
  exit_time          DATETIME,
  parking_slot       VARCHAR(10),
  status             ENUM('ACTIVE','COMPLETED','ABANDONED') NOT NULL DEFAULT 'COMPLETED',
  duration           INT,
  amount             DECIMAL(10,2),
  payment_status     ENUM('PENDING','PAID','WAIVED') NOT NULL DEFAULT 'PAID',
  camera_in_record   INT UNSIGNED,
  camera_out_record  INT UNSIGNED,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (camera_in_record)  REFERENCES camera_records(id) ON DELETE SET NULL,
  FOREIGN KEY (camera_out_record) REFERENCES camera_records(id) ON DELETE SET NULL,
  INDEX idx_license_plate (license_plate),
  INDEX idx_status        (status),
  INDEX idx_entry_time    (entry_time)
) ENGINE=InnoDB;

-- ============================================================
-- VIEWS TIỆN ÍCH CHO HỆ THỐNG
-- ============================================================

-- View: Các phiên gửi xe đang hoạt động (hiện tại sẽ rỗng vì bãi trống)
CREATE OR REPLACE VIEW v_active_sessions AS
SELECT
  ph.id,
  u.name AS user_name,
  v.plate_number,
  v.vehicle_type,
  ps.slot_code,
  ps.zone,
  ph.entry_time,
  TIMESTAMPDIFF(MINUTE, ph.entry_time, NOW()) AS minutes_parked,
  ph.rfid_uid
FROM parking_history ph
LEFT JOIN users u ON ph.user_id = u.id
LEFT JOIN vehicles v ON ph.vehicle_id = v.id
LEFT JOIN parking_slots ps ON ph.slot_id = ps.id
WHERE ph.exit_time IS NULL;

-- View: Tổng quan trạng thái vị trí đỗ
CREATE OR REPLACE VIEW v_slot_overview AS
SELECT
  ps.id,
  ps.slot_code,
  ps.zone,
  ps.status,
  ps.is_virtual,
  b.booking_code,
  u.name AS booked_by,
  v.plate_number AS booked_vehicle,
  b.start_time,
  b.end_time
FROM parking_slots ps
LEFT JOIN bookings b ON ps.id = b.slot_id AND b.status IN ('CONFIRMED','ACTIVE')
LEFT JOIN users u ON b.user_id = u.id
LEFT JOIN vehicles v ON b.vehicle_id = v.id
ORDER BY ps.zone, ps.slot_code;

-- ============================================================
-- DỮ LIỆU SEED DEMO ĐẦY ĐỦ (BÃI XE TRỐNG HẾT HIỆN TẠI)
-- ============================================================

-- 1. BẢNG users
-- Mật khẩu Admin: Admin@123456
-- Mật khẩu User: 123456
INSERT INTO users (id, name, email, phone, password, role, wallet_balance, status) VALUES
(1, 'Administrator', 'admin@smartparking.com', '0901234567',
 '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3A2gVqCnfu', 'ADMIN', 0.00, 'ACTIVE'),

(2, 'Người dùng Demo', 'user1@gmail.com', '0912345678',
 '$2a$12$XQpyZYp9g4GXRbjrq66pkOHu/gq27yhnXrwufuZ2zdkmTjHr2sdhW', 'USER', 500000.00, 'ACTIVE'),

(3, 'Nguyễn Văn An', 'user@smartparking.com', '0987654321',
 '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3A2gVqCnfu', 'USER', 300000.00, 'ACTIVE'),

(4, 'Trần Thị Mai', 'tran.mai@gmail.com', '0933445566',
 '$2a$12$XQpyZYp9g4GXRbjrq66pkOHu/gq27yhnXrwufuZ2zdkmTjHr2sdhW', 'USER', 250000.00, 'ACTIVE'),

(5, 'Lê Hoàng Long', 'le.long@gmail.com', '0977889900',
 '$2a$12$XQpyZYp9g4GXRbjrq66pkOHu/gq27yhnXrwufuZ2zdkmTjHr2sdhW', 'USER', 150000.00, 'ACTIVE');

-- 2. BẢNG vehicles
-- Xe 1 của user1 gắn mã thẻ RFID THẬT CỦA BẠN: 56:62:69:03
INSERT INTO vehicles (id, user_id, plate_number, vehicle_type, vehicle_name, color, rfid_uid, is_default, status) VALUES
(1, 2, '36A-999.99', 'CAR', 'Mazda CX-5', 'Đỏ pha lê', '56:62:69:03', 1, 'ACTIVE'),
(2, 2, '29B1-888.88', 'MOTORBIKE', 'Honda SH 150i', 'Trắng ngọc trai', 'A1:B2:C3:D4', 0, 'ACTIVE'),
(3, 3, '30E-123.45', 'CAR', 'Toyota Camry', 'Đen ánh kim', 'B2:C3:D4:E5', 1, 'ACTIVE'),
(4, 4, '51G-567.89', 'CAR', 'Kia Seltos', 'Vàng cát', 'C3:D4:E5:F6', 1, 'ACTIVE');

-- 3. BẢNG parking_rates (Bảng giá)
INSERT INTO parking_rates (id, vehicle_type, price_per_hour, minimum_fee, maximum_fee, status) VALUES
(1, 'CAR',       10000.00, 10000.00, 200000.00, 'ACTIVE'),
(2, 'MOTORBIKE',  5000.00,  5000.00, 100000.00, 'ACTIVE'),
(3, 'TRUCK',     20000.00, 20000.00, 500000.00, 'ACTIVE');

-- 4. BẢNG rfid_cards
INSERT INTO rfid_cards (id, uid, user_id, vehicle_id, status) VALUES
(1, '56:62:69:03', 2, 1, 'ACTIVE'),
(2, 'A1:B2:C3:D4', 2, 2, 'ACTIVE'),
(3, 'B2:C3:D4:E5', 3, 3, 'ACTIVE'),
(4, 'C3:D4:E5:F6', 4, 4, 'ACTIVE'),
(5, 'E1:F2:A3:B4', NULL, NULL, 'ACTIVE'); -- Thẻ dự phòng chưa gán xe

-- 5. BẢNG parking_slots (TẤT CẢ Ô ĐỀU TRỐNG Ở HIỆN TẠI)
INSERT INTO parking_slots (id, slot_code, zone, status, sensor_id, is_virtual) VALUES
(1, 'A01', 'A', 'FREE', 'IR_SENSOR_1', 0),
(2, 'A02', 'A', 'FREE', 'IR_SENSOR_2', 0),
(3, 'A03', 'A', 'FREE', 'IR_SENSOR_3', 0),
(4, 'A04', 'A', 'FREE', 'IR_SENSOR_4', 0),
(5, 'A05', 'A', 'FREE', 'IR_SENSOR_5', 0),
(6, 'A06', 'A', 'FREE', 'IR_SENSOR_6', 0),
(7, 'B01', 'B', 'FREE', NULL, 1),
(8, 'B02', 'B', 'FREE', NULL, 1),
(9, 'B03', 'B', 'DISABLED', NULL, 1),
(10, 'B04', 'B', 'DISABLED', NULL, 1);

-- 6. BẢNG devices
INSERT INTO devices (id, device_code, device_type, name, location, status, ip_address, firmware_version) VALUES
(1, 'ESP32_1', 'ESP32', 'ESP32 #1 - Slot Sensors', 'Bãi xe khu A', 'ONLINE', '192.168.1.51', '2.0.0'),
(2, 'ESP32_2', 'ESP32', 'ESP32 #2 - Gate & RFID', 'Trạm kiểm soát Cổng', 'ONLINE', '192.168.1.52', '2.0.0');

-- 7. BẢNG cameras
INSERT INTO cameras (id, camera_code, name, location, direction, status) VALUES
(1, 'CAM_IN',  'Camera Cổng Vào', 'Cổng Barrier Vào', 'IN',  'ONLINE'),
(2, 'CAM_OUT', 'Camera Cổng Ra',  'Cổng Barrier Ra',  'OUT', 'ONLINE');

-- 8. BẢNG bookings (CHỈ CÓ LỊCH SỬ QUÁ KHỨ, HIỆN TẠI KHÔNG CÓ LỊCH NÀO GIỮ SLOT)
INSERT INTO bookings (id, booking_code, user_id, vehicle_id, slot_id, start_time, end_time, duration, unit_price, total_price, status) VALUES
(1, 'BK2026091001', 2, 1, 1, DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 70 HOUR), 2.0, 10000.00, 20000.00, 'COMPLETED'),
(2, 'BK2026091202', 2, 2, 3, DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 47 HOUR), 1.0, 5000.00, 5000.00, 'COMPLETED'),
(3, 'BK2026091403', 3, 3, 4, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 21 HOUR), 3.0, 10000.00, 30000.00, 'CANCELLED');

-- 9. BẢNG parking_history (CÁC PHIÊN ĐỖ XE ĐÃ HOÀN THÀNH — KHÔNG CÓ XE NÀO ĐANG ĐỖ HIỆN TẠI)
INSERT INTO parking_history (id, user_id, vehicle_id, slot_id, rfid_uid, booking_id, entry_time, exit_time, duration, fee, payment_status) VALUES
(1, 2, 1, 1, '56:62:69:03', 1, DATE_SUB(NOW(), INTERVAL 24 HOUR), DATE_SUB(NOW(), INTERVAL 21 HOUR), 180, 30000.00, 'PAID'),
(2, 2, 2, 3, 'A1:B2:C3:D4', 2, DATE_SUB(NOW(), INTERVAL 48 HOUR), DATE_SUB(NOW(), INTERVAL 46 HOUR), 120, 10000.00, 'PAID'),
(3, 3, 3, 2, 'B2:C3:D4:E5', NULL, DATE_SUB(NOW(), INTERVAL 36 HOUR), DATE_SUB(NOW(), INTERVAL 34 HOUR), 120, 20000.00, 'PAID'),
(4, 4, 4, 5, 'C3:D4:E5:F6', NULL, DATE_SUB(NOW(), INTERVAL 60 HOUR), DATE_SUB(NOW(), INTERVAL 58 HOUR), 120, 20000.00, 'PAID');

-- 10. BẢNG transactions (Lịch sử nạp tiền và trừ phí)
INSERT INTO transactions (id, user_id, type, amount, description, status, reference_id, created_at) VALUES
(1, 2, 'TOP_UP',          500000.00, 'Nạp tiền ví điện tử qua VNPay', 'SUCCESS', NULL, DATE_SUB(NOW(), INTERVAL 5 DAY)),
(2, 2, 'PARKING_PAYMENT',  -30000.00, 'Thanh toán phí đỗ xe ô tô tại ô A01', 'SUCCESS', 1, DATE_SUB(NOW(), INTERVAL 21 HOUR)),
(3, 2, 'PARKING_PAYMENT',  -10000.00, 'Thanh toán phí đỗ xe máy tại ô A03', 'SUCCESS', 2, DATE_SUB(NOW(), INTERVAL 46 HOUR)),
(4, 2, 'TOP_UP',           40000.00, 'Nạp tiền ví bổ sung số dư', 'SUCCESS', NULL, DATE_SUB(NOW(), INTERVAL 20 HOUR)),
(5, 3, 'TOP_UP',          320000.00, 'Nạp tiền ví ban đầu', 'SUCCESS', NULL, DATE_SUB(NOW(), INTERVAL 4 DAY)),
(6, 3, 'PARKING_PAYMENT',  -20000.00, 'Thanh toán phí đỗ xe tại ô A02', 'SUCCESS', 3, DATE_SUB(NOW(), INTERVAL 34 HOUR));

-- 11. BẢNG notifications (Thông báo cho người dùng demo)
INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at) VALUES
(1, 2, 'Chào mừng bạn!', 'Chào mừng bạn đến với Hệ thống Bãi Đỗ Xe Thông Minh Smart Parking.', 'INFO', 1, DATE_SUB(NOW(), INTERVAL 5 DAY)),
(2, 2, 'Nạp tiền thành công', 'Bạn đã nạp thành công 500.000 đ vào ví điện tử.', 'SUCCESS', 1, DATE_SUB(NOW(), INTERVAL 5 DAY)),
(3, 2, 'Thanh toán hoàn tất', 'Bạn đã thanh toán thành công 30.000 đ cho phiên gửi xe tại ô A01.', 'SUCCESS', 1, DATE_SUB(NOW(), INTERVAL 21 HOUR)),
(4, 2, 'Cập nhật số dư', 'Số dư ví hiện tại của bạn là 500.000 đ. Chúc bạn có trải nghiệm tuyệt vời!', 'INFO', 0, DATE_SUB(NOW(), INTERVAL 1 HOUR));

-- 12. BẢNG camera_records (Lịch sử nhận diện OCR quá khứ)
INSERT INTO camera_records (id, camera_id, user_id, vehicle_id, rfid_uid, plate_number, detected_plate, image_path, confidence, direction, verification_status, captured_at) VALUES
(1, 1, 2, 1, '56:62:69:03', '36A-999.99', '36A-999.99', 'captures/cam_in_demo_1.jpg', 0.9620, 'IN',  'MATCHED', DATE_SUB(NOW(), INTERVAL 24 HOUR)),
(2, 2, 2, 1, '56:62:69:03', '36A-999.99', '36A-999.99', 'captures/cam_out_demo_1.jpg', 0.9540, 'OUT', 'MATCHED', DATE_SUB(NOW(), INTERVAL 21 HOUR)),
(3, 1, 3, 3, 'B2:C3:D4:E5', '30E-123.45', '30E-123.45', 'captures/cam_in_demo_2.jpg', 0.9410, 'IN',  'MATCHED', DATE_SUB(NOW(), INTERVAL 36 HOUR)),
(4, 2, 3, 3, 'B2:C3:D4:E5', '30E-123.45', '30E-123.45', 'captures/cam_out_demo_2.jpg', 0.9380, 'OUT', 'MATCHED', DATE_SUB(NOW(), INTERVAL 34 HOUR));

-- 13. BẢNG guest_parking_sessions (Khách vãng lai cũ)
INSERT INTO guest_parking_sessions (id, session_code, license_plate, entry_time, exit_time, parking_slot, status, duration, amount, payment_status, camera_in_record, camera_out_record) VALUES
(1, 'GST2026091501', '51F-123.45', DATE_SUB(NOW(), INTERVAL 30 HOUR), DATE_SUB(NOW(), INTERVAL 28 HOUR), 'B01', 'COMPLETED', 120, 20000.00, 'PAID', NULL, NULL);

-- 14. BẢNG system_logs (Nhật ký hệ thống)
INSERT INTO system_logs (id, user_id, action, device_id, description, ip_address, created_at) VALUES
(1, 1, 'SYSTEM_INIT', NULL, 'Khởi tạo toàn diện cơ sở dữ liệu Smart Parking thành công', '127.0.0.1', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(2, 2, 'USER_LOGIN',  NULL, 'Người dùng Demo đăng nhập vào hệ thống', '192.168.1.15', DATE_SUB(NOW(), INTERVAL 24 HOUR)),
(3, 2, 'RFID_SCAN',   2,    'Quét thẻ RFID 56:62:69:03 thành công tại Cổng Vào', '192.168.1.52', DATE_SUB(NOW(), INTERVAL 24 HOUR)),
(4, 2, 'GATE_OPEN',   2,    'Lệnh mở Barie Vào thực thi cho xe 36A-999.99', '192.168.1.52', DATE_SUB(NOW(), INTERVAL 24 HOUR)),
(5, 2, 'GATE_CLOSE',  2,    'Xe đã qua cảm biến hồng ngoại, Barie Vào tự động đóng', '192.168.1.52', DATE_SUB(NOW(), INTERVAL 24 HOUR));

-- 15. BẢNG device_logs (Nhật ký cảm biến)
INSERT INTO device_logs (id, device_id, event, data, created_at) VALUES
(1, 1, 'HEARTBEAT', '{"status":"ONLINE","slots_free":6,"total":6}', DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(2, 2, 'HEARTBEAT', '{"status":"ONLINE","barrier_in":"CLOSED","barrier_out":"CLOSED"}', DATE_SUB(NOW(), INTERVAL 1 HOUR));

-- ============================================================
-- KIỂM TRA TỔNG QUAN SAU KHI TẠO XONG
-- ============================================================
SELECT 'BẢNG CHỖ ĐỖ XE (TẤT CẢ PHẢI FREE TRỪ DISABLED):' AS ThongBao;
SELECT slot_code, zone, status, is_virtual FROM parking_slots;

SELECT 'PHIÊN ĐỖ XE ĐANG HOẠT ĐỘNG (PHẢI BẰNG 0 DÒNG):' AS ThongBao;
SELECT * FROM v_active_sessions;

SELECT 'TÀI KHOẢN NGƯỜI DÙNG DEMO:' AS ThongBao;
SELECT u.name, u.email, u.wallet_balance, v.plate_number, v.rfid_uid 
FROM users u 
JOIN vehicles v ON u.id = v.user_id 
WHERE u.email = 'user1@gmail.com';
