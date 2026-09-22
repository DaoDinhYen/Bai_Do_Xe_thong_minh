# SMART PARKING SYSTEM — MOBILE USER APP (ANDROID NATIVE)
> Ứng dụng di động Native dành cho người dùng bãi đỗ xe thông minh (Smart Parking System)  
> Được xây dựng hoàn toàn bằng **Java**, **XML Layout**, **Android SDK** và **Gradle**.

---

## 📱 1. Giới thiệu tổng quan
Ứng dụng di động **Smart Parking** giúp khách hàng dễ dàng tìm kiếm chỗ đỗ xe trống theo thời gian thực, đặt trước vị trí đỗ, thanh toán phí gửi xe qua ví điện tử, quản lý phương tiện và nhận các thông báo biến động tự động từ hệ thống IoT.

### 🌟 Đặc điểm nổi bật
- **100% Android Native**: Sử dụng Java và XML Layout thuần, không sử dụng Kotlin, Compose hay cross-platform.
- **Thiết kế UI/UX hiện đại, chuẩn chỉnh**: Tone màu xanh dương chủ đạo (`#1677FF`), xanh navy (`#123B70`), nền sáng mềm mại (`#F6F9FC`), bo góc thẻ bo tròn mềm mại (14–18dp) bám sát bản thiết kế mẫu.
- **Đồng bộ thời gian thực (Realtime)**: Tích hợp Socket.IO Client 2.1 lắng nghe sự kiện thay đổi trạng thái chỗ đỗ (`slot_status_changed`) và thông báo mới (`new_notification`).
- **Linh hoạt kết nối**: Hỗ trợ đổi địa chỉ IP / Cổng máy chủ Backend ngay trên giao diện (màn hình Đăng nhập & Cài đặt), thuận tiện chạy trên cả Máy ảo Android (Emulator `10.0.2.2`) và Thiết bị thật qua WiFi LAN (`192.168.x.x`).
- **Build thành công**: Đã được biên dịch và kiểm tra hoàn chỉnh, tạo file APK Debug `app-debug.apk`.

---

## 🗂️ 2. Danh sách 14 màn hình chức năng

| STT | Tên màn hình | Kiểu Component | Mô tả chức năng |
|:---:|:---|:---|:---|
| **01** | **Splash Screen** | `SplashActivity` | Màn hình chào đón, kiểm tra phiên đăng nhập tự động chuyển hướng vào Trang chủ hoặc Đăng nhập. |
| **02** | **Đăng nhập** | `LoginActivity` | Form đăng nhập bằng Email/Username + Mật khẩu, kèm nút cấu hình IP máy chủ nhanh. |
| **03** | **Đăng ký** | `RegisterActivity` | Đăng ký tài khoản mới (Họ tên, Email, Số điện thoại, Mật khẩu). |
| **04** | **Trang chủ** *(Tab 1)* | `HomeFragment` | Thẻ số dư ví, thống kê vị trí đỗ (Tổng/Trống/Có xe/Đã đặt), danh sách chỗ đỗ và Bottom Sheet chi tiết chỗ đỗ. |
| **05** | **Sơ đồ bãi đỗ xe** | `ParkingMapActivity` | Bản đồ trực quan các khu A, B, C; phân loại màu sắc: Xanh (Trống), Đỏ (Đang có xe), Cam (Đã đặt), Xám (Bảo trì). |
| **06** | **Đặt chỗ** *(Tab 2)* | `BookingFragment` | Quy trình đặt chỗ trực quan: Chọn khu vực/chỗ đỗ, chọn thời gian đến, số giờ gửi, tính trước phí gửi xe và thanh toán qua ví. |
| **07** | **Chi tiết đặt chỗ** | `BookingDetailActivity` | Hiển thị mã đặt chỗ dạng phiếu vé, mã QR, thông tin vị trí đỗ, thời gian gửi và nút hủy đặt chỗ. |
| **08** | **Ví điện tử** *(Tab 4)* | `WalletFragment` | Xem số dư ví, danh sách các giao dịch gần nhất, nạp tiền nhanh vào ví (mệnh giá 50k, 100k, 200k, 500k hoặc tùy chọn). |
| **09** | **Lịch sử giao dịch ví** | `TransactionHistoryActivity` | Toàn bộ lịch sử giao dịch ví với bộ lọc phân loại: Nạp tiền (TOPUP), Phí gửi xe (PARKING_FEE), Hoàn tiền (REFUND). |
| **10** | **Lịch sử hoạt động** *(Tab 3)* | `HistoryFragment` | 3 tab chuyển đổi mượt mà: Lịch sử đặt chỗ, Lượt vào/ra gửi xe thực tế (biển số, giờ vào/ra, chi phí), Lịch sử ví. |
| **11** | **Quản lý phương tiện** | `VehicleManagementActivity` | Danh sách xe đã đăng ký, thêm xe mới (ô tô, xe máy, xe điện), đặt xe mặc định, xóa xe. |
| **12** | **Thông báo hệ thống** | `NotificationActivity` | Danh sách thông báo (đặt chỗ, xe vào bãi, xe ra bãi, biến động số dư), đọc chi tiết thông báo, đánh dấu đã đọc tất cả. |
| **13** | **Tài khoản cá nhân** *(Tab 5)* | `ProfileFragment` | Xem và cập nhật thông tin cá nhân (họ tên, số điện thoại), tóm tắt số dư, điều hướng đến các tính năng và nút Đăng xuất. |
| **14** | **Cài đặt hệ thống** | `SettingsActivity` | Cấu hình Server IP/Port linh hoạt, kiểm tra kết nối (Ping Test đo độ trễ ms), đổi mật khẩu tài khoản, thông tin phiên bản. |

