-- ============================================================
-- SMART PARKING SYSTEM — DỮ LIỆU DEMO ĐẦY ĐỦ CHO TEST APP MOBILE
-- Tương thích 100% MySQL Workbench, phpMyAdmin, DBeaver, Command Line
-- Tài khoản demo chính: user1@gmail.com / 123456
-- ============================================================

USE smart_parking;

-- ============================================================
-- 1. TÀI KHOẢN NGƯỜI DÙNG DEMO
-- Email: user1@gmail.com | Mật khẩu: 123456
-- ============================================================
INSERT INTO users (name, email, phone, password, role, wallet_balance, status)
VALUES (
  'Người dùng Demo',
  'user1@gmail.com',
  '0912345678',
  '$2a$12$XQpyZYp9g4GXRbjrq66pkOHu/gq27yhnXrwufuZ2zdkmTjHr2sdhW', -- hash của 123456
  'USER',
  470000.00,
  'ACTIVE'
)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  phone = VALUES(phone),
  wallet_balance = 470000.00,
  status = 'ACTIVE';

-- Lấy ID của user demo vào biến session @demo_user_id
SET @demo_user_id := (SELECT id FROM users WHERE email = 'user1@gmail.com' LIMIT 1);

-- Thêm các user phụ để hệ thống phong phú
INSERT IGNORE INTO users (name, email, phone, password, role, wallet_balance, status) VALUES
('Nguyễn Văn A', 'user@smartparking.com', '0987654321', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3A2gVqCnfu', 'USER', 500000.00, 'ACTIVE'),
('Trần Thị Mai', 'mai.tran@gmail.com', '0912345678', '$2a$12$ZqC2z283K7lFj1N5Z5v03uA1b91mYy55Q6x8hDrt2f1K5X1e8M42O', 'USER', 350000.00, 'ACTIVE'),
('Lê Hoàng Long', 'long.le@gmail.com', '0933445566', '$2a$12$ZqC2z283K7lFj1N5Z5v03uA1b91mYy55Q6x8hDrt2f1K5X1e8M42O', 'USER', 120000.00, 'ACTIVE'),
('Phạm Minh Đức', 'duc.pham@gmail.com', '0977889900', '$2a$12$ZqC2z283K7lFj1N5Z5v03uA1b91mYy55Q6x8hDrt2f1K5X1e8M42O', 'USER', 750000.00, 'ACTIVE');

-- ============================================================
-- 2. DANH SÁCH XE CỦA USER DEMO (Ô tô, Xe máy, Xe điện)
-- ============================================================
-- Xe 1: Mazda CX-5 (Mặc định - Ô tô)
INSERT INTO vehicles (user_id, plate_number, vehicle_type, vehicle_name, color, rfid_uid, is_default, status)
VALUES (@demo_user_id, '30A-688.88', 'CAR', 'Mazda CX-5', 'Đỏ pha lê', 'RFID_DEMO_01', 1, 'ACTIVE')
ON DUPLICATE KEY UPDATE 
  user_id = @demo_user_id,
  vehicle_name = VALUES(vehicle_name),
  color = VALUES(color),
  is_default = 1,
  status = 'ACTIVE';

-- Xe 2: Honda SH 150i (Xe máy)
INSERT INTO vehicles (user_id, plate_number, vehicle_type, vehicle_name, color, rfid_uid, is_default, status)
VALUES (@demo_user_id, '29B1-999.99', 'MOTORBIKE', 'Honda SH 150i', 'Trắng ngọc trai', 'RFID_DEMO_02', 0, 'ACTIVE')
ON DUPLICATE KEY UPDATE 
  user_id = @demo_user_id,
  vehicle_name = VALUES(vehicle_name),
  color = VALUES(color),
  status = 'ACTIVE';

-- Xe 3: VinFast VF8 (Ô tô điện)
INSERT INTO vehicles (user_id, plate_number, vehicle_type, vehicle_name, color, rfid_uid, is_default, status)
VALUES (@demo_user_id, '30E-999.88', 'CAR', 'VinFast VF8', 'Xanh lục bảo', 'RFID_DEMO_03', 0, 'ACTIVE')
ON DUPLICATE KEY UPDATE 
  user_id = @demo_user_id,
  vehicle_name = VALUES(vehicle_name),
  color = VALUES(color),
  status = 'ACTIVE';

-- Lưu ID các xe vào biến session
SET @v_car_id   := (SELECT id FROM vehicles WHERE plate_number = '30A-688.88' LIMIT 1);
SET @v_bike_id  := (SELECT id FROM vehicles WHERE plate_number = '29B1-999.99' LIMIT 1);
SET @v_vf8_id   := (SELECT id FROM vehicles WHERE plate_number = '30E-999.88' LIMIT 1);

-- ============================================================
-- 3. THẺ RFID TƯƠNG ỨNG
-- ============================================================
INSERT INTO rfid_cards (uid, user_id, vehicle_id, status) VALUES
('RFID_DEMO_01', @demo_user_id, @v_car_id, 'ACTIVE'),
('RFID_DEMO_02', @demo_user_id, @v_bike_id, 'ACTIVE'),
('RFID_DEMO_03', @demo_user_id, @v_vf8_id, 'ACTIVE')
ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), vehicle_id = VALUES(vehicle_id), status = 'ACTIVE';

