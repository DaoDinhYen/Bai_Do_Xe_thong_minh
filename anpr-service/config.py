import os

# ============================================================
# CẤU HÌNH DỊCH VỤ NHẬN DIỆN BIỂN SỐ XE (ANPR / LPR SERVICE)
# ============================================================

# 1. Kết nối Backend Node.js
BACKEND_BASE_URL = os.getenv("BACKEND_URL", "http://localhost:3000/api")
DETECTION_ENDPOINT = f"{BACKEND_BASE_URL}/camera/detection"

# 2. Cấu hình Camera USB (Device Index)
# - Camera 0: Thường là Webcam tích hợp trên Laptop hoặc Webcam USB đầu tiên
# - Camera 1: Webcam USB thứ hai
CAM_IN_INDEX = int(os.getenv("CAM_IN_INDEX", 0))
CAM_OUT_INDEX = int(os.getenv("CAM_OUT_INDEX", 1))

# Mã định danh Camera (Khớp với CSDL trong backend: CAM_IN và CAM_OUT)
CAM_IN_ID = "CAM_IN"
CAM_OUT_ID = "CAM_OUT"

# 3. Kích thước khung hình hiển thị
FRAME_WIDTH = 640
FRAME_HEIGHT = 480

# 4. Ngưỡng nhận diện & Lọc trùng (Debounce)
CONFIDENCE_THRESHOLD = 0.70     # Ngưỡng tin cậy tối thiểu (0.7 = 70%)
DEBOUNCE_SECONDS = 3.0          # Khoảng cách tối thiểu giữa 2 lần gửi cùng 1 biển số (3 giây)

# 5. Lưu ảnh chụp khoảnh khắc nhận diện
SAVE_CAPTURES = True
CAPTURE_DIR = os.path.join(os.path.dirname(__file__), "captures")
