# Danh sách công việc (Todo List) — Prompt 5: Tích hợp & Kiểm tra End-to-End Toàn Hệ Thống

## Mục tiêu
Kiểm tra, rà soát từ các chi tiết nhỏ nhất, đồng bộ hóa và kết nối toàn bộ 5 thành phần:
Backend CSDL + Web Admin + Mobile App + Firmware ESP32 + ANPR Service, đảm bảo chạy ổn định, dữ liệu thật, không phá cấu trúc hiện tại.

---

## Các hạng mục kiểm tra & Tích hợp

### Giai đoạn 1: Kiểm toán CSDL & Dữ liệu Seed (MySQL)
- [x] Kiểm tra schema 15 bảng trong `smart_parking.sql`.
- [x] Kiểm tra tài khoản mặc định (Admin, User demo).
- [x] Bổ sung xe test `51A-123.45` và thẻ RFID `A1:B2:C3:D4` trong seed để khớp với ANPR demo.

### Giai đoạn 2: Kiểm toán Backend Server (Node.js + MQTT + Socket.IO)
- [x] Kiểm tra Port 3000, CORS, Static Web hosting trên server Express.
- [x] Chuẩn hóa `device_code` trong `mqttHandler.js` (map `ESP32_SLOT_01` ➔ `ESP32_1`, `ESP32_GATE_01` ➔ `ESP32_2`).
- [x] Chuẩn hóa tìm kiếm biển số linh hoạt (có/không có gạch ngang) trong `VehicleModel.findByPlate`.
- [x] Chuẩn hóa tìm kiếm UID RFID linh hoạt (có/không có dấu hai chấm) trong `RfidModel.findByUid`.
- [x] Kiểm tra khớp nối Socket.IO events (`slot_status_changed`, `barrier_status`, `device_status`, `rfid_event`, `camera_detection`).

### Giai đoạn 3: Kiểm toán Giao diện Web Admin (HTML5 + CSS3 + JS)
- [x] Kiểm tra kết nối API qua `web/js/api.js` (tự động phát hiện cùng Origin hoặc localhost:3000).
- [x] Kiểm tra Socket.IO realtime trên Dashboard & Sơ đồ bãi xe.
- [x] Kiểm tra nút điều khiển Barie Vào/Ra và Đèn bãi xe qua `/api/devices/barrier/control` và `/api/devices/light/control`.
- [x] Kiểm tra các màn hình: Quản lý bãi đỗ, Booking, Xe vãng lai (Guest), Camera ANPR, Người dùng & Xe.

### Giai đoạn 4: Kiểm toán Ứng dụng Di động (Android Native Java)
- [x] Kiểm tra `ApiConfig.java`: Cổng mặc định 3000 khớp với Backend Node.js.
- [x] Kiểm tra `ApiService.java`: Toàn bộ Retrofit routes khớp với API Backend.
- [x] Kiểm tra `SocketService.java`: Lắng nghe realtime `slot_status_changed` và thông báo mới.
- [x] Kiểm tra tính năng đổi IP Server linh hoạt trên màn hình Login & Settings để chạy được trên cả Máy ảo và Máy thật qua LAN.

### Giai đoạn 5: Kiểm toán Firmware ESP32 (Arduino IDE)
- [x] Kiểm tra ESP32 #1: Pinout 6 IR chỗ đỗ A01–A06, Debounce, MQTT topic `parking/esp32_1/slot/A0x`.
- [x] Kiểm tra ESP32 #2: Giao tiếp SPI RC522 (1 reader duy nhất), 2 Servo barie, 2 IR cổng, Relay đèn.
- [x] Kiểm tra cơ chế tự động đóng barie sau khi xe qua và timeout 15s an toàn.
- [x] Kiểm tra tính non-blocking `millis()`, không dùng delay dài.

### Giai đoạn 6: Kiểm toán Dịch vụ ANPR (Python + OpenCV)
- [x] Kiểm tra kết nối 2 Webcam USB (`CAM_IN_INDEX=0`, `CAM_OUT_INDEX=1`).
- [x] Kiểm tra cơ chế chống crash (chuyển sang canvas giả lập nếu thiếu camera).
- [x] Kiểm tra chuẩn hóa biển số Việt Nam (loại bỏ dấu gạch/chấm/khoảng trắng).
- [x] Kiểm tra phím tắt tiện ích demo (`1`: Xe vào `51A12345`, `2`: Xe ra `51A12345`, `3`: Khách vãng lai).