-- ============================================================
-- 4. CHỖ ĐỖ XE (PARKING SLOTS)
-- ============================================================
INSERT IGNORE INTO parking_slots (slot_code, zone, status, sensor_id, is_virtual) VALUES
('A01', 'A', 'OCCUPIED', 'IR_SENSOR_1', 0),
('A02', 'A', 'FREE',     'IR_SENSOR_2', 0),
('A03', 'A', 'FREE',     'IR_SENSOR_3', 0),
('A04', 'A', 'RESERVED', 'IR_SENSOR_4', 0),
('A05', 'A', 'FREE',     'IR_SENSOR_5', 0),
('A06', 'A', 'FREE',     'IR_SENSOR_6', 0),
('B01', 'B', 'FREE',     NULL,          1),
('B02', 'B', 'FREE',     NULL,          1),
('B03', 'B', 'DISABLED', NULL,          1),
('B04', 'B', 'DISABLED', NULL,          1);

UPDATE parking_slots SET status = 'OCCUPIED' WHERE slot_code = 'A01';
UPDATE parking_slots SET status = 'RESERVED' WHERE slot_code = 'A04';
UPDATE parking_slots SET status = 'FREE' WHERE slot_code IN ('A02', 'A03', 'A05', 'A06', 'B01', 'B02');

-- Lấy ID các slots vào biến session
SET @slot_a01 := (SELECT id FROM parking_slots WHERE slot_code = 'A01' LIMIT 1);
SET @slot_a02 := (SELECT id FROM parking_slots WHERE slot_code = 'A02' LIMIT 1);
SET @slot_a03 := (SELECT id FROM parking_slots WHERE slot_code = 'A03' LIMIT 1);
SET @slot_a04 := (SELECT id FROM parking_slots WHERE slot_code = 'A04' LIMIT 1);
SET @slot_a05 := (SELECT id FROM parking_slots WHERE slot_code = 'A05' LIMIT 1);
SET @slot_b01 := (SELECT id FROM parking_slots WHERE slot_code = 'B01' LIMIT 1);
SET @slot_b02 := (SELECT id FROM parking_slots WHERE slot_code = 'B02' LIMIT 1);

-- ============================================================
-- 5. ĐẶT CHỖ (BOOKINGS) - CÓ ĐỦ: ACTIVE, COMPLETED, CANCELLED
-- ============================================================
-- Hủy/Hết hạn các booking cũ trùng slot để tránh xung đột
UPDATE bookings SET status = 'EXPIRED' 
WHERE slot_id = @slot_a04 AND status IN ('CONFIRMED','ACTIVE') AND booking_code != 'BK315764670';

-- Đặt chỗ 1: Đang có hiệu lực (CONFIRMED) vị trí A04 (Hôm nay)
INSERT INTO bookings (booking_code, user_id, vehicle_id, slot_id, start_time, end_time, duration, unit_price, total_price, status)
VALUES ('BK315764670', @demo_user_id, @v_car_id, @slot_a04, NOW(), DATE_ADD(NOW(), INTERVAL 3 HOUR), 3.0, 10000.00, 30000.00, 'CONFIRMED')
ON DUPLICATE KEY UPDATE 
  user_id = @demo_user_id,
  vehicle_id = @v_car_id,
  slot_id = @slot_a04,
  status = 'CONFIRMED';