---

## 🛠️ 3. Cấu trúc thư mục mã nguồn (`app/src/main/`)

```text
mobilbe_app/
├── app/
│   ├── build.gradle               # Gradle build config (Java 17/21, Retrofit, OkHttp, Socket.IO, Glide)
│   └── src/main/
│       ├── AndroidManifest.xml    # Đăng ký 9 Activities, SmartParkingApp, Quyền Internet
│       ├── java/com/smartparking/app/
│       │   ├── SmartParkingApp.java
│       │   ├── activities/        # Splash, Login, Register, Main, ParkingMap, BookingDetail,
│       │   │                      # TransactionHistory, VehicleManagement, Notification, Settings
│       │   ├── fragments/         # HomeFragment, BookingFragment, HistoryFragment, WalletFragment, ProfileFragment
│       │   ├── adapters/          # ParkingSlotAdapter, BookingHistoryAdapter, ParkingHistoryAdapter,
│       │   │                      # TransactionAdapter, VehicleAdapter, NotificationAdapter
│       │   ├── models/            # User, ParkingSlot, Booking, Vehicle, Transaction, History, Notification...
│       │   ├── network/           # ApiClient, ApiService, ApiConfig
│       │   ├── services/          # SocketService (Socket.IO client lắng nghe thời gian thực)
│       │   └── utils/             # SessionManager, FormatUtils, DialogUtils
│       └── res/
│           ├── drawable/          # Vector icons, shape backgrounds, custom badges, logo
│           ├── layout/            # 14 XML layouts cho Activities, Fragments và Dialogs
│           ├── menu/              # bottom_nav_menu.xml (5 Tabs)
│           ├── values/            # colors.xml, strings.xml, themes.xml, dimens.xml
│           └── xml/               # backup_rules.xml, data_extraction_rules.xml
├── build.gradle                   # Root build.gradle
├── gradle.properties              # Android override path check cho đường dẫn tiếng Việt
├── local.properties               # Đường dẫn Android SDK
└── gradlew.bat                    # Gradle Wrapper cho Windows
```

---

## 🚀 4. Hướng dẫn chạy ứng dụng trên Android Studio

### Bước 1: Mở dự án trong Android Studio
1. Khởi động **Android Studio**.
2. Chọn **File -> Open...** (hoặc **Open Project**).
3. Điều hướng và chọn thư mục:
   ```text
   c:\Users\ADMIN\Downloads\Thiet ke ht IOT\BÀi tập lớn\mobilbe_app
   ```
4. Đợi Android Studio đồng bộ Gradle (Gradle Sync) hoàn tất.

### Bước 2: Cấu hình địa chỉ IP máy chủ Backend
- **Chạy trên Máy ảo Android (Emulator)**:
  - Máy ảo mặc định kết nối với máy tính chủ qua IP: `10.0.2.2`.
  - Ứng dụng đã được cấu hình mặc định sẵn kết nối tới: `http://10.0.2.2:3000/api/`.