### Giai đoạn 7: Đánh giá Toàn Trình (End-to-End Test Matrix)
- [x] Luồng 1: Đặt chỗ trước qua Mobile App ➔ Đồng bộ Web Admin.
- [x] Luồng 2: Xe vào (ANPR Cam IN + Quét 1 RFID ➔ Mở barie ➔ IR xe qua ➔ Đóng barie ➔ IR slot báo chiếm chỗ).
- [x] Luồng 3: Xe ra (ANPR Cam OUT + Quét 1 RFID ➔ Tính phí ➔ Trừ ví ➔ Mở barie ➔ IR xe qua ➔ Đóng barie ➔ Giải phóng slot).
- [x] Luồng 4: Điều khiển thủ công Barie / Đèn từ Web Admin qua MQTT.
- [x] Luồng 5: Xe khách vãng lai (Guest Parking Session).

---

### Giai đoạn 8: Firmware ESP32 All-In-One (1 Board Duy Nhất + OLED SH1106G)
- [x] Thiết lập thư mục mới `code_esp32/esp32-all-in-one/`.
- [x] Viết `config.h` chuẩn hóa sơ đồ chân (8 IR, 2 Servo, 1 RFID RC522, 1 OLED SH1106G, Relay), WiFi & MQTT topics.
- [x] Viết `esp32-all-in-one.ino` tích hợp toàn bộ:
  - Non-blocking đa nhiệm `millis()`.
  - Quản lý 6 chỗ đỗ A01–A06 với lọc nhiễu Debounce.
  - Quản lý cổng Vào/Ra: Quét thẻ RFID RC522, điều khiển 2 Servo Barie.
  - Tự động đóng Barie bằng 2 cảm biến IR cổng và timeout bảo vệ 15s.
  - Điều khiển Relay đèn bãi xe.
  - Màn hình OLED SH1106G 128x64 hiển thị Dashboard trực quan: WiFi/MQTT status, ma trận 6 ô đỗ, trạng thái barie và thông báo quẹt thẻ.
  - Tự động kết nối lại WiFi/MQTT và gửi Heartbeat định kỳ.
- [x] Viết `README.md` hướng dẫn sơ đồ đấu nối chi tiết và các bước nạp code qua Arduino IDE.
- [x] Đánh giá, đối soát tính tương thích toàn diện với Backend và CSDL.

---

### Giai đoạn 9: Cải Tiến Chụp Ảnh Webcam & Thư Mục Riêng Từng Người / Khách Vãng Lai (Prompt 6)
- [x] Tạo tiện ích `folderHelper.js` sinh tên thư mục an toàn cho Windows/Linux:
  - Người dùng đăng ký: `<tên_người>_<giờ>h[phút]_[ngày]-[tháng]-[năm]` (ví dụ: `nguoi_demo_1_12h_17-9-2026`).
  - Khách vãng lai: `<biển_số_xe>_<giờ>h[phút]_[ngày]-[tháng]-[năm]` (ví dụ: `36A99999_12h_17-9-2026`).
- [x] Chụp ảnh thực tế từ webcam khi phát hiện thành công biển số:
  - Cổng Vào (CAM_IN): Tự động lưu `anh_vao.jpg` vào thư mục phiên tương ứng.
  - Cổng Ra (CAM_OUT): Tự động lưu `anh_ra.jpg` vào cùng thư mục đó.
- [x] Cập nhật Backend API (`cameraController.js`, `accessService.js`):
  - Tra cứu và gán thư mục cho phiên đỗ xe (khớp cùng thư mục khi xe ra).
  - Trả về `folder_name` và `filename` (`anh_vao.jpg` / `anh_ra.jpg`) cho ANPR Service.
  - Lưu đúng đường dẫn `/captures/<folder_name>/anh_vao.jpg` và `/captures/<folder_name>/anh_ra.jpg` vào bảng `parking_history`.
- [x] Cập nhật ANPR Service (`anpr-service/main.py`, `api_client.py`):
  - Chụp ảnh frame webcam sắc nét ngay khi nhận diện thành công hoặc khi nhấn phím test 1, 2.
  - Thêm nhãn bằng chứng nhận diện trên ảnh và ghi log chi tiết: `📸 [CHỤP ẢNH WEBCAM THÀNH CÔNG]`.
- [x] Cập nhật giao diện `web/history.html`:
  - Hiển thị tên thư mục lưu trữ: `📁 Thư mục ảnh (Folder): captures/<folder_name>/`.
  - Hiển thị 2 ảnh `anh_vao.jpg` và `anh_ra.jpg` trực quan cạnh nhau kèm nhãn tệp.
- [x] Kiểm thử toàn bộ quy trình sinh thư mục và lưu 2 ảnh tự động thành công 100%.

---