-- Đặt chỗ 2: Đã hoàn tất (COMPLETED) 2 ngày trước tại A02
INSERT INTO bookings (booking_code, user_id, vehicle_id, slot_id, start_time, end_time, duration, unit_price, total_price, status)
VALUES ('BK20260901234', @demo_user_id, @v_car_id, @slot_a02, DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 46 HOUR), 2.0, 10000.00, 20000.00, 'COMPLETED')
ON DUPLICATE KEY UPDATE 
  user_id = @demo_user_id,
  vehicle_id = @v_car_id,
  slot_id = @slot_a02,
  status = 'COMPLETED';

-- Đặt chỗ 3: Đã hủy (CANCELLED) 5 ngày trước tại B01
INSERT INTO bookings (booking_code, user_id, vehicle_id, slot_id, start_time, end_time, duration, unit_price, total_price, status)
VALUES ('BK20260905678', @demo_user_id, @v_vf8_id, @slot_b01, DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 117 HOUR), 3.0, 10000.00, 30000.00, 'CANCELLED')
ON DUPLICATE KEY UPDATE 
  user_id = @demo_user_id,
  vehicle_id = @v_vf8_id,
  slot_id = @slot_b01,
  status = 'CANCELLED';

-- ============================================================
-- 6. LƯỢT GỬI XE (PARKING HISTORY)
-- ============================================================
DELETE FROM parking_history WHERE user_id = @demo_user_id;

-- Lượt 1: Xe Mazda CX-5 ĐANG ĐỖ tại A01 (chưa check-out -> status PENDING)
INSERT INTO parking_history (user_id, vehicle_id, slot_id, rfid_uid, entry_time, exit_time, duration, fee, payment_status)
VALUES (@demo_user_id, @v_car_id, @slot_a01, 'RFID_DEMO_01', DATE_SUB(NOW(), INTERVAL 45 MINUTE), NULL, NULL, NULL, 'PENDING');

-- Lượt 2: Gửi xe A05 hôm qua (đã hoàn thành, 180 phút, 40.000 VNĐ)
INSERT INTO parking_history (user_id, vehicle_id, slot_id, rfid_uid, entry_time, exit_time, duration, fee, payment_status)
VALUES (@demo_user_id, @v_car_id, @slot_a05, 'RFID_DEMO_01', DATE_SUB(NOW(), INTERVAL 26 HOUR), DATE_SUB(NOW(), INTERVAL 23 HOUR), 180, 40000.00, 'PAID');

-- Lượt 3: Gửi xe máy B02 3 ngày trước (đã hoàn thành, 180 phút, 20.000 VNĐ)
INSERT INTO parking_history (user_id, vehicle_id, slot_id, rfid_uid, entry_time, exit_time, duration, fee, payment_status)
VALUES (@demo_user_id, @v_bike_id, @slot_b02, 'RFID_DEMO_02', DATE_SUB(NOW(), INTERVAL 72 HOUR), DATE_SUB(NOW(), INTERVAL 69 HOUR), 180, 20000.00, 'PAID');

-- Lượt 4: Gửi xe điện A03 5 ngày trước (đã hoàn thành, 240 phút, 40.000 VNĐ)
INSERT INTO parking_history (user_id, vehicle_id, slot_id, rfid_uid, entry_time, exit_time, duration, fee, payment_status)
VALUES (@demo_user_id, @v_vf8_id, @slot_a03, 'RFID_DEMO_03', DATE_SUB(NOW(), INTERVAL 120 HOUR), DATE_SUB(NOW(), INTERVAL 116 HOUR), 240, 40000.00, 'PAID');

-- ============================================================
-- 7. GIAO DỊCH VÍ (TRANSACTIONS)
-- ============================================================
DELETE FROM transactions WHERE user_id = @demo_user_id;

-- Nạp tiền VNPay (+500.000 VNĐ)
INSERT INTO transactions (user_id, type, amount, description, status, created_at)
VALUES (@demo_user_id, 'TOP_UP', 500000.00, 'Nạp tiền vào ví qua VNPay', 'SUCCESS', DATE_SUB(NOW(), INTERVAL 5 DAY));

