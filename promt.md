PROMPT TỔNG THỂ — HỆ THỐNG BÃI ĐỖ XE THÔNG MINH
(Bản hợp nhất & sửa lỗi — dùng cho đồ án demo với 1 máy tính + 1 điện thoại)
Tôi muốn xây dựng một hệ thống BÃI ĐỖ XE THÔNG MINH (SMART PARKING SYSTEM) bao gồm phần cứng IoT, Web Admin, Mobile App cho người dùng, Backend Server và Database.
Mục tiêu:
●Quản lý trạng thái chỗ đỗ xe theo thời gian thực.
●Cho phép người dùng xem và đặt chỗ đỗ xe.
●Quản lý tài khoản, phương tiện và ví điện tử mô phỏng.
●Sử dụng RFID để xác thực khi xe vào/ra, kết hợp nhận diện biển số bằng webcam (ANPR).
●Tự động điều khiển barrier (mở khi xác thực hợp lệ, tự đóng khi xe đã đi qua).
●Quản lý đèn bãi xe.
●Lưu lịch sử gửi xe.
●Tính phí gửi xe.
●Admin quản lý toàn bộ hệ thống.
●Người dùng chỉ được truy cập các chức năng dành cho User.
●Không sử dụng Keypad/PIN, không dùng LED báo riêng cho từng vị trí.
GHI CHÚ SỬA: Đây là bản hợp nhất: đã áp dụng phần đính chính về phần cứng (2 ESP32) và camera (2 webcam) ở cuối bản gốc làm chuẩn, xoá các mô tả cũ mâu thuẫn (1 ESP32, camera chung chung), và bỏ bớt các yêu cầu chống trùng lịch phức tạp vì đồ án chỉ chạy trên 1 máy tính + 1 điện thoại nên không có thao tác đặt chỗ đồng thời thật sự.
1. KIẾN TRÚC TỔNG THỂ
Hệ thống gồm các thành phần chính:
●ESP32 #1 — quản lý 6 cảm biến IR cho 6 vị trí đỗ xe A01–A06.
●ESP32 #2 — quản lý cổng IN/OUT: 2 đầu đọc RFID RC522, 2 servo barie, 2 cảm biến IR phát hiện xe đã đi qua barie, 1 relay điều khiển đèn.
●2 Webcam (IN, OUT) — kết nối với PC/Raspberry Pi chạy dịch vụ ANPR/LPR, KHÔNG kết nối trực tiếp ESP32.
●Backend Server Node.js (Express).
●MySQL Database.
●Web Admin (html,css,JavaScript).
●Mobile App User (java android).
Luồng dữ liệu (đã sửa cho đúng 2 ESP32 + webcam):
●Cảm biến IR / RFID / Servo / Relay  →  ESP32 #1 hoặc ESP32 #2  →  MQTT  →  Node.js Backend  →  MySQL
●Webcam IN/OUT  →  PC/Raspberry Pi (dịch vụ ANPR)  →  HTTP API  →  Node.js Backend  →  MySQL
●Node.js Backend  →  WebSocket/Socket.IO  →  Web Admin & Mobile App (cập nhật real-time)
●Web Admin / Mobile App  →  Node.js Backend  →  MQTT  →  ESP32 (điều khiển)
Hệ thống phải hỗ trợ cập nhật trạng thái chỗ đỗ xe theo thời gian thực.
2. PHÂN QUYỀN NGƯỜI DÙNG
Có 2 loại tài khoản: USER và ADMIN.
USER có thể:
●Đăng ký / Đăng nhập / Đăng xuất / Quên mật khẩu.
●Xem và cập nhật thông tin cá nhân.
●Quản lý phương tiện: thêm / sửa / xóa biển số xe, đặt xe mặc định.
●Xem số dư ví, nạp tiền mô phỏng, xem lịch sử giao dịch.
●Xem bãi đỗ xe, xem trạng thái chỗ đỗ.
●Đặt chỗ: chọn khu vực, chỗ đỗ, ngày/giờ đến, số giờ gửi, xem giá, xác nhận đặt chỗ.
●Hủy đặt chỗ theo điều kiện hệ thống.
●Xem mã đặt chỗ, lịch sử đặt chỗ, lịch sử gửi xe (chỉ của chính mình), thời gian vào/ra, phí gửi xe, trạng thái đặt chỗ.
ADMIN có toàn quyền quản lý:
●Dashboard, Bãi đỗ xe, Chỗ đỗ xe, User, Phương tiện, Booking.
●Lịch sử gửi xe, Thanh toán.
●Thiết bị IoT, Barrier, Đèn, RFID, Camera/ANPR.
●Thống kê, Cấu hình hệ thống, Nhật ký hoạt động.
3. USER MOBILE APP
Thiết kế Mobile App dành cho người dùng, giao diện hiện đại, dễ sử dụng, tiếng Việt.
Thanh điều hướng phía dưới gồm:
●1. Trang chủ
●2. Đặt chỗ
●3. Lịch sử
●4. Ví
●5. Tài khoản
4. TRANG CHỦ USER
Trang chủ hiển thị:
●Xin chào + tên người dùng.
●Số dư ví.
●Tổng số chỗ trống / đang sử dụng / đang được đặt.
●Trạng thái bãi xe, trạng thái hệ thống.
●Sơ đồ bãi đỗ xe.
Màu trạng thái:
●XANH = Chỗ trống.
●ĐỎ = Đang có xe.
●CAM = Đã được đặt.
●XÁM = Không hoạt động.
Người dùng có thể bấm vào từng chỗ để xem: mã chỗ, khu vực, trạng thái, thời gian đặt (nếu đã được đặt), giá gửi xe.
5. ĐẶT CHỖ ĐỖ XE
User chọn: khu vực → chỗ đỗ → ngày đến → giờ đến → số giờ gửi.
Hệ thống hiển thị: mã chỗ, thời gian bắt đầu/kết thúc, đơn giá, tổng tiền.
Ví dụ:
●Chỗ A01
●Ngày: 10/09/2026
●Giờ vào: 08:00
●Thời lượng: 3 giờ
●Giá: 10.000 VNĐ/giờ
●Tổng: 30.000 VNĐ
Sau khi người dùng xác nhận, hệ thống thực hiện:
●1. Kiểm tra chỗ còn trống.
●2. Kiểm tra không bị trùng booking trong cùng khung giờ.
●3. Kiểm tra số dư ví.
●4. Trừ tiền trong ví mô phỏng (thanh toán trước theo dự tính).
●5. Tạo booking.
●6. Đổi trạng thái chỗ thành RESERVED.
●7. Sinh mã booking.
●8. Hiển thị thông tin đặt chỗ.
GHI CHÚ SỬA: Vì demo chỉ chạy trên 1 điện thoại (1 người dùng thao tác tại một thời điểm), không cần cơ chế khóa (transaction lock) để chống đặt trùng chỗ đồng thời — chỉ cần kiểm tra logic tuần tự (if trạng thái = FREE thì mới cho đặt) là đủ.
6. BOOKING
Mỗi booking có:
●Booking ID, User ID, Vehicle ID, Parking Slot ID.
●Thời gian đặt, thời gian bắt đầu, thời gian kết thúc, số giờ.
●Đơn giá (unit_price), Tổng tiền (total_price).
●Trạng thái.
Trạng thái: PENDING, CONFIRMED, ACTIVE, COMPLETED, CANCELLED, EXPIRED.
Khi booking hết thời gian mà người dùng chưa vào, hệ thống có thể chuyển thành EXPIRED theo cấu hình.
GHI CHÚ SỬA: Bổ sung 2 trường riêng unit_price và total_price (bản gốc chỉ có 1 trường "price" gây nhầm lẫn giữa đơn giá và tổng tiền).
7. VÍ ĐIỆN TỬ MÔ PHỎNG
Không tích hợp thanh toán thật, chỉ mô phỏng ví điện tử.
User có: số dư, nạp tiền, trừ tiền khi đặt chỗ, trừ/hoàn tiền khi hoàn tất gửi xe nếu có chênh lệch, lịch sử giao dịch.
Các loại giao dịch: TOP_UP, BOOKING_PAYMENT, PARKING_PAYMENT, REFUND.
Mỗi giao dịch lưu: Transaction ID, User ID, số tiền, loại giao dịch, thời gian, nội dung, trạng thái.
8. QUẢN LÝ PHƯƠNG TIỆN
Thông tin: Vehicle ID, biển số xe, loại xe, tên xe, màu xe, RFID Card ID, trạng thái.
Chức năng: thêm xe, sửa xe, xóa xe, đặt xe mặc định. Một tài khoản có thể có nhiều phương tiện.
9. RFID CỔNG VÀO — ESP32 #2
Sử dụng RFID để xác thực xe. KHÔNG sử dụng Keypad/PIN.
Khi xe đến cổng IN:
●1. Người dùng quét RFID.
●2. ESP32 #2 đọc UID RFID.
●3. Gửi UID lên Server qua MQTT.
●4. Server tìm RFID trong Database.
●5. Xác định User và Vehicle.
●6. Kiểm tra booking.
●7. Kiểm tra trạng thái chỗ.
●8. Nếu hợp lệ → gửi lệnh mở barrier IN cho ESP32 #2.
●9. Ghi nhận thời gian vào.
●10. Cập nhật trạng thái xe, booking, lịch sử.
Nếu RFID không hợp lệ: không mở barrier, hiển thị thông báo từ chối, ghi log sự kiện.
10. LOGIC XE VÀO (kèm đóng/mở barie)
A. Có booking hợp lệ:
RFID → xác thực → tìm booking → kiểm tra thời gian → mở barrier → xe vào → ghi thời gian IN.
B. Không có booking:
●Cho phép gửi xe trực tiếp nếu còn chỗ (walk-in), HOẶC từ chối vào — tùy cấu hình Admin.
Logic đóng/mở barie (áp dụng cho cả cổng IN và OUT):
●Mỗi cổng IN/OUT dùng 1 cảm biến IR đặt sau vùng barie để phát hiện xe đã đi qua.
●Khi xác thực xe thành công: ESP32 #2 mở barie.
●Chờ cảm biến IR (sau barie) phát hiện xe đã đi qua.
●Khi xe đã đi qua, ESP32 #2 đóng barie.
●Có timeout an toàn (cấu hình được) — nếu xe không đi qua trong thời gian quy định, tự đóng lại và ghi cảnh báo.
●Không được đóng barie khi cảm biến vẫn đang phát hiện xe ở vùng barie.
GHI CHÚ SỬA: Bản gốc chỉ nói "mở barrier" mà không có bước đóng lại — đã bổ sung toàn bộ logic đóng/mở + timeout theo đúng phần đính chính, và áp dụng luôn cho mục 11, 54, 55.
11. CỔNG RA — ESP32 #2
●1. Xe quét RFID.
●2. ESP32 #2 đọc UID.
●3. Gửi UID lên Server.
●4. Server tìm phiên gửi xe (Parking History).
●5. Xác định thời gian vào/ra, tính thời lượng, tính phí.
●6. Kiểm tra số dư ví nếu cần, hoàn tất thanh toán.
●7. Mở barrier OUT.
●8. Chờ cảm biến IR sau barie phát hiện xe đã qua → đóng barrier OUT (xem logic mục 10).
●9. Ghi thời gian OUT, cập nhật lịch sử.
●10. Giải phóng chỗ đỗ → trạng thái FREE.
12. TÍNH PHÍ GỬI XE
Hệ thống có cấu hình: giá theo giờ, giá theo loại xe, giá tối thiểu (minimum_fee), giá tối đa nếu cần (maximum_fee).
Ví dụ bảng giá:
●0 - 1 giờ: 10.000 VNĐ
●1 - 2 giờ: 20.000 VNĐ
●2 - 3 giờ: 30.000 VNĐ
Có thể cấu hình bảng giá từ Admin.
Nếu người dùng vượt quá thời gian booking: Phí thực tế = thời gian thực tế × đơn giá. Phần tiền đã thanh toán trước đó được đối trừ. Nếu phát sinh thêm tiền: kiểm tra số dư và trừ phần phát sinh; nếu dư thừa thì hoàn tiền (REFUND).
GHI CHÚ SỬA: Bổ sung trường maximum_fee vào bảng parking_rates (bản gốc có nhắc "giá tối đa" trong văn bản nhưng thiếu trong schema).
13. CẢM BIẾN CHỖ ĐỖ — ESP32 #1
Mỗi chỗ đỗ (A01–A06) sử dụng một cảm biến IR, do ESP32 #1 quản lý.
●A01 → IR Sensor 1
●A02 → IR Sensor 2
●...
●A06 → IR Sensor 6
Trạng thái: IR phát hiện xe → OCCUPIED; không phát hiện → FREE. ESP32 #1 gửi dữ liệu lên Server qua MQTT.
14. CẬP NHẬT REAL-TIME
Khi cảm biến thay đổi (FREE ↔ OCCUPIED): ESP32 gửi dữ liệu → Backend cập nhật Database → Server phát sự kiện WebSocket/Socket.IO → Web Admin và Mobile App cập nhật ngay lập tức, không cần F5/reload.
15. QUẢN LÝ TRẠNG THÁI CHỖ ĐỖ
Mỗi Parking Slot có trạng thái: FREE, OCCUPIED, RESERVED, DISABLED.
●FREE: chỗ đang trống.
●OCCUPIED: đang có xe.
●RESERVED: đã được User đặt.
●DISABLED: chỗ tạm ngưng hoạt động.
Hệ thống phải tránh trường hợp: Booking = RESERVED nhưng cảm biến = FREE, hoặc Booking = RESERVED nhưng đã có xe khác chiếm chỗ. Nếu xảy ra xung đột phải tạo cảnh báo cho Admin.
16. ADMIN DASHBOARD
●Tổng số chỗ, chỗ trống, chỗ đang sử dụng, chỗ đã đặt.
●Số xe đang trong bãi.
●Số lượt vào/ra hôm nay.
●Doanh thu hôm nay, doanh thu tháng.
●Số User.
●Trạng thái ESP32 #1, ESP32 #2, Server.
17. ADMIN PARKING MONITORING
Hiển thị sơ đồ bãi xe trực quan với 6 chỗ có cảm biến thật (A01–A06):
A01  A02  A03  A04  A05  A06
Có thể thêm các chỗ ảo khác (ví dụ khu B) chỉ để minh họa khả năng mở rộng giao diện — các chỗ này KHÔNG có cảm biến IR thật, trạng thái phải được đánh dấu rõ (ví dụ set DISABLED hoặc gắn nhãn "DEMO") để không gây hiểu nhầm là có phần cứng thật giám sát.
Mỗi ô hiển thị: mã chỗ, trạng thái, biển số nếu đang có xe, thời gian đặt nếu RESERVED.
Màu: 🟢 FREE · 🔴 OCCUPIED · 🟠 RESERVED · ⚫ DISABLED.
GHI CHÚ SỬA: Bản gốc vẽ sơ đồ demo 20 chỗ (2 khu x 10) trong khi phần cứng chỉ có 6 cảm biến IR thật — đã sửa để khớp với phần cứng, và cho phép thêm chỗ ảo có ghi chú rõ ràng.
18. ADMIN ĐIỀU KHIỂN BARRIER
Admin có quyền điều khiển thủ công Barrier IN và Barrier OUT, có 2 nút: MỞ / ĐÓNG.
Luồng: Web Admin → Node.js → MQTT → ESP32 #2 → Servo.
Trạng thái: OPEN, CLOSED, OPENING, CLOSING, ERROR.
Chế độ thủ công (Admin bấm nút) dùng chung logic servo với chế độ tự động (mục 10), nhưng khi Admin đã mở thủ công thì hệ thống KHÔNG tự đóng theo cảm biến — phải chờ Admin bấm ĐÓNG, để tránh xung đột giữa 2 luồng điều khiển.
Chỉ Admin mới được điều khiển thủ công.
19. ADMIN ĐIỀU KHIỂN ĐÈN
Sử dụng Relay (ESP32 #2) để điều khiển đèn mô hình. Admin có thể bật/tắt đèn, xem trạng thái (ON/OFF).
Có thể bổ sung AUTO MODE / MANUAL MODE — ở Auto Mode có thể điều khiển theo thời gian hoặc điều kiện ánh sáng nếu có cảm biến.
20. QUẢN LÝ THIẾT BỊ IoT
Admin có trang DEVICE MANAGEMENT, danh sách thiết bị kết nối qua MQTT/ESP32:
●ESP32 #1 (quản lý IR Sensor A01–A06).
●ESP32 #2 (quản lý RFID IN, RFID OUT, Servo IN, Servo OUT, IR sau barie IN/OUT, Relay đèn).
Thông tin mỗi thiết bị: Device ID, tên, loại, vị trí, trạng thái, Last Seen, IP, Firmware, ngày kết nối. Trạng thái: ONLINE, OFFLINE, ERROR. Nếu ESP32 mất kết nối: hiển thị cảnh báo, ghi log.
Webcam KHÔNG nằm trong bảng thiết bị IoT này (vì không kết nối qua ESP32/MQTT) — webcam được quản lý riêng ở bảng "cameras" (xem mục 30, 45).
GHI CHÚ SỬA: Cập nhật danh sách thiết bị cho khớp với việc chỉ có 2 ESP32, và tách webcam ra khỏi bảng thiết bị IoT vì nó kết nối qua PC/Raspberry Pi, không qua ESP32.
21. QUẢN LÝ USER
Admin xem danh sách User: ID, họ tên, email, số điện thoại, vai trò, số phương tiện, số dư ví, trạng thái, ngày đăng ký.
Chức năng: xem, tìm kiếm, lọc, khóa/mở khóa tài khoản, chỉnh sửa thông tin. Admin không được xem mật khẩu dạng plaintext.
22. QUẢN LÝ BOOKING
Admin xem toàn bộ booking: Booking ID, User, biển số, chỗ, thời gian bắt đầu/kết thúc, số giờ, tổng tiền, trạng thái.
Chức năng: tìm kiếm, lọc, xem chi tiết, hủy booking, xem lịch sử.
23. LỊCH SỬ GỬI XE
Lưu: Parking History ID, User, Vehicle, biển số, Parking Slot, RFID, thời gian IN/OUT, thời lượng, phí, trạng thái thanh toán.
User chỉ xem lịch sử của mình. Admin xem toàn bộ.
24. THỐNG KÊ
Admin có trang Statistics: số lượt xe theo ngày/tháng, doanh thu theo ngày/tháng, tỷ lệ sử dụng bãi, chỗ được dùng nhiều nhất, khung giờ đông xe, số booking, số lượt vào/ra.
Hiển thị bằng Line Chart, Bar Chart, Pie/Donut Chart, Summary Cards. Có bộ lọc: hôm nay, 7 ngày, 30 ngày, tháng, khoảng thời gian tùy chọn.
25. NHẬT KÝ HỆ THỐNG
Ghi lại: đăng nhập/đăng xuất, RFID được quét, xe vào/ra, barrier mở/đóng, Admin điều khiển barrier/đèn, booking tạo/hủy, thanh toán, ESP32 online/offline, lỗi thiết bị.
Log gồm: Log ID, User, Action, Device, Description, Timestamp, IP nếu cần.
26. THÔNG BÁO
User nhận:
●Đặt chỗ thành công / bị hủy.
●Booking sắp hết hạn.
●Thanh toán thành công.
●Xe đã vào / đã ra.
Admin nhận:
●ESP32 offline.
●RFID không hợp lệ nhiều lần.
●Sensor lỗi.
●Xung đột booking.
●Barrier lỗi.
●Chỗ đỗ bất thường.
27. ĐĂNG NHẬP / BẢO MẬT
Có: Register, Login, Logout, Forgot Password, Role-based access (USER, ADMIN).
User không được truy cập API Admin. Admin mới được: quản lý User, điều khiển thiết bị, xem thống kê toàn hệ thống, quản lý bãi xe.
28. BACKEND NODE.JS
Sử dụng Node.js + Express.js, html css , JavaScript.
Nhóm API:
●AUTH API
●USER API
●VEHICLE API
●PARKING API
●BOOKING API
●PAYMENT API
●RFID API
●DEVICE API
●CAMERA API
●ACCESS API (xác thực RFID + biển số)
●HISTORY API
●STATISTICS API
●ADMIN API
●NOTIFICATION API
Backend chịu trách nhiệm: xác thực, phân quyền, booking, tính phí, quản lý User/Slot/RFID, điều khiển IoT, đồng bộ Database, real-time communication.
29. MQTT / SOCKET.IO
Sử dụng MQTT để giao tiếp Node.js ↔ ESP32 #1 và ESP32 #2.
Ví dụ topic:
●parking/esp32_1/slot/A01 … A06
●parking/esp32_2/gate/in
●parking/esp32_2/gate/out
●parking/esp32_2/rfid/in
●parking/esp32_2/rfid/out
●parking/esp32_2/light
●parking/device/status
Server có thể gửi lệnh:
●OPEN_GATE_IN
●CLOSE_GATE_IN
●OPEN_GATE_OUT
●CLOSE_GATE_OUT
●LIGHT_ON
●LIGHT_OFF
ESP32 gửi:
●SLOT_FREE / SLOT_OCCUPIED (ESP32 #1)
●RFID_DETECTED / GATE_PASSED / GATE_STATUS (ESP32 #2)
●DEVICE_STATUS (heartbeat)
Socket.IO dùng để cập nhật Backend → Web Admin, Backend → Mobile App theo thời gian thực.
30. MYSQL DATABASE
Thiết kế Database gồm các bảng (đã sửa: gộp camera_records còn 1 bản, thêm unit_price/total_price, maximum_fee):
users
●id
●name
●email
●phone
●password
●role
●wallet_balance
●status
●created_at
vehicles
●id
●user_id
●plate_number
●vehicle_type
●color
●rfid_uid
●is_default
●status
parking_slots
●id
●slot_code
●zone
●status
●sensor_id
●is_virtual (true nếu là chỗ demo không có cảm biến thật)
●created_at
bookings
●id
●user_id
●vehicle_id
●slot_id
●start_time
●end_time
●duration
●unit_price
●total_price
●status
●created_at
parking_history
●id
●user_id
●vehicle_id
●slot_id
●rfid_uid
●entry_time
●exit_time
●duration
●fee
●payment_status
transactions
●id
●user_id
●type
●amount
●description
●status
●created_at
rfid_cards
●id
●uid
●user_id
●vehicle_id
●status
●created_at
devices
●id
●device_code
●device_type
●location
●status
●last_seen
device_logs
●id
●device_id
●event
●data
●created_at
system_logs
●id
●user_id
●action
●description
●created_at
parking_rates
●id
●vehicle_type
●price_per_hour
●minimum_fee
●maximum_fee
●status
notifications
●id
●user_id
●title
●message
●type
●is_read
●created_at
cameras
●id
●camera_code
●name
●location
●direction
●stream_url
●status
●last_seen
●created_at
camera_records (bảng DUY NHẤT, gộp 2 bản trùng lặp ở văn bản gốc)
●id
●camera_id
●user_id
●vehicle_id
●rfid_uid
●plate_number (đã chuẩn hoá)
●detected_plate (chuỗi thô AI trả về)
●image_path
●confidence
●direction
●verification_status
●captured_at
●created_at
GHI CHÚ SỬA: Đã gộp 2 định nghĩa camera_records mâu thuẫn nhau ở mục 58 và 61 của bản gốc thành một bảng duy nhất; thêm cột is_virtual cho parking_slots để phân biệt chỗ có cảm biến thật (A01–A06) với chỗ demo/ảo.
31. PHẦN CỨNG (ĐÃ SỬA THEO BẢN ĐÍNH CHÍNH — 2 ESP32 + WEBCAM)
Kiến trúc phần cứng: hệ thống dùng 2 ESP32.
●ESP32 #1: quản lý 6 cảm biến IR tương ứng 6 vị trí đỗ xe A01–A06.
●ESP32 #2: quản lý hệ thống cổng IN/OUT gồm 2 RFID RC522, 2 servo barie, 2 cảm biến IR phát hiện xe đã đi qua barie, và relay điều khiển đèn.
●Hai ESP32 giao tiếp Wi-Fi với Node.js Server thông qua MQTT.
●Không sử dụng keypad.
●Không sử dụng LED báo riêng cho từng vị trí đỗ.
Webcam:
●Webcam IN: chỉ phục vụ nhận diện biển số tại cổng vào.
●Webcam OUT: chỉ phục vụ nhận diện biển số tại cổng ra.
●Webcam KHÔNG kết nối trực tiếp với ESP32; webcam kết nối với PC/Raspberry Pi chạy dịch vụ ANPR/LPR.
●Dịch vụ ANPR gửi kết quả biển số + confidence score về Node.js Server qua HTTP API.
Danh sách linh kiện (Hardware List):
●ESP32 DevKit × 2
●IR sensor cho chỗ đỗ × 6 (A01–A06)
●IR sensor cho barie IN/OUT × 2
●RC522 RFID × 2
●Thẻ RFID × 5–10
●Servo motor × 2
●Webcam × 2
●Relay 1 kênh × 1
●OLED I2C × 1 (tùy chọn)
●Không dùng Keypad
●Không dùng LED riêng cho từng chỗ
32. LOGIC ESP32 (tách riêng theo từng board)
ESP32 #1 phải:
●1. Kết nối Wi-Fi và MQTT.
●2. Đọc 6 IR sensor (A01–A06) theo chu kỳ.
●3. Gửi trạng thái từng chỗ lên Server khi có thay đổi.
●4. Gửi heartbeat định kỳ.
●5. Tự reconnect khi mất Wi-Fi/MQTT.
ESP32 #2 phải:
●1. Kết nối Wi-Fi và MQTT.
●2. Đọc RFID IN và RFID OUT.
●3. Đọc 2 IR sensor sau barie (phát hiện xe đã đi qua).
●4. Điều khiển Servo IN và Servo OUT (mở/đóng theo logic mục 10).
●5. Điều khiển Relay đèn.
●6. Nhận lệnh điều khiển từ Server (OPEN/CLOSE/LIGHT_ON/LIGHT_OFF).
●7. Gửi heartbeat định kỳ.
●8. Tự reconnect khi mất Wi-Fi/MQTT.
Cả 2 board không được block chương trình quá lâu (dùng non-blocking / millis(), tránh delay() dài).
33. LOGIC CẢNH BÁO
●1. RFID không tồn tại.
●2. RFID bị khóa.
●3. User không có booking.
●4. Chỗ đã bị xe khác chiếm.
●5. Booking hết hạn.
●6. Cảm biến báo trạng thái bất thường.
●7. ESP32 mất kết nối.
●8. Barrier không phản hồi / quá thời gian timeout.
●9. Thanh toán không đủ tiền.
●10. RFID và biển số không khớp (xem mục 45).
Hiển thị cảnh báo trên giao diện Admin.
34. GIAO DIỆN WEB ADMIN
Thiết kế: Modern Dashboard, Responsive, Desktop-first, Sidebar trái, Header, Card thống kê, Table, Chart, Modal, Toast Notification.
Menu:
Menu sidebar rút gọn còn 6 mục:
1.Dashboard
2.Bãi xe — gồm 3 tab con: Giám sát bãi xe · Điều khiển (Barrier/Đèn) · Thiết bị IoT
3.Vận hành — gồm 3 tab con: Booking · Lịch sử gửi xe · Giao dịch
4.Camera / ANPR
5.Người dùng & Phương tiện — gồm 2 tab con: Người dùng · Phương tiện
6.Báo cáo — gồm 2 tab con: Thống kê · Nhật ký hệ thống
Và Cài đặt + Đăng xuất chuyển vào menu dropdown khi bấm avatar/tên Admin ở góc trên bên phải (không chiếm chỗ sidebar)
35. GIAO DIỆN MOBILE USER
Thiết kế Mobile App: hiện đại, dễ sử dụng, tiếng Việt, responsive, có Dark/Light mode nếu phù hợp.
Phạm vi demo: tối ưu cho Android (dùng java code app).
Trang:
●1. Splash Screen
●2. Login
●3. Register
●4. Home
●5. Parking Map
●6. Booking
●7. Booking Detail
●8. Wallet
●9. Transaction History
●10. Parking History
●11. Vehicle Management
●12. Notification
●13. Profile
●14. Settings
Ánh xạ 14 trang với 5 tab của thanh điều hướng (mục 3)
14 trang ở trên không phải 14 tab riêng — chỉ có 5 tab chính hiện trên thanh điều hướng dưới cùng; các trang còn lại là màn hình con mở ra từ bên trong 1 tab, hoặc màn hình trước khi đăng nhập.
Trang chủ (tab): Home; mở rộng ra: Parking Map, Notification
Đặt chỗ (tab): Booking; mở rộng ra: Booking Detail
Lịch sử (tab): Parking History
Ví (tab): Wallet; mở rộng ra: Transaction History
Tài khoản (tab): Profile; mở rộng ra: Vehicle Management, Settings
Trước khi vào app (chưa có tab): Splash Screen, Login, Register
●
36. LUỒNG HOẠT ĐỘNG HOÀN CHỈNH
LUỒNG 1 — USER ĐẶT CHỖ
User Login → Xem bãi xe → Chọn Slot → Chọn thời gian → Chọn số giờ → Tính tiền → Kiểm tra ví → Thanh toán mô phỏng → Tạo Booking → Slot = RESERVED.
LUỒNG 2 — XE VÀO
Xe đến cổng → Webcam IN nhận diện biển số → Quét RFID → ESP32 #2 đọc UID → Server xác thực (RFID + biển số + booking) → Hợp lệ → Mở Barrier → Xe đi vào → IR sau barie phát hiện xe đã qua → Đóng Barrier → Ghi Entry Time → Slot = OCCUPIED → Cập nhật Web/App.
LUỒNG 3 — XE RA
Xe đến cổng OUT → Webcam OUT nhận diện biển số → Quét RFID → Server xác thực → Tìm Parking History → Tính thời gian & phí → Kiểm tra/hoàn tất thanh toán → Mở Barrier → Xe rời bãi → IR sau barie phát hiện xe đã qua → Đóng Barrier → Ghi Exit Time → Slot = FREE → Hoàn tất History → Cập nhật Web/App.
LUỒNG 4 — ADMIN ĐIỀU KHIỂN
Admin Login → Dashboard → Điều khiển → Mở/Đóng Barrier hoặc Bật/Tắt đèn → Backend → MQTT → ESP32 #2 → Thiết bị thực hiện → ESP32 phản hồi trạng thái → Web cập nhật.
37. YÊU CẦU REAL-TIME
Khi một chỗ thay đổi trạng thái: Sensor → ESP32 #1 → MQTT → Node.js → MySQL → Socket.IO → Web Admin + Mobile App. Tất cả giao diện phải cập nhật mà không cần reload.
Ví dụ: A01 đang FREE, xe vào A01, sensor phát hiện xe, trong vài giây A01 → OCCUPIED, Web Admin đổi màu xanh → đỏ, Mobile App cũng đổi trạng thái.
38. QUẢN LÝ LỖI
●ESP32 offline.
●MQTT disconnect.
●Database disconnect.
●RFID lỗi.
●Booking conflict.
●Payment failed.
●Unauthorized request.
●Invalid RFID.
●Sensor error.
●Servo error.
●Webcam/ANPR service không phản hồi.
Không để ứng dụng crash khi thiết bị mất kết nối.
39. RESPONSIVE
Web Admin tối ưu cho Laptop. Mobile App tối ưu cho Android phone (phạm vi demo). Giao diện phải rõ ràng, không quá nhiều thông tin trên một màn hình.
40. YÊU CẦU PHÂN TÁCH HỆ THỐNG
Tách riêng: Admin Web, User Mobile App, Backend, Database, ESP32 Firmware (2 board), ANPR Service. Không gộp Admin và User vào cùng một giao diện.
Admin Web: quản lý toàn hệ thống. User App: đặt chỗ và quản lý tài khoản cá nhân.
41. CÔNG NGHỆ ĐỀ XUẤT
Frontend Admin: html , css JavaScript.
Mobile: java android.
Backend: Node.js, Express.js, Socket.IO, MQTT (mqtt.js).
Database: MySQL.
IoT: 2 × ESP32, MQTT, RFID RC522, IR Sensor, Servo, Relay.
ANPR: Webcam × 2 + dịch vụ ANPR/LPR chạy trên PC/Raspberry Pi (ví dụ Python + OpenALPR/YOLO/EasyOCR), giao tiếp Backend qua HTTP API.
42. YÊU CẦU CODE
Hãy tạo project theo kiến trúc rõ ràng:
/backend
●/controllers
●/routes
●/models
●/services
●/middleware
●/mqtt
●/socket
●/config
●/utils
/admin-web/src
●/components
●/pages
●/layouts
●/services
●/hooks
●/utils
/mobile-app/lib
●/screens
●/widgets
●/services
●/models
●/providers
●/utils
/esp32-slot (firmware ESP32 #1)
●/src
●/include
/esp32-gate (firmware ESP32 #2)
●/src
●/include
/anpr-service (dịch vụ nhận diện biển số chạy trên PC/Raspberry Pi)
●/src
●/models
●/utils
GHI CHÚ SỬA: Bổ sung 2 thư mục firmware riêng cho 2 ESP32 (thay vì 1 thư mục /esp32 chung) và 1 thư mục /anpr-service cho dịch vụ nhận diện biển số chạy ngoài ESP32.
43. YÊU CẦU DEMO
●1. User đăng nhập App.
●2. User xem bãi xe, chọn A01, đặt A01 → Slot đổi sang RESERVED.
●3. User quét RFID tại cổng IN, webcam IN nhận diện biển số.
●4. Backend đối chiếu RFID + biển số + booking → hợp lệ → Barrier IN mở.
●5. Xe vào mô hình → IR sau barie phát hiện xe đã qua → Barrier IN đóng.
●6. Sensor A01 phát hiện xe → A01 đổi thành OCCUPIED.
●7. Web Admin cập nhật real-time, User xem trạng thái trên App.
●8. Xe đến cổng OUT, quét RFID, webcam OUT nhận diện biển số.
●9. Server tính phí, thanh toán mô phỏng → Barrier OUT mở → xe ra → IR phát hiện đã qua → Barrier OUT đóng.
●10. A01 trở thành FREE, lưu lịch sử gửi xe, cập nhật doanh thu.
●11. Admin xem thống kê và lịch sử nhận diện biển số.
44. GIAO DIỆN ƯU TIÊN
Không chỉ tạo giao diện tĩnh — các nút phải có logic thực tế.
●Nút "Mở Barrier" → gửi command thật đến Backend → Backend gửi MQTT → ESP32 #2 nhận → Servo quay.
●Nút "Đặt chỗ" → gọi API → kiểm tra Database → tạo Booking.
●Nút "Nạp tiền" → cập nhật wallet balance thật trong Database.
●RFID → ESP32 #2 đọc thật → gửi Server → xác thực Database.
●IR Sensor → ESP32 #1/#2 đọc thật → cập nhật trạng thái Database.
●Webcam → ảnh thật → ANPR service xử lý thật → trả biển số thật về Backend.
45. HỆ THỐNG CAMERA NHẬN DIỆN BIỂN SỐ (ANPR/LPR) — bản hợp nhất, đã sửa
Đây là bản gộp và sửa lại toàn bộ phần Camera của văn bản gốc (trước đây tách thành nhiều mục 46–70 và có đoạn kiến trúc cũ bị thay thế), dùng đúng kiến trúc: 2 Webcam → PC/Raspberry Pi (ANPR) → Node.js Backend → MySQL.
45.1 Mục tiêu
●Tự động phát hiện xe tại cổng IN/OUT bằng webcam.
●Chụp hình xe khi đi vào/ra.
●Nhận diện biển số (OCR).
●Đối chiếu biển số với tài khoản/xe đã đăng ký.
●Kết hợp RFID + biển số để xác thực (2 lớp).
●Lưu biển số, thời gian, hình ảnh vào Database.
●Hiển thị thông tin nhận diện trên Admin Web.
●Hỗ trợ kiểm tra khi RFID và biển số không khớp.
45.2 Kiến trúc
Camera → PC/Raspberry Pi chạy dịch vụ ANPR/LPR → Node.js Backend → MySQL → Admin Web / Mobile App.
ESP32 #1/#2 KHÔNG xử lý hình ảnh — chỉ xử lý RFID, IR Sensor, Servo, Relay. Camera/ANPR xử lý: chụp ảnh, phát hiện biển số, OCR, trả kết quả về Backend.
45.3 Luồng cổng IN
●1. Webcam IN phát hiện xe, chụp ảnh.
●2. AI phát hiện vùng biển số, OCR, chuẩn hóa biển số (VD ảnh "51A-123.45" → plate_number = "51A12345").
●3. Gửi biển số lên Backend kèm confidence và camera_id.
●4. Song song, user quét RFID tại cổng IN → ESP32 #2 gửi UID.
●5. Backend chờ đối chiếu RFID + biển số trong một khoảng thời gian ngắn (time window, ví dụ 15–30 giây) theo cùng camera_id/direction — vì đồ án chỉ có 1 xe demo nên không cần xử lý nhiều xe cùng lúc.
●6. Kiểm tra: RFID hợp lệ? Biển số hợp lệ? RFID và biển số có khớp cùng 1 Vehicle? Có booking hợp lệ? Slot còn đúng trạng thái không?
●7. Nếu tất cả hợp lệ → mở Barrier IN (theo logic đóng/mở mục 10).
●8. IR Sensor xác nhận xe đã vào chỗ → Slot = OCCUPIED.
●9. Lưu Parking History, lưu ảnh Camera IN, cập nhật Web/App real-time.
45.4 Luồng cổng OUT
●1. Webcam OUT chụp ảnh, nhận diện biển số.
●2. Quét RFID → ESP32 #2 gửi UID.
●3. Backend đối chiếu RFID + biển số → xác định Vehicle → tìm Parking History đang mở.
●4. Tính thời gian gửi xe, tính phí, kiểm tra/hoàn tất thanh toán.
●5. Mở Barrier OUT (theo logic đóng/mở mục 10) → xe rời bãi → lưu Exit Time, ảnh Camera OUT.
●6. Slot = FREE, hoàn thành Parking History.
45.5 Xác thực kết hợp RFID + Biển số
Mặc định (chế độ duy nhất dùng cho đồ án — bỏ khái niệm "chế độ bảo mật cao/thấp" mơ hồ ở bản gốc): RFID và biển số PHẢI khớp cùng một Vehicle mới cho xe vào/ra.
Ví dụ khớp:
●RFID UID = A1:B2:C3:D4 → Database → User Nguyễn Văn A → Vehicle 51A12345.
●Camera nhận diện: 51A12345.
●Hai thông tin trùng nhau → RFID = VALID, Plate = MATCH → cho phép xe vào.
Trường hợp không khớp:
●RFID xác định Vehicle = 51A12345 nhưng Camera nhận diện 59B67890 → KHÔNG khớp.
●Hệ thống KHÔNG tự động cho xe vào — Barrier giữ CLOSED.
●Admin nhận cảnh báo "RFID và biển số xe không khớp", hệ thống ghi lại: RFID UID, biển số nhận diện, thời gian, camera, ảnh, user liên quan, trạng thái xác thực.
Trường hợp không nhận diện được biển số (plate_number = UNKNOWN):
●Không tự động xác nhận biển số.
●Có thể yêu cầu quét RFID lại.
●Hiển thị cảnh báo, ghi log, lưu ảnh camera nếu cần.
Trường hợp RFID không hợp lệ nhưng Camera nhận diện được biển số đã đăng ký:
●Hiển thị: "Phát hiện phương tiện đã đăng ký nhưng RFID không hợp lệ."
●Do đồ án chỉ dùng 1 chế độ xác thực chặt (RFID + Plate đều phải hợp lệ) nên trường hợp này mặc định TỪ CHỐI vào, Admin có thể xác nhận thủ công qua Web Admin nếu cần cho qua.
GHI CHÚ SỬA: Bản gốc vừa nói "không khớp thì luôn từ chối" (mục 51) vừa nhắc tới "chế độ bảo mật cao" ngụ ý có chế độ khác (mục 53) mà không định nghĩa rõ. Vì đây là bài tập nhỏ, đã chốt chỉ dùng 1 chính sách duy nhất (luôn yêu cầu khớp cả 2), bỏ khái niệm nhiều mức bảo mật cho đơn giản.
45.6 AI nhận diện biển số
AI Service: nhận ảnh từ Camera → phát hiện biển số → crop vùng biển số → OCR ký tự → chuẩn hóa biển số → trả kết quả cho Backend.
{ "plate_number": "51A12345", "confidence": 0.94, "timestamp": "...", "camera_id": "CAM_IN" }
Nếu confidence thấp (dưới ngưỡng cấu hình) → đánh dấu NEED_REVIEW.
Chuẩn hóa: các cách viết khác nhau ("51A-123.45", "51A 12345", "51A12345") đều chuẩn hóa về "51A12345" để so sánh; không tự ý sửa dữ liệu gốc trong ảnh, chỉ chuẩn hóa chuỗi kết quả OCR.
45.7 Hiển thị Camera trên Admin Web
Admin có trang CAMERA MONITORING, hiển thị Camera IN và Camera OUT, mỗi camera có: Live Preview (nếu hỗ trợ), trạng thái, biển số/nhận diện gần nhất, thời gian, confidence, kết quả đối chiếu RFID/biển số.
Ví dụ:
CAMERA IN — Biển số: 51A12345 | RFID: A1B2C3D4 | User: Nguyễn Văn A
Thời gian: 08:32:15 | Confidence: 94% | RFID: MATCH | PLATE: VALID | STATUS: ACCEPTED
45.8 Lịch sử nhận diện biển số
Admin xem: thời gian, camera, biển số, RFID, user, ảnh, confidence, kết quả.
Trạng thái: MATCHED, MISMATCH, UNKNOWN, LOW_CONFIDENCE, ACCEPTED, REJECTED.
Chức năng: search biển số, filter theo ngày/IN-OUT/camera/trạng thái.
45.9 API Camera
POST /api/camera/detection — ANPR service gửi kết quả nhận diện
Request:  { camera_id, plate_number, confidence, image_path, timestamp }
Backend: validate dữ liệu → chuẩn hóa biển số → tìm Vehicle → tìm User → lưu vào camera_records (chưa xác thực vào/ra, chỉ ghi nhận) → trả kết quả ghi nhận.
Response: { "success": true, "plate_number": "51A12345", "vehicle_id": 10, "user_id": 5 }
POST /api/access/verify — xác thực tổng hợp RFID + biển số để ra lệnh mở/đóng barrier
Request:  { "rfid_uid": "A1B2C3D4", "plate_number": "51A12345", "direction": "IN" }
Backend lấy plate_number gửi kèm (do frontend/ESP32 gateway đã ghép sẵn với bản ghi camera_records gần nhất cùng direction trong time window), rồi kiểm tra RFID, Plate, Vehicle, User, Booking, Slot.
Response hợp lệ:  { "authorized": true, "vehicle_id": 10, "user_id": 5, "slot_id": 3, "command": "OPEN_GATE_IN" }
Response không hợp lệ: { "authorized": false, "command": "KEEP_CLOSED", "reason": "PLATE_RFID_MISMATCH" }
GHI CHÚ SỬA: Đã bổ sung rõ cơ chế ghép cặp: backend lấy bản ghi camera_records gần nhất cùng camera/direction trong một khoảng thời gian ngắn để ghép với sự kiện quét RFID — bản gốc có 2 API tách rời nhưng không giải thích cách ghép nối 2 sự kiện này.
45.10 Camera + Booking + Parking Slot
Khi User đặt chỗ: Booking gắn User A, Vehicle 51A12345, Slot A01. Khi xe đến: RFID → User A, Camera → 51A12345. Backend kiểm tra Booking.Vehicle = Camera.Plate = RFID.Vehicle → nếu khớp toàn bộ → ACCEPTED → Barrier mở.
Camera xác định xe nào vào; IR Sensor xác định xe có thực sự chiếm chỗ. Nếu Camera nhận diện xe nhưng không có Slot nào chuyển OCCUPIED → tạo cảnh báo. Nếu Slot OCCUPIED nhưng Camera không xác định được xe → trạng thái OCCUPIED_UNKNOWN, Admin cần kiểm tra.
45.11 Phát hiện bất thường (liên quan Camera)
●1. RFID và biển số không khớp.
●2. Biển số không tồn tại trong hệ thống.
●3. RFID không tồn tại.
●4. Booking không hợp lệ.
●5. Xe vào nhưng không có booking.
●6. Xe chiếm slot khác với slot đã đặt.
●7. Camera không nhận diện được / confidence quá thấp.
●8. IR Sensor báo xe nhưng không có nhận diện biển số.
●9. Camera báo xe nhưng IR không phát hiện.
●10. Xe vào nhưng không có lịch sử.
●11. Xe ra nhưng không có phiên gửi xe.
Admin nhận cảnh báo cho tất cả các trường hợp trên.
45.12 Giao diện Admin — Camera/ANPR
Menu CAMERA / ANPR gồm: Camera Overview, Camera IN, Camera OUT, Live Camera, Recognition History, Plate Search, Verification Logs, Camera Settings.
Màn hình xác thực xe khi xe đến hiển thị: Camera Plate, RFID, User, Vehicle, Booking, kết quả RFID/PLATE/MATCH, và ACCESS GRANTED hoặc ACCESS DENIED kèm lý do.
45.13 Phân quyền Camera
Admin: xem camera, xem lịch sử, xem ảnh nhận diện, tìm kiếm biển số, xem cảnh báo, quản lý camera.
User: không xem live camera, không xem camera/lịch sử của người khác; chỉ xem thông tin phương tiện và lịch sử gửi xe của chính mình.
45.14 Nguyên tắc hoạt động chung
Camera không thay thế hoàn toàn RFID — RFID và Camera hoạt động kết hợp: RFID xác định người dùng/phương tiện, Camera xác định biển số thực tế, IR xác định xe có thực sự chiếm chỗ. Ba hệ thống RFID + ANPR + IR phối hợp tạo thành hệ thống xác thực và giám sát bãi đỗ xe thông minh.
46. MỤC TIÊU CUỐI CÙNG
Hãy xây dựng một hệ thống Smart Parking hoàn chỉnh, trong đó:
●ESP32 #1 = tầng thiết bị IoT cho 6 chỗ đỗ (cảm biến IR).
●ESP32 #2 = tầng thiết bị IoT cho cổng vào/ra (RFID, servo barie, relay đèn, IR sau barie).
●Webcam + ANPR Service (PC/Raspberry Pi) = nhận diện biển số.
●MQTT = giao tiếp IoT giữa Node.js và 2 ESP32.
●Node.js = Backend trung tâm.
●MySQL = Database.
●Html,css,JavaScript= Admin Web.
●Java android= User Mobile App.
●RFID + ANPR = xác thực xe (2 lớp).
●IR Sensor = phát hiện xe chiếm chỗ / xe đã qua barie.
●Servo = Barrier (tự mở khi xác thực hợp lệ, tự đóng khi xe đã qua, có timeout an toàn).
●Relay = điều khiển đèn.
●Socket.IO = Real-time.
Hệ thống phải có khả năng chạy Demo End-to-End trên phần cứng thật (1 bộ mô hình gồm 2 ESP32 + 2 webcam), không chỉ là giao diện mô phỏng.
GHI CHÚ SỬA: Vì đồ án chỉ có 1 máy tính + 1 điện thoại để demo, KHÔNG cần thiết kế cho nhiều người dùng thao tác đồng thời (concurrency/locking phức tạp). Chỉ cần đảm bảo logic tuần tự đúng: kiểm tra trạng thái trước khi ghi, và ghi log đầy đủ để dễ trình bày/chấm điểm.
TÓM TẮT CÁC CHỖ ĐÃ SỬA SO VỚI BẢN GỐC
●1. Thống nhất phần cứng: 2 ESP32 (thay vì 1 ESP32 làm tất cả) — sửa mục 1, 20, 31, 32.
●2. Thống nhất Camera: dùng đúng 2 webcam qua PC/Raspberry Pi chạy ANPR, không nối trực tiếp ESP32 — sửa mục 45 (gộp toàn bộ mục 46–70 cũ).
●3. Gộp 2 định nghĩa trùng của bảng camera_records thành 1 bảng duy nhất.
●4. Sửa sơ đồ demo Admin từ 20 chỗ (2 khu) xuống đúng 6 chỗ có cảm biến thật (A01–A06), cho phép thêm chỗ ảo có ghi chú rõ ràng.
●5. Bổ sung đầy đủ logic đóng barie tự động (mở → chờ IR sau barie → đóng, có timeout an toàn) vào các luồng xe vào/ra, thay vì chỉ có "mở" mà thiếu "đóng".
●6. Chốt 1 chính sách xác thực duy nhất: RFID + biển số luôn phải khớp mới cho qua (bỏ khái niệm nhiều "chế độ bảo mật" mơ hồ).
●7. Bổ sung cơ chế ghép cặp sự kiện Camera detection và RFID scan theo camera_id/direction + time window.
●8. Bổ sung trường maximum_fee (bảng parking_rates) và tách unit_price/total_price (bảng bookings).
●9. Chốt dùng JWT cho cả Web Admin và Mobile App (bỏ tùy chọn session mơ hồ).
●10. Bỏ các yêu cầu chống trùng lịch/đồng thời phức tạp (transaction lock nhiều người dùng) vì đồ án chỉ demo với 1 máy tính + 1 điện thoại, chỉ giữ lại kiểm tra trạng thái tuần tự cơ bản.



1. Thêm vào mục Chức năng hệ thống / Luồng vào bãi
Ngay sau phần RFID IN Flow:
Guest / xe chưa đăng ký:
Xe đến cổng IN. 
Camera IN chụp và nhận diện biển số. 
Nếu biển số không tồn tại trong danh sách xe đã đăng ký → xác định là Guest. 
Hệ thống tạo một Guest Parking Session. 
Ghi nhận: 
obiển số xe 
othời gian vào 
ocổng vào 
ovị trí đỗ 
otrạng thái phiên gửi xe 
Cho phép xe vào mà không cần tài khoản và không cần RFID. 
2. Thêm vào mục RFID OUT Flow
Thêm một nhánh:
Guest OUT:
Camera OUT nhận diện biển số. 
Tìm Guest_Parking_Session tương ứng. 
Tính tiền dựa trên thời gian gửi thực tế. 
Hiển thị số tiền cần thanh toán. 
Sau khi mô phỏng thanh toán thành công → mở barrier OUT. 
IR OUT phát hiện xe đi qua → đóng barrier. 
Đóng Guest Parking Session. 
3. Thêm vào Database
Trong phần Database Schema hiện tại, thêm bảng:
Guest_Parking_Sessions
- id
- license_plate
- entry_time
- exit_time
- parking_slot
- status
- duration
- amount
- payment_status
- camera_in_record
- camera_out_record
Ví dụ:
G001 | 29A12345 | 08:00 | 10:30 | A03 | COMPLETED | 2.5h | 25000 | PAID
4. Thêm vào Admin Web
Trong menu Admin thêm:
Guest Parking / Xe khách
Cho Admin xem:
Xe Guest đang trong bãi 
Biển số 
Giờ vào 
Vị trí đỗ 
Thời gian gửi 
Trạng thái thanh toán 
Lịch sử xe Guest 

Quan trọng: sửa lại luồng tổng thể
Hệ thống của bạn sẽ có 2 trường hợp vào bãi:
                  XE ĐẾN CỔNG IN
                        │
                 Camera IN nhận diện
                        │
                 Có xe đã đăng ký?
                   /             \
                 CÓ               KHÔNG
                 │                  │
        RFID + biển số         GUEST SESSION
           xác thực                 │
                 │                  │
                 └────────┬─────────┘
                          ↓
                    Mở Barrier IN
                          ↓
                    IR IN phát hiện
                          ↓
                    Đóng Barrier
                          ↓
                    Chọn/ghi nhận slot
Và khi ra:
                     CỔNG OUT
                        │
                 Camera OUT
                        │
             ┌──────────┴──────────┐
             ↓                     ↓
       Xe đăng ký              Xe Guest
             │                     │
       RFID + biển số        Tìm Guest Session
       xác thực              → tính phí
             │                     │
             └──────────┬──────────┘
                        ↓
                  Thanh toán OK
                        ↓
                  Mở Barrier OUT
                        ↓
                  IR OUT phát hiện
                        ↓
                  Đóng Barrier