- **Chạy trên Điện thoại thật (Physical Device)**:
  1. Kết nối điện thoại và máy tính vào **cùng 1 mạng WiFi**.
  2. Mở Command Prompt trên máy tính, gõ `ipconfig` để lấy địa chỉ IPv4 (ví dụ: `192.168.1.15`).
  3. Mở App trên điện thoại -> Tại màn hình Đăng nhập (hoặc vào **Tài khoản -> Cài đặt**), bấm biểu tượng **Máy chủ** -> Nhập Host: `192.168.1.15`, Port: `3000` -> Bấm **Lưu cấu hình**.
  4. Bấm nút **Kiểm tra kết nối** để xác nhận máy chủ đã phản hồi trực tuyến.

### Bước 3: Biên dịch và chạy App
- Chọn thiết bị máy ảo hoặc máy thật trên thanh công cụ Android Studio.
- Bấm nút **Run (tam giác xanh)** hoặc phím tắt `Shift + F10`.

---

## 🧪 5. Kịch bản chạy thử nghiệm (Demo Scenarios)

### Kịch bản 1: Đăng nhập & Đăng ký
- Mở App -> Ứng dụng hiển thị Splash Screen sau đó vào màn hình Đăng nhập.
- Tài khoản mẫu có sẵn trong CSDL:
  - Tài khoản: `user1@gmail.com`
  - Mật khẩu: `123456`
- Hoặc bấm **"Chưa có tài khoản? Đăng ký ngay"** để tạo một tài khoản mới.

### Kịch bản 2: Xem bãi đỗ xe và Sơ đồ Realtime
1. Đăng nhập thành công, vào màn hình **Trang chủ** (Tab 1).
2. Thấy tóm tắt: Tổng chỗ đỗ, số chỗ trống, số chỗ đang có xe, số chỗ đang đặt.
3. Bấm **"Xem sơ đồ bãi đỗ"** để xem bản đồ đồ họa phân khu (A, B, C) với các màu trạng thái:
   - 🟢 **Xanh lá**: Chỗ trống (Khả dụng).
   - 🔴 **Đỏ**: Đang có xe đỗ.
   - 🟡 **Cam**: Đã được đặt trước.
   - ⚪ **Xám**: Bảo trì / Không hoạt động.
4. Trên web Admin hoặc Postman, cập nhật trạng thái một chỗ đỗ -> Trên Mobile App, vị trí đó lập tức đổi màu tương ứng ngay lập tức qua **Socket.IO** mà không cần reload!

### Kịch bản 3: Đặt chỗ đỗ xe trước
1. Chuyển sang Tab **Đặt chỗ** (Tab 2).
2. Chọn chỗ đỗ mong muốn (ví dụ `A01`), chọn ngày đến, giờ đến và số giờ dự kiến gửi (ví dụ 3 giờ).
3. Ứng dụng tự động gọi API tính trước phí gửi xe và hiển thị chi tiết giá (`30.000 đ`).
4. Bấm **"Xác nhận đặt chỗ"** -> Hệ thống kiểm tra số dư ví và tạo phiếu đặt chỗ thành công.
5. Xem chi tiết phiếu đặt chỗ dạng thẻ vé tại `BookingDetailActivity`.

### Kịch bản 4: Nạp tiền vào Ví
1. Vào Tab **Ví** (Tab 4).
2. Xem số dư hiện tại.
3. Bấm chọn nhanh một mệnh giá nạp (ví dụ `100.000 đ`) -> Bấm **"Nạp tiền ngay"**.
4. Số dư tài khoản được cộng ngay lập tức, danh sách giao dịch bên dưới cập nhật mục nạp tiền.

### Kịch bản 5: Quản lý xe cá nhân
1. Vào Tab **Tài khoản** (Tab 5) -> Chọn **"Quản lý phương tiện xe"**.
2. Bấm nút **"Thêm xe mới"** -> Nhập biển số (ví dụ `30A-999.88`), loại xe ô tô, tên xe -> Bấm **Lưu**.
3. Bấm vào xe vừa tạo để đặt làm xe mặc định hoặc xóa xe.

### Kịch bản 6: Nhận thông báo tự động
1. Bấm biểu tượng chuông thông báo ở góc trên bên phải hoặc vào mục **Thông báo hệ thống**.
2. Xem danh sách các thông báo đặt chỗ, biến động số dư ví.
3. Nhấp vào từng thông báo để đọc nội dung chi tiết hoặc bấm **"Đọc tất cả"** để đánh dấu đã đọc.

---

## 📦 6. Vị trí file APK sau khi Build
File cài đặt APK Debug đã được build sẵn nằm tại:
```text
mobilbe_app\app\build\outputs\apk\debug\app-debug.apk
```
Bạn có thể copy file `app-debug.apk` này trực tiếp vào điện thoại Android bất kỳ để cài đặt và trải nghiệm!
