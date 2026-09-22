# DỊCH VỤ NHẬN DIỆN BIỂN SỐ XE (ANPR / LPR SERVICE)
> Ứng dụng thị giác máy tính chạy trên máy tính (Python + OpenCV + AI OCR).  
> Tự động xử lý nhận diện biển số xe từ **2 Webcam USB (CAM_IN & CAM_OUT)** và gửi về Backend Node.js qua HTTP API.

---

## 🛠️ 1. Cấu trúc thư mục

```text
anpr-service/
├── config.py           # Cấu hình Camera index, API URL, Threshold, Debounce
├── detector.py         # Module tiền xử lý ảnh, trích xuất vùng biển số và OCR
├── api_client.py       # Module HTTP client gửi kết quả về /api/camera/detection
├── main.py             # Điều khiển luồng video 2 camera và hiển thị giao diện
├── requirements.txt    # Danh sách thư viện Python cần thiết
├── captures/           # Thư mục tự động lưu ảnh chụp phương tiện nhận diện
└── README.md           # Hướng dẫn cài đặt và sử dụng
```

---

## 🚀 2. Hướng dẫn cài đặt & Khởi chạy

### Bước 1: Chuẩn bị môi trường Python
Yêu cầu máy tính đã cài đặt **Python 3.8+** (Khuyên dùng Python 3.9 - 3.11).

Mở terminal/Command Prompt tại thư mục `anpr-service`:
```bash
cd "c:\Users\ADMIN\Downloads\Thiet ke ht IOT\BÀi tập lớn\anpr-service"
```

Tạo môi trường ảo (tùy chọn nhưng khuyên dùng):
```bash
python -m venv venv
# Trên Windows:
.\venv\Scripts\activate
```

### Bước 2: Cài đặt các thư viện phụ thuộc
```bash
pip install -r requirements.txt
```
*(Lưu ý: Nếu không có GPU rời, EasyOCR sẽ tự động chạy trên CPU rất mượt mà).*

### Bước 3: Cấu hình cổng Camera USB (nếu cần)
Mở file `config.py`:
- `CAM_IN_INDEX`: Mặc định là `0` (Webcam tích hợp hoặc Webcam USB 1).
- `CAM_OUT_INDEX`: Mặc định là `1` (Webcam USB 2).
- `BACKEND_BASE_URL`: Mặc định `http://localhost:3000/api`.

### Bước 4: Chạy dịch vụ ANPR
Chắc chắn rằng Backend Node.js (`backend_csdl`) đang chạy, sau đó gõ:
```bash
python main.py
```

Một cửa sổ đồ họa hiển thị đồng thời 2 khung hình **Camera Cổng Vào** và **Camera Cổng Ra** sẽ xuất hiện!

---

## 🎮 3. Phím tắt tiện ích khi chạy Demo

Để phục vụ buổi báo cáo và kiểm thử thuận tiện (kể cả khi chưa kịp cắm 2 webcam thật), ứng dụng hỗ trợ các phím tắt mô phỏng thông minh:

| Phím bấm | Chức năng demo |
|:---:|---|
| **`1`** | **Giả lập Xe Vào**: Gửi sự kiện biển số xe đã đăng ký `51A12345` tại Cổng Vào (`CAM_IN`). |
| **`2`** | **Giả lập Xe Ra**: Gửi sự kiện biển số `51A12345` tại Cổng Ra (`CAM_OUT`). |
| **`3`** | **Giả lập Khách vãng lai**: Gửi sự kiện xe chưa đăng ký `29A88888` tại Cổng Vào. |
| **`i`** | Chụp và nhận diện tức thì khung hình hiện tại trên **Camera Vào**. |
| **`o`** | Chụp và nhận diện tức thì khung hình hiện tại trên **Camera Ra**. |
| **`Q`** hoặc **`Esc`** | Thoát ứng dụng an toàn. |

---

## 📡 4. Luồng dữ liệu (Data Pipeline)

```text
Webcam USB (CAM_IN / CAM_OUT)
       ↓
Khung hình Video (OpenCV)
       ↓
Tiền xử lý ảnh (Grayscale + Bilateral Filter + Canny)
       ↓
Phát hiện đường viền hình chữ nhật biển số
       ↓
Nhận diện ký tự OCR (EasyOCR / Regular Expressions)
       ↓
Chuẩn hóa biển số (51A-123.45 -> 51A12345)
       ↓
Kiểm tra Cooldown (3s chống spam cùng 1 xe)
       ↓
Lưu ảnh snapshot vào thư mục captures/
       ↓
HTTP POST: /api/camera/detection
       ↓
Node.js Backend tạo bản ghi `camera_records` và phát Socket.IO cho Web Admin
```