### Giai đoạn 10: Khắc Phục Lỗi `jlink.exe` & Cấu Hình Gradle Toolchain (Mobile App)
- [x] Phân tích nguyên nhân gốc: Gradle daemon sử dụng JRE rút gọn của extension `redhat.java` (thiếu `jlink.exe` và `jmods`) thay vì JDK 17 đầy đủ của máy.
- [x] Cập nhật `gradle/gradle-daemon-jvm.properties` sang `toolchainVersion=17`.
- [x] Cập nhật `gradle.properties`: Trỏ `org.gradle.java.home` về `C:/Program Files/Eclipse Adoptium/jdk-17.0.20.101-hotspot`.
- [x] Cập nhật `.vscode/settings.json` (cả root và `mobilbe_app/.vscode/`): Cấu hình đồng bộ `java.home`, `gradle.java.home`, `java.jdt.ls.java.home` về Adoptium JDK 17.
- [x] Cập nhật `gradlew.bat`: Thêm `@chcp 65001 >nul` hỗ trợ đường dẫn tiếng Việt `BÀi tập lớn`.
- [x] Dừng daemon cũ và chạy lại biên dịch thành công: `BUILD SUCCESSFUL` sinh ra file `app-debug.apk` (13.6 MB).

---

### Giai đoạn 11: Cài Đặt Bảng Giá Gửi Xe & Chia Đôi Nút Điều Khiển Barie (Web & App)
- [x] **Backend API Bảng Giá & Barie**:
  - [x] Cập nhật `parkingController.js` với `updateRate` và `batchUpdateRates` kèm phát socket event `rates_updated`.
  - [x] Cập nhật `parkingRoutes.js` route `PUT /api/parking/rates/batch`.
  - [x] Cập nhật `deviceController.js`: Bỏ hoàn toàn timeout tự đóng 5 giây khi mở barie thủ công.
- [x] **Web Admin Dashboard & API Layer**:
  - [x] Cập nhật `web/js/api.js`: Thêm `ParkingAPI.batchUpdateRates(rates)`.
  - [x] Thêm nút `⚙️ Cài đặt giá tiền bãi xe` ngay dưới sơ đồ bãi xe trong `web/dashboard.html`.
  - [x] Chia đôi nút điều khiển Barie (50% / 50% độ rộng):
    - Cổng Vào (IN): Nút Mở (xanh lá `ctrl-btn-green`) & Nút Đóng (màu trắng `ctrl-btn-light`).
    - Cổng Ra (OUT): Nút Mở (xanh dương `ctrl-btn-blue`) & Nút Đóng (màu trắng `ctrl-btn-light`).
    - Sơ đồ cổng chân bãi xe: Mở IN, Đóng IN (trắng), Mở OUT, Đóng OUT (trắng).
  - [x] Xóa bỏ toàn bộ chú thích "tự đóng sau 5s" trên Web Admin.
  - [x] Thêm Card "Bảng giá mới cập nhật của Admin" hiển thị giá Ô tô, Xe máy, Xe tải theo giờ và mức min/max.
  - [x] Modal popup trực quan cho Admin điều chỉnh và lưu bảng giá hàng loạt với 1 click.
  - [x] Lắng nghe realtime sự kiện `rates_updated` từ Socket.IO để tự động làm mới giao diện.
- [x] **Mobile App Android (Java)**:
  - [x] Tạo model `ParkingRate.java` và `BatchRatesRequest.java`.
  - [x] Bổ sung các phương thức Retrofit `getParkingRates`, `updateParkingRate`, `batchUpdateRates` trong `ApiService.java`.
  - [x] Thiết kế layout dialog `dialog_config_rates.xml` và hàm tiện ích `DialogUtils.showParkingRateConfigDialog`.
  - [x] Thêm nút `⚙️ Cài đặt giá tiền bãi xe (Admin)` ngay dưới sơ đồ bãi xe trong `fragment_home.xml`, `HomeFragment.java`, `activity_parking_map.xml`, `ParkingMapActivity.java`, `fragment_admin_parking.xml`, `AdminParkingFragment.java`.
  - [x] Cập nhật `fragment_admin_dashboard.xml`:
    - Thêm Card "Bảng Giá Dịch Vụ Hiện Tại" hiển thị giá các loại xe Ô tô, Xe máy, Xe tải kèm nút "⚙️ Cài đặt giá".
    - Thay thế dòng "Tự động hạ sau 5 giây khi mở" thành "Điều khiển đóng/mở thủ công".
    - Cặp nút Mở / Đóng đã được tách độc lập (Mở nền màu, Đóng viền trắng).
  - [x] Cập nhật `AdminDashboardFragment.java` nạp và hiển thị bảng giá realtime, gắn sự kiện mở hộp thoại cấu hình.
  - [x] Biên dịch thành công APK qua Adoptium JDK 17: `BUILD SUCCESSFUL in 46s`.



