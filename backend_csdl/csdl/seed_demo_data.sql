-- ============================================================
-- SMART PARKING — DỮ LIỆU MẪU ĐẦY ĐỦ CHO TẤT CẢ CÁC BẢNG
-- Chạy file này trong MySQL Workbench nếu muốn nạp lại dữ liệu thử
-- ============================================================

USE smart_parking;

-- 1. Thêm người dùng mẫu (mật khẩu: User@123456)
INSERT IGNORE INTO users (name, email, phone, password, role, wallet_balance, status) VALUES
('Trần Thị Mai', 'mai.tran@gmail.com', '0912345678', '$2a$12$ZqC2z283K7lFj1N5Z5v03uA1b91mYy55Q6x8hDrt2f1K5X1e8M42O', 'USER', 350000.00, 'ACTIVE'),
('Lê Hoàng Long', 'long.le@gmail.com', '0933445566', '$2a$12$ZqC2z283K7lFj1N5Z5v03uA1b91mYy55Q6x8hDrt2f1K5X1e8M42O', 'USER', 120000.00, 'ACTIVE'),
('Phạm Minh Đức', 'duc.pham@gmail.com', '0977889900', '$2a$12$ZqC2z283K7lFj1N5Z5v03uA1b91mYy55Q6x8hDrt2f1K5X1e8M42O', 'USER', 750000.00, 'ACTIVE'),
('Vũ Thanh Hằng', 'hang.vu@gmail.com', '0944556677', '$2a$12$ZqC2z283K7lFj1N5Z5v03uA1b91mYy55Q6x8hDrt2f1K5X1e8M42O', 'USER', 20000.00, 'ACTIVE');

-- 2. Thêm xe liên kết người dùng
INSERT IGNORE INTO vehicles (user_id, plate_number, vehicle_type, vehicle_name, color, rfid_uid, is_default, status)
SELECT u.id, '51A12345', 'CAR', 'Toyota Vios 2022', 'Trắng', 'RFID_A1B2C3D4', 1, 'ACTIVE'
FROM users u WHERE u.email = 'user@smartparking.com' LIMIT 1;

INSERT IGNORE INTO vehicles (user_id, plate_number, vehicle_type, vehicle_name, color, rfid_uid, is_default, status)
SELECT u.id, '30F98765', 'CAR', 'Mazda 3', 'Đỏ', 'RFID_E5F6G7H8', 1, 'ACTIVE'
FROM users u WHERE u.email = 'mai.tran@gmail.com' LIMIT 1;

INSERT IGNORE INTO vehicles (user_id, plate_number, vehicle_type, vehicle_name, color, rfid_uid, is_default, status)
SELECT u.id, '29B45678', 'CAR', 'Hyundai Tucson', 'Đen', 'RFID_I9J0K1L2', 1, 'ACTIVE'
FROM users u WHERE u.email = 'long.le@gmail.com' LIMIT 1;

INSERT IGNORE INTO vehicles (user_id, plate_number, vehicle_type, vehicle_name, color, rfid_uid, is_default, status)
SELECT u.id, '59T188888', 'MOTORBIKE', 'Honda SH 150i', 'Xám xi măng', 'RFID_M3N4O5P6', 1, 'ACTIVE'
FROM users u WHERE u.email = 'duc.pham@gmail.com' LIMIT 1;

-- 3. Cập nhật thẻ RFID
INSERT IGNORE INTO rfid_cards (uid, user_id, vehicle_id, status)
SELECT v.rfid_uid, v.user_id, v.id, 'ACTIVE' FROM vehicles v WHERE v.rfid_uid IS NOT NULL;

-- 4. Cập nhật trạng thái slot bãi đỗ thực tế
UPDATE parking_slots SET status = 'OCCUPIED' WHERE slot_code IN ('A01', 'A02');
UPDATE parking_slots SET status = 'RESERVED' WHERE slot_code = 'A03';
UPDATE parking_slots SET status = 'FREE' WHERE slot_code IN ('A04', 'A05', 'A06', 'B01', 'B02');
UPDATE parking_slots SET status = 'DISABLED' WHERE slot_code IN ('B03', 'B04');
