-- ============================================================
-- SMART PARKING SYSTEM — SCRIPT RESET BÃI XE VỀ TRỐNG HẾT
-- & HỖ TRỢ CẬP NHẬT BIỂN SỐ + THẺ RFID THỰC TẾ
-- ============================================================

USE smart_parking;

-- ------------------------------------------------------------
-- BƯỚC 1: RESET TOÀN BỘ CHỖ ĐỖ XE VỀ TRẠNG THÁI TRỐNG (FREE)
-- ------------------------------------------------------------
-- Đưa tất cả các ô từ A01 đến A06 và ô ảo (trừ DISABLED) về FREE
UPDATE parking_slots 
SET status = 'FREE' 
WHERE status != 'DISABLED';

-- Kết thúc các phiên đỗ xe đang dở dang (để xe không bị coi là đang kẹt trong bãi)
UPDATE parking_history 
SET check_out = NOW(), fee = 0, payment_status = 'PAID', status = 'COMPLETED' 
WHERE check_out IS NULL;

-- Kết thúc các phiên khách vãng lai
UPDATE guest_parking_sessions 
SET checkout_time = NOW(), status = 'COMPLETED' 
WHERE checkout_time IS NULL;

-- Hủy hoặc hoàn tất các đơn đặt chỗ cũ để không chiếm giữ slot
UPDATE bookings 
SET status = 'CANCELLED' 
WHERE status IN ('CONFIRMED', 'ACTIVE', 'PENDING');

-- Xóa log quét camera gần đây để tránh nhận diện cũ
DELETE FROM camera_records WHERE captured_at > DATE_SUB(NOW(), INTERVAL 1 HOUR);

-- Đảm bảo ví người dùng demo có đủ tiền test (500.000 đ)
UPDATE users 
SET wallet_balance = 500000.00 
WHERE email = 'user1@gmail.com';

-- ------------------------------------------------------------
-- BƯỚC 2: CẬP NHẬT BIỂN SỐ VÀ THẺ RFID THỰC TẾ
-- (HÃY SỬA 2 GIÁ TRỊ DƯỚI ĐÂY THEO THỰC TẾ CỦA BẠN RỒI CHẠY)
-- ------------------------------------------------------------
SET @real_email := 'user1@gmail.com';
SET @real_plate := '30A-999.99';    -- << ĐIỀN BIỂN SỐ XE THẬT CỦA BẠN VÀO ĐÂY
SET @real_rfid  := '33:7B:A2:14';   -- << ĐIỀN MÃ THẺ RFID THẬT (IN TRÊN SERIAL HOẶC OLED) VÀO ĐÂY

-- Lấy ID user và xe
SET @uid := (SELECT id FROM users WHERE email = @real_email LIMIT 1);
SET @vid := (SELECT id FROM vehicles WHERE user_id = @uid ORDER BY is_default DESC, id ASC LIMIT 1);

-- Cập nhật biển số và RFID cho xe của user
UPDATE vehicles 
SET plate_number = @real_plate, rfid_uid = @real_rfid 
WHERE id = @vid;

-- Cập nhật bảng rfid_cards
INSERT INTO rfid_cards (uid, user_id, vehicle_id, status)
VALUES (@real_rfid, @uid, @vid, 'ACTIVE')
ON DUPLICATE KEY UPDATE 
  user_id = @uid,
  vehicle_id = @vid,
  status = 'ACTIVE';

-- Kiểm tra lại kết quả
SELECT u.name, u.email, u.wallet_balance, v.plate_number, v.rfid_uid 
FROM users u 
JOIN vehicles v ON u.id = v.user_id 
WHERE u.email = @real_email;

SELECT slot_code, zone, status, is_virtual FROM parking_slots;
