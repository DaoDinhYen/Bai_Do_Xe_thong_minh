import sys
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

import cv2
import re
import numpy as np

# Thử import EasyOCR
try:
    import easyocr
    EASYOCR_AVAILABLE = True
except ImportError:
    EASYOCR_AVAILABLE = False


class LicensePlateDetector:
    """
    Module phát hiện vùng biển số và nhận diện ký tự OCR tối ưu tốc độ cho xe Việt Nam:
    - Hỗ trợ biển số dài 1 dòng (30A-123.45)
    - Hỗ trợ biển số vuông / giấy in 2 dòng (36A / 999.99)
    - Định vị vùng biển số thông minh qua phổ màu trắng (HSV) và cạnh Canny
    - In log chi tiết theo thời gian thực khi đưa biển số vào camera
    """

    def __init__(self):
        self.reader = None
        if EASYOCR_AVAILABLE:
            print("🚀 Đang khởi tạo mô hình AI EasyOCR (Chạy tối ưu CPU)...")
            try:
                self.reader = easyocr.Reader(['en'], gpu=False, verbose=False)
                print("✅ Mô hình EasyOCR sẵn sàng nhận diện biển số!")
            except Exception as e:
                print(f"⚠️ Lỗi khởi tạo EasyOCR: {e}")
                self.reader = None
        else:
            print("ℹ️ Chưa cài đặt thư viện 'easyocr'. Vui lòng cài: pip install easyocr")

    def find_plate_regions(self, frame):
        """
        Tìm các vùng nghi vấn biển số trong ảnh:
        1. Lọc vùng màu trắng/sáng đặc trưng của biển số xe Việt Nam
        2. Lọc contour hình chữ nhật cạnh Canny
        """
        h_frame, w_frame = frame.shape[:2]
        regions = []

        # 1. Phát hiện theo dải màu trắng (Biển số xe Việt Nam có nền trắng chữ đen)
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        lower_white = np.array([0, 0, 135])
        upper_white = np.array([180, 85, 255])
        mask = cv2.inRange(hsv, lower_white, upper_white)

        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
        closed = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

        contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        contours = sorted(contours, key=cv2.contourArea, reverse=True)[:6]

        for c in contours:
            x, y, w, h = cv2.boundingRect(c)
            area = w * h
            aspect = float(w) / max(h, 1)
            # Biển vuông (0.9 - 2.2) hoặc biển dài (2.0 - 5.5)
            if 0.85 <= aspect <= 5.5 and 3000 < area < (w_frame * h_frame * 0.75):
                regions.append((x, y, w, h))

        # 2. Canny Edge dự phòng nếu điều kiện ánh sáng tối
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        edged = cv2.Canny(blur, 50, 200)
        c_contours, _ = cv2.findContours(edged, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        c_contours = sorted(c_contours, key=cv2.contourArea, reverse=True)[:6]
        for c in c_contours:
            peri = cv2.arcLength(c, True)
            approx = cv2.approxPolyDP(c, 0.02 * peri, True)
            if 4 <= len(approx) <= 6:
                x, y, w, h = cv2.boundingRect(approx)
                aspect = float(w) / max(h, 1)
                area = w * h
                if 0.9 <= aspect <= 5.5 and 3000 < area < (w_frame * h_frame * 0.75):
                    regions.append((x, y, w, h))

        # Lọc bỏ vùng trùng lặp
        unique = []
        for r in regions:
            x, y, w, h = r
            overlap = False
            for ux, uy, uw, uh in unique:
                if abs(x - ux) < 30 and abs(y - uy) < 30 and abs(w - uw) < 40:
                    overlap = True
                    break
            if not overlap:
                unique.append(r)

        return unique

    def parse_vietnamese_plate(self, ocr_results, offset_x=0, offset_y=0):
        """
        Phân tích kết quả OCR tìm biển số chuẩn Việt Nam:
        - Trường hợp 1: Biển 1 dòng dài (e.g., '36A-999.99', '29B1-8888')
        - Trường hợp 2: Biển 2 dòng vuông (Dòng 1: '36A' / '29B1', Dòng 2: '999.99' / '1234')
        """
        if not ocr_results:
            return None, 0.0, "", None

        # 1. Tìm biển 1 dòng
        for box, text, prob in ocr_results:
            clean = re.sub(r'[^A-Z0-9]', '', text.upper())
            m = re.findall(r'[0-9]{2}[A-Z]{1,2}[0-9]{4,5}', clean)
            if m:
                pts = np.array(box)
                bx = int(np.min(pts[:, 0]) + offset_x)
                by = int(np.min(pts[:, 1]) + offset_y)
                bw = int(np.max(pts[:, 0]) - np.min(pts[:, 0]))
                bh = int(np.max(pts[:, 1]) - np.min(pts[:, 1]))
                plate_norm = m[0]
                display = text.strip()
                return plate_norm, float(prob), display, (bx, by, bw, bh)

        # 2. Tìm cặp biển 2 dòng
        top_candidates = []
        bot_candidates = []

        for box, text, prob in ocr_results:
            clean = re.sub(r'[^A-Z0-9]', '', text.upper())
            pts = np.array(box)
            cx = np.mean(pts[:, 0])
            cy = np.mean(pts[:, 1])
            min_x = np.min(pts[:, 0])
            min_y = np.min(pts[:, 1])
            max_x = np.max(pts[:, 0])
            max_y = np.max(pts[:, 1])

            # Dòng trên: 2 số + 1-2 chữ cái (36A, 29B1, 51F, 30G, 36A1...)
            if re.match(r'^[0-9]{2}[A-Z]{1,2}[0-9]?$', clean):
                top_candidates.append({
                    'text': clean, 'raw': text.strip(), 'prob': prob,
                    'cx': cx, 'cy': cy, 'box': [min_x, min_y, max_x, max_y]
                })
            # Dòng dưới: 4 đến 5 số (99999, 999.99, 12345, 8888)
            elif re.match(r'^[0-9]{4,5}$', clean):
                bot_candidates.append({
                    'text': clean, 'raw': text.strip(), 'prob': prob,
                    'cx': cx, 'cy': cy, 'box': [min_x, min_y, max_x, max_y]
                })

        # Ghép cặp dòng trên và dòng dưới
        for top in top_candidates:
            for bot in bot_candidates:
                # Dòng dưới phải ở thấp hơn dòng trên
                if bot['cy'] > top['cy']:
                    plate_norm = f"{top['text']}{bot['text']}"
                    # Format đẹp: 36A-999.99
                    bot_t = bot['text']
                    if len(bot_t) == 5:
                        display = f"{top['text']}-{bot_t[:3]}.{bot_t[3:]}"
                    else:
                        display = f"{top['text']}-{bot_t}"

                    avg_prob = float((top['prob'] + bot['prob']) / 2.0)
                    bx = int(min(top['box'][0], bot['box'][0]) + offset_x)
                    by = int(min(top['box'][1], bot['box'][1]) + offset_y)
                    bw = int(max(top['box'][2], bot['box'][2]) - min(top['box'][0], bot['box'][0]))
                    bh = int(max(top['box'][3], bot['box'][3]) - min(top['box'][1], bot['box'][1]))

                    return plate_norm, avg_prob, display, (bx, by, bw, bh)

        return None, 0.0, "", None

    def detect_and_ocr(self, frame, force=False, cam_name="CAM"):
        """
        Nhận diện biển số xe từ khung hình:
        - Tự động crop các vùng nghi vấn (màu trắng hoặc cạnh)
        - In log ra console các ký tự quét được để người dùng kiểm tra
        - Trả về: (plate_norm, confidence, display_text, bbox)
        """
        if frame is None or self.reader is None:
            return None, 0.0, "", None

        h_frame, w_frame = frame.shape[:2]
        regions = self.find_plate_regions(frame)

        if not regions and force:
            # force=True: Quét vùng trung tâm 70%
            regions = [(int(w_frame * 0.15), int(h_frame * 0.15), int(w_frame * 0.7), int(h_frame * 0.7))]

        if not regions:
            return None, 0.0, "", None

        for (x, y, w, h) in regions[:3]:
            # Mở rộng nhẹ vùng crop (padding 8%)
            pad_x = int(w * 0.08)
            pad_y = int(h * 0.08)
            x1 = max(0, x - pad_x)
            y1 = max(0, y - pad_y)
            x2 = min(w_frame, x + w + pad_x)
            y2 = min(h_frame, y + h + pad_y)

            crop = frame[y1:y2, x1:x2]
            if crop.shape[0] < 20 or crop.shape[1] < 40:
                continue

            # Tiền xử lý tăng độ tương phản CLAHE
            gray_crop = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            enhanced = clahe.apply(gray_crop)

            try:
                results = self.reader.readtext(
                    enhanced,
                    allowlist='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. ',
                    detail=1
                )
            except Exception:
                results = []

            detected_words = [t.strip() for _, t, p in results if p > 0.25 and t.strip()]
            if detected_words:
                print(f"🔍 [{cam_name}] OCR đọc được: {' | '.join(detected_words)}")

            plate_norm, conf, display, text_box = self.parse_vietnamese_plate(results, offset_x=x1, offset_y=y1)
            if plate_norm:
                final_bbox = text_box if text_box else (x, y, w, h)
                print(f"✨ [{cam_name}] KHỚP BIỂN SỐ: {display} (Chuẩn: {plate_norm}) | Độ tin cậy: {conf*100:.1f}%")
                return plate_norm, conf, display, final_bbox

        return None, 0.0, "", (regions[0] if regions else None)