-- Thanh toán gửi xe A05 (-40.000 VNĐ)
INSERT INTO transactions (user_id, type, amount, description, status, created_at)
VALUES (@demo_user_id, 'PARKING_PAYMENT', -40000.00, 'Thanh toán phí gửi xe A05 (3 giờ)', 'SUCCESS', DATE_SUB(NOW(), INTERVAL 23 HOUR));

-- Thanh toán gửi xe máy B02 (-20.000 VNĐ)
INSERT INTO transactions (user_id, type, amount, description, status, created_at)
VALUES (@demo_user_id, 'PARKING_PAYMENT', -20000.00, 'Thanh toán phí gửi xe B02 (Xe máy)', 'SUCCESS', DATE_SUB(NOW(), INTERVAL 69 HOUR));

-- Hoàn tiền hủy đặt chỗ B01 (+30.000 VNĐ)
INSERT INTO transactions (user_id, type, amount, description, status, created_at)
VALUES (@demo_user_id, 'REFUND', 30000.00, 'Hoàn tiền hủy đặt chỗ B01', 'SUCCESS', DATE_SUB(NOW(), INTERVAL 117 HOUR));

-- Nạp tiền ví qua ngân hàng Techcombank QR (+200.000 VNĐ)
INSERT INTO transactions (user_id, type, amount, description, status, created_at)
VALUES (@demo_user_id, 'TOP_UP', 200000.00, 'Nạp tiền ví qua Chuyển khoản QR Techcombank', 'SUCCESS', DATE_SUB(NOW(), INTERVAL 7 DAY));

-- Thanh toán đặt chỗ trước vị trí A04 (-30.000 VNĐ)
INSERT INTO transactions (user_id, type, amount, description, status, created_at)
VALUES (@demo_user_id, 'BOOKING_PAYMENT', -30000.00, 'Thanh toán đặt chỗ trước vị trí A04 (BK315764670)', 'SUCCESS', DATE_SUB(NOW(), INTERVAL 2 HOUR));

-- ============================================================
-- 8. THÔNG BÁO (NOTIFICATIONS)
-- ============================================================
DELETE FROM notifications WHERE user_id = @demo_user_id;

INSERT INTO notifications (user_id, title, message, type, is_read, created_at) VALUES
(@demo_user_id, '🚗 Xe đã vào bãi an toàn', 'Xe Mazda CX-5 (30A-688.88) vừa check-in qua Cổng vào lúc 15:30 tại vị trí A01.', 'INFO', 0, DATE_SUB(NOW(), INTERVAL 45 MINUTE)),
(@demo_user_id, '🎟️ Đặt chỗ thành công', 'Mã đặt chỗ BK315764670 cho vị trí A04 đã được kích hoạt. Chúc bạn một ngày tốt lành!', 'SUCCESS', 0, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(@demo_user_id, '💰 Biến động số dư', 'Ví thông minh của bạn đã trừ 30.000 VNĐ cho giao dịch đặt chỗ trước A04.', 'INFO', 0, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(@demo_user_id, '✅ Thanh toán xuất bãi thành công', 'Xe Mazda CX-5 (30A-688.88) đã xuất bãi A05. Phí gửi xe: 40.000 VNĐ đã tự động trừ từ ví.', 'SUCCESS', 1, DATE_SUB(NOW(), INTERVAL 23 HOUR)),
(@demo_user_id, '💳 Nạp tiền thành công', 'Tài khoản ví của bạn đã được cộng 500.000 VNĐ qua cổng thanh toán trực tuyến VNPay.', 'SUCCESS', 1, DATE_SUB(NOW(), INTERVAL 5 DAY)),
(@demo_user_id, '📢 Bảo trì hệ thống định kỳ', 'Ban quản lý bãi xe thông minh sẽ bảo trì cụm cảm biến Khu B từ 00:00 - 02:00 Chủ nhật.', 'ALERT', 1, DATE_SUB(NOW(), INTERVAL 6 DAY));

-- ============================================================
-- HOÀN TẤT NẠP DỮ LIỆU DEMO!
-- ============================================================
SELECT 'SEED DEMO DATA COMPLETED SUCCESSFULLY!' AS result;
