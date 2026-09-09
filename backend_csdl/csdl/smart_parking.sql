-- ============================================================
-- SMART PARKING SYSTEM — MySQL Database Schema
-- Version: 1.0 | Author: Smart Parking Team | 2026
-- ============================================================

CREATE DATABASE IF NOT EXISTS smart_parking
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE smart_parking;

-- ============================================================
-- TABLE: users
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
-- TABLE: vehicles
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicles (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL,
  plate_number  VARCHAR(20) NOT NULL UNIQUE COMMENT 'Normalized: no dashes/dots/spaces',
  vehicle_type  ENUM('CAR','MOTORBIKE','TRUCK','OTHER') NOT NULL DEFAULT 'CAR',
  vehicle_name  VARCHAR(100),
  color         VARCHAR(50),
  rfid_uid      VARCHAR(50) UNIQUE,
  is_default    TINYINT(1) NOT NULL DEFAULT 0,
  status        ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id     (user_id),
  INDEX idx_plate_number (plate_number),
  INDEX idx_rfid_uid    (rfid_uid)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE: parking_slots
-- ============================================================
CREATE TABLE IF NOT EXISTS parking_slots (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slot_code  VARCHAR(10) NOT NULL UNIQUE COMMENT 'e.g. A01, A02',
  zone       VARCHAR(10) NOT NULL DEFAULT 'A' COMMENT 'Khu vực đỗ xe',
  status     ENUM('FREE','OCCUPIED','RESERVED','DISABLED') NOT NULL DEFAULT 'FREE',
  sensor_id  VARCHAR(50) COMMENT 'IR sensor identifier on ESP32 #1',
  is_virtual TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = demo slot (no real sensor)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_status     (status),
  INDEX idx_zone       (zone),
  INDEX idx_is_virtual (is_virtual)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE: parking_rates
-- ============================================================
CREATE TABLE IF NOT EXISTS parking_rates (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vehicle_type  ENUM('CAR','MOTORBIKE','TRUCK','OTHER') NOT NULL DEFAULT 'CAR',
  price_per_hour DECIMAL(10,2) NOT NULL DEFAULT 10000.00,
  minimum_fee   DECIMAL(10,2) NOT NULL DEFAULT 10000.00,
  maximum_fee   DECIMAL(10,2) NULL COMMENT 'NULL = no maximum cap',
  status        ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- TABLE: rfid_cards
-- ============================================================
CREATE TABLE IF NOT EXISTS rfid_cards (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uid        VARCHAR(50) NOT NULL UNIQUE COMMENT 'RFID UID from RC522',
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
-- TABLE: bookings
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_code  VARCHAR(20) NOT NULL UNIQUE,
  user_id       INT UNSIGNED NOT NULL,
  vehicle_id    INT UNSIGNED NOT NULL,
  slot_id       INT UNSIGNED NOT NULL,
  start_time    DATETIME NOT NULL,
  end_time      DATETIME NOT NULL,
  duration      DECIMAL(5,2) NOT NULL COMMENT 'Number of hours booked',
  unit_price    DECIMAL(10,2) NOT NULL COMMENT 'Price per hour at time of booking',
  total_price   DECIMAL(10,2) NOT NULL COMMENT 'Pre-paid total fee',
  status        ENUM('PENDING','CONFIRMED','ACTIVE','COMPLETED','CANCELLED','EXPIRED') NOT NULL DEFAULT 'CONFIRMED',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)    REFERENCES users(id)          ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)       ON DELETE CASCADE,
  FOREIGN KEY (slot_id)    REFERENCES parking_slots(id)  ON DELETE CASCADE,
  INDEX idx_user_id    (user_id),
  INDEX idx_slot_id    (slot_id),
  INDEX idx_status     (status),
  INDEX idx_start_time (start_time),
  INDEX idx_booking_code (booking_code)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE: parking_history
-- ============================================================
CREATE TABLE IF NOT EXISTS parking_history (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id        INT UNSIGNED,
  vehicle_id     INT UNSIGNED,
  slot_id        INT UNSIGNED,
  rfid_uid       VARCHAR(50),
  booking_id     INT UNSIGNED COMMENT 'NULL if walk-in',
  entry_time     DATETIME NOT NULL,
  exit_time      DATETIME,
  duration       INT COMMENT 'Duration in minutes (calculated on exit)',
  fee            DECIMAL(10,2) COMMENT 'Actual fee charged',
  payment_status ENUM('PENDING','PAID','FAILED','REFUNDED') NOT NULL DEFAULT 'PENDING',
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)    REFERENCES users(id)          ON DELETE SET NULL,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)       ON DELETE SET NULL,
  FOREIGN KEY (slot_id)    REFERENCES parking_slots(id)  ON DELETE SET NULL,
  FOREIGN KEY (booking_id) REFERENCES bookings(id)       ON DELETE SET NULL,
  INDEX idx_user_id       (user_id),
  INDEX idx_vehicle_id    (vehicle_id),
  INDEX idx_entry_time    (entry_time),
  INDEX idx_payment_status (payment_status),
  INDEX idx_rfid_uid      (rfid_uid)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE: transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED NOT NULL,
  type         ENUM('TOP_UP','BOOKING_PAYMENT','PARKING_PAYMENT','REFUND') NOT NULL,
  amount       DECIMAL(15,2) NOT NULL COMMENT 'Positive=credit, Negative=debit',
  description  VARCHAR(255),
  status       ENUM('SUCCESS','FAILED','PENDING') NOT NULL DEFAULT 'SUCCESS',
  reference_id INT UNSIGNED COMMENT 'booking_id or history_id reference',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_type    (type),
  INDEX idx_created (created_at)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE: devices
-- ============================================================
CREATE TABLE IF NOT EXISTS devices (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  device_code      VARCHAR(50) NOT NULL UNIQUE COMMENT 'e.g. ESP32_1, ESP32_2',
  device_type      ENUM('ESP32','SENSOR','SERVO','RFID_READER','RELAY','CAMERA','OTHER') NOT NULL,
  name             VARCHAR(100) NOT NULL,
  location         VARCHAR(100),
  status           ENUM('ONLINE','OFFLINE','ERROR') NOT NULL DEFAULT 'OFFLINE',
  last_seen        TIMESTAMP NULL,
  ip_address       VARCHAR(45),
  firmware_version VARCHAR(20),
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_device_code (device_code),
  INDEX idx_status      (status)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE: device_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS device_logs (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  device_id INT UNSIGNED NOT NULL,
  event     VARCHAR(100) NOT NULL,
  data      JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  INDEX idx_device_id (device_id),
  INDEX idx_created   (created_at)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE: system_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS system_logs (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED,
  action      VARCHAR(50) NOT NULL,
  device_id   INT UNSIGNED,
  description TEXT,
  ip_address  VARCHAR(45),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)   REFERENCES users(id)    ON DELETE SET NULL,
  FOREIGN KEY (device_id) REFERENCES devices(id)  ON DELETE SET NULL,
  INDEX idx_action     (action),
  INDEX idx_user_id    (user_id),
  INDEX idx_created    (created_at)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE: notifications
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
-- TABLE: cameras
-- ============================================================
CREATE TABLE IF NOT EXISTS cameras (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  camera_code VARCHAR(50) NOT NULL UNIQUE COMMENT 'e.g. CAM_IN, CAM_OUT',
  name        VARCHAR(100) NOT NULL,
  location    VARCHAR(100),
  direction   ENUM('IN','OUT','MONITOR') NOT NULL DEFAULT 'IN',
  stream_url  VARCHAR(500) COMMENT 'RTSP or HTTP stream URL',
  status      ENUM('ONLINE','OFFLINE','ERROR') NOT NULL DEFAULT 'OFFLINE',
  last_seen   TIMESTAMP NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_camera_code (camera_code),
  INDEX idx_direction   (direction)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE: camera_records
-- (Unified table — merged duplicate definitions)
-- ============================================================
CREATE TABLE IF NOT EXISTS camera_records (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  camera_id           INT UNSIGNED,
  user_id             INT UNSIGNED COMMENT 'Matched user (NULL if unknown)',
  vehicle_id          INT UNSIGNED COMMENT 'Matched vehicle (NULL if unknown)',
  rfid_uid            VARCHAR(50) COMMENT 'RFID UID paired with this detection',
  plate_number        VARCHAR(20) COMMENT 'Normalized plate number',
  detected_plate      VARCHAR(50) COMMENT 'Raw OCR string from ANPR',
  image_path          VARCHAR(500),
  confidence          DECIMAL(5,4) COMMENT '0.0000 to 1.0000',
  direction           ENUM('IN','OUT') NOT NULL DEFAULT 'IN',
  verification_status ENUM('PENDING','ACCEPTED','REJECTED','MATCHED','MISMATCH','UNKNOWN','LOW_CONFIDENCE','NEED_REVIEW') NOT NULL DEFAULT 'PENDING',
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
-- TABLE: guest_parking_sessions
-- Xe chưa đăng ký tài khoản
-- ============================================================
CREATE TABLE IF NOT EXISTS guest_parking_sessions (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  session_code       VARCHAR(20) NOT NULL UNIQUE,
  license_plate      VARCHAR(20) COMMENT 'Detected plate (may be NULL if not recognized)',
  entry_time         DATETIME NOT NULL,
  exit_time          DATETIME,
  parking_slot       VARCHAR(10) COMMENT 'Slot code assigned',
  status             ENUM('ACTIVE','COMPLETED','ABANDONED') NOT NULL DEFAULT 'ACTIVE',
  duration           INT COMMENT 'Minutes parked',
  amount             DECIMAL(10,2) COMMENT 'Fee to be paid',
  payment_status     ENUM('PENDING','PAID','WAIVED') NOT NULL DEFAULT 'PENDING',
  camera_in_record   INT UNSIGNED COMMENT 'camera_records.id for entry',
  camera_out_record  INT UNSIGNED COMMENT 'camera_records.id for exit',
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (camera_in_record)  REFERENCES camera_records(id) ON DELETE SET NULL,
  FOREIGN KEY (camera_out_record) REFERENCES camera_records(id) ON DELETE SET NULL,
  INDEX idx_license_plate (license_plate),
  INDEX idx_status        (status),
  INDEX idx_entry_time    (entry_time)
) ENGINE=InnoDB;

-- ============================================================
-- SEED DATA
-- ============================================================

-- Admin account (password: Admin@123456)
INSERT INTO users (name, email, phone, password, role, wallet_balance, status) VALUES
('Administrator', 'admin@smartparking.com', '0901234567',
 '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3A2gVqCnfu',
 'ADMIN', 0.00, 'ACTIVE');

-- Demo user (password: User@123456)
INSERT INTO users (name, email, phone, password, role, wallet_balance, status) VALUES
('Nguyễn Văn A', 'user@smartparking.com', '0987654321',
 '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3A2gVqCnfu',
 'USER', 500000.00, 'ACTIVE');

-- Parking rates
INSERT INTO parking_rates (vehicle_type, price_per_hour, minimum_fee, maximum_fee, status) VALUES
('CAR',       10000.00, 10000.00, 200000.00, 'ACTIVE'),
('MOTORBIKE',  5000.00,  5000.00, 100000.00, 'ACTIVE'),
('TRUCK',     20000.00, 20000.00, 500000.00, 'ACTIVE');

-- Parking slots: A01-A06 (real sensors via ESP32 #1)
INSERT INTO parking_slots (slot_code, zone, status, sensor_id, is_virtual) VALUES
('A01', 'A', 'FREE', 'IR_SENSOR_1', 0),
('A02', 'A', 'FREE', 'IR_SENSOR_2', 0),
('A03', 'A', 'FREE', 'IR_SENSOR_3', 0),
('A04', 'A', 'FREE', 'IR_SENSOR_4', 0),
('A05', 'A', 'FREE', 'IR_SENSOR_5', 0),
('A06', 'A', 'FREE', 'IR_SENSOR_6', 0);

-- Demo/virtual slots (no real sensor - for UI illustration only)
INSERT INTO parking_slots (slot_code, zone, status, sensor_id, is_virtual) VALUES
('B01', 'B', 'DISABLED', NULL, 1),
('B02', 'B', 'DISABLED', NULL, 1),
('B03', 'B', 'DISABLED', NULL, 1),
('B04', 'B', 'DISABLED', NULL, 1);

-- Devices: 2 ESP32 boards
INSERT INTO devices (device_code, device_type, name, location, status) VALUES
('ESP32_1', 'ESP32', 'ESP32 #1 - Slot Sensors',    'Bãi xe khu A', 'OFFLINE'),
('ESP32_2', 'ESP32', 'ESP32 #2 - Gate Controller', 'Cổng vào/ra',  'OFFLINE');

-- Cameras: IN and OUT
INSERT INTO cameras (camera_code, name, location, direction, status) VALUES
('CAM_IN',  'Camera Cổng Vào', 'Cổng vào bãi xe', 'IN',  'OFFLINE'),
('CAM_OUT', 'Camera Cổng Ra',  'Cổng ra bãi xe',  'OUT', 'OFFLINE');

-- Demo vehicle for the demo user (user_id = 2)
INSERT INTO vehicles (user_id, plate_number, vehicle_type, vehicle_name, color, rfid_uid, is_default, status) VALUES
(2, '51A12345', 'CAR', 'Toyota Vios', 'Trắng', 'A1:B2:C3:D4', 1, 'ACTIVE');

-- RFID card for demo vehicle
INSERT INTO rfid_cards (uid, user_id, vehicle_id, status) VALUES
('A1:B2:C3:D4', 2, 1, 'ACTIVE');

-- Welcome notification for demo user
INSERT INTO notifications (user_id, title, message, type, is_read) VALUES
(2, 'Chào mừng đến Smart Parking!', 'Tài khoản của bạn đã được tạo thành công. Chúc bạn gửi xe vui vẻ!', 'SUCCESS', 0);

-- ============================================================
-- VIEWS (for convenience)
-- ============================================================

-- View: Active parking sessions
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

-- View: Slot status overview
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
-- END OF SCHEMA
-- ============================================================
