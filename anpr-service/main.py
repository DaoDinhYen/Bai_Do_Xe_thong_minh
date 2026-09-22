import sys
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

import cv2
import time
import os
import re
import unicodedata
import threading
import numpy as np
from datetime import datetime

from config import (
    CAM_IN_INDEX, CAM_OUT_INDEX, CAM_IN_ID, CAM_OUT_ID,
    FRAME_WIDTH, FRAME_HEIGHT, CONFIDENCE_THRESHOLD,
    DEBOUNCE_SECONDS, SAVE_CAPTURES, CAPTURE_DIR
)
from detector import LicensePlateDetector
from api_client import BackendApiClient

class CameraStream:
    """Luồng đọc webcam độc lập (Background Thread) - Loại bỏ hoàn toàn độ trễ buffer"""
    def __init__(self, index, name="Camera", width=FRAME_WIDTH, height=FRAME_HEIGHT):
        self.index = index
        self.name = name
        self.width = width
        self.height = height
        self.cap = None
        self.frame = None
        self.ret = False
        self.running = False
        self.lock = threading.Lock()

        # Thử mở bằng DirectShow (chuẩn Windows mượt nhất)
        try:
            self.cap = cv2.VideoCapture(self.index, cv2.CAP_DSHOW)
            if not self.cap.isOpened():
                self.cap = cv2.VideoCapture(self.index)
        except Exception:
            self.cap = cv2.VideoCapture(self.index)

        if self.cap.isOpened():
            # Cấu hình MJPG để tránh nghẽn băng thông cổng USB khi cắm 2 webcam
            self.cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'MJPG'))
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
            self.cap.set(cv2.CAP_PROP_FPS, 30)
            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1) # Giữ buffer = 1 để video luôn là thời gian thực

            self.running = True
            self.thread = threading.Thread(target=self._capture_loop, daemon=True)
            self.thread.start()
            print(f"✅ [{self.name}] Kết nối thành công tại Index {self.index} (30 FPS, MJPG)")
        else:
            print(f"⚠️ [{self.name}] Không tìm thấy webcam tại Index {self.index}. Chuyển sang chế độ giả lập.")

    def _capture_loop(self):
        while self.running and self.cap.isOpened():
            ret, frame = self.cap.read()
            if ret and frame is not None:
                with self.lock:
                    self.ret = ret
                    self.frame = frame
            else:
                time.sleep(0.01)

    def read(self):
        with self.lock:
            if self.ret and self.frame is not None:
                return True, self.frame.copy()
            return False, None

    def is_active(self):
        return self.running and self.cap is not None and self.cap.isOpened()

    def stop(self):
        self.running = False
        if self.cap:
            self.cap.release()

def generate_local_folder_name(user_name=None, plate_number=""):
    now = datetime.now()
    prefix = ""
    if user_name:
        clean = unicodedata.normalize('NFKD', user_name).encode('ASCII', 'ignore').decode('utf-8').lower().strip()
        if "nguoi dung demo" in clean or "demo" in clean or "user1" in clean:
            prefix = "nguoi_demo_1"
        else:
            prefix = re.sub(r'[^a-z0-9]+', '_', clean).strip('_')
    if not prefix and plate_number:
        prefix = re.sub(r'[^A-Z0-9]', '', plate_number.upper())
    if not prefix:
        prefix = "khach_vang_lai"

    h = now.hour
    m = now.minute
    time_part = f"{h}h{m:02d}" if m > 0 else f"{h}h"
    date_part = f"{now.day}-{now.month}-{now.year}"
    return f"{prefix}_{time_part}_{date_part}"

class ANPRService:
    def __init__(self):
        self.detector = LicensePlateDetector()
        self.api_client = BackendApiClient()

        # Quản lý cooldown chống gửi lặp biển số
        self.last_sent_in = {"plate": "", "time": 0}
        self.last_sent_out = {"plate": "", "time": 0}

        # Khởi tạo thư mục lưu ảnh
        if SAVE_CAPTURES and not os.path.exists(CAPTURE_DIR):
            os.makedirs(CAPTURE_DIR, exist_ok=True)

        print("\n" + "=" * 60)
        print("📷 ĐANG KHỞI TẠO LUỒNG 2 WEBCAM KHÔNG ĐỘ TRỄ...")
        print("=" * 60)

        self.cam_in = CameraStream(CAM_IN_INDEX, name="CAMERA VAO [CAM_IN]")
        self.cam_out = CameraStream(CAM_OUT_INDEX, name="CAMERA RA  [CAM_OUT]")

        # Kết quả nhận diện gần nhất để vẽ overlay (chạy không làm lag video)
        self.data_lock = threading.Lock()
        self.detected_in = {"plate": "", "display": "", "conf": 0.0, "bbox": None, "time": 0}
        self.detected_out = {"plate": "", "display": "", "conf": 0.0, "bbox": None, "time": 0}

        # Bật luồng AI ngầm (Background AI Thread)
        self.running = True
        self.ai_thread = threading.Thread(target=self._ai_worker, daemon=True)
        self.ai_thread.start()

    def _ai_worker(self):
        """Luồng AI chạy ngầm - Nhận diện OCR định kỳ mà KHÔNG chặn khung hình hiển thị"""
        while self.running:
            # 1. Nhận diện Camera Vào
            if self.cam_in.is_active():
                ret, frame = self.cam_in.read()
                if ret and frame is not None:
                    plate, conf, display, bbox = self.detector.detect_and_ocr(frame, force=False, cam_name="CAM_IN")
                    if plate and conf >= CONFIDENCE_THRESHOLD:
                        with self.data_lock:
                            self.detected_in = {"plate": plate, "display": display, "conf": conf, "bbox": bbox, "time": time.time()}
                        self.process_detection(CAM_IN_ID, "IN", plate, conf, display, frame, bbox=bbox)
                    elif bbox:
                        with self.data_lock:
                            self.detected_in["bbox"] = bbox

            # 2. Nhận diện Camera Ra
            if self.cam_out.is_active():
                ret, frame = self.cam_out.read()
                if ret and frame is not None:
                    plate, conf, display, bbox = self.detector.detect_and_ocr(frame, force=False, cam_name="CAM_OUT")
                    if plate and conf >= CONFIDENCE_THRESHOLD:
                        with self.data_lock:
                            self.detected_out = {"plate": plate, "display": display, "conf": conf, "bbox": bbox, "time": time.time()}
                        self.process_detection(CAM_OUT_ID, "OUT", plate, conf, display, frame, bbox=bbox)
                    elif bbox:
                        with self.data_lock:
                            self.detected_out["bbox"] = bbox

            time.sleep(0.2)  # Nghỉ 200ms giữa các lần quét để CPU luôn mát mẻ

    def create_placeholder_frame(self, title, subtitle="Chế độ Giả lập / Phím 1, 2 để test"):
        """Khung hình hiển thị khi camera chưa kết nối"""
        frame = np.zeros((FRAME_HEIGHT, FRAME_WIDTH, 3), dtype=np.uint8)
        for y in range(FRAME_HEIGHT):
            frame[y, :] = [30 + int(y * 0.05), 25 + int(y * 0.03), 20]

        cv2.putText(frame, title, (30, 180), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 255), 2)
        cv2.putText(frame, subtitle, (30, 230), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (200, 200, 200), 1)
        cv2.putText(frame, "Phim [1]: Mo phong xe VAO (36A-999.99)", (30, 300), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (100, 255, 100), 1)
        cv2.putText(frame, "Phim [2]: Mo phong xe RA  (36A-999.99)", (30, 330), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (100, 200, 255), 1)
        cv2.putText(frame, "Phim [Q]: Thoat ung dung", (30, 370), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (150, 150, 150), 1)
        return frame

    def save_capture_image(self, frame, direction, folder_name, filename, plate="", bbox=None, conf=0.0, alt_folder_name=None):
        """Lưu ảnh snapshot webcam vào thư mục riêng của người/xe (Tương thích 100% Unicode Windows)"""
        if not SAVE_CAPTURES or frame is None:
            return None
        try:
            folder_path = os.path.join(CAPTURE_DIR, folder_name)
            os.makedirs(folder_path, exist_ok=True)
            filepath = os.path.join(folder_path, filename)

            # Tạo bản sao khung hình để vẽ ghi chú
            save_frame = frame.copy()
            h_img, w_img = save_frame.shape[:2]

            # 1. Vẽ bounding box ôm biển số nếu có
            if bbox:
                bx, by, bw, bh = bbox
                box_color = (0, 255, 0) if direction == "IN" else (0, 165, 255)
                cv2.rectangle(save_frame, (bx, by), (bx + bw, by + bh), box_color, 2)

            # 2. Thêm nhãn ghi chú sắc nét ở góc trên khung hình
            now_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
            dir_label = "CONG VAO (IN)" if direction == "IN" else "CONG RA (OUT)"
            conf_str = f" | Tin cay: {conf*100:.1f}%" if conf > 0 else ""
            label = f"[{dir_label}] {plate}{conf_str} | {now_str}"

            # Vẽ nền đen bán trong suốt cho nhãn
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 1)
            cv2.rectangle(save_frame, (10, 10), (20 + tw, 20 + th + 10), (0, 0, 0), -1)
            txt_color = (0, 255, 0) if direction == "IN" else (0, 200, 255)
            cv2.putText(save_frame, label, (15, 15 + th + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.55, txt_color, 2)

            # 3. Mã hóa JPEG vào bộ nhớ đệm (Tránh lỗi mã hóa đường dẫn tiếng Việt trên Windows của cv2.imwrite)
            ok, buf = cv2.imencode('.jpg', save_frame, [cv2.IMWRITE_JPEG_QUALITY, 92])
            if not ok:
                print(f"⚠️ [CHỤP ẢNH] Lỗi nén JPEG khung hình {filename}")
                return None

            # 4. Ghi file nhị phân bằng hàm chuẩn Python (Hỗ trợ 100% Unicode tiếng Việt 'BÀi tập lớn')
            with open(filepath, "wb") as f:
                f.write(buf.tobytes())

            filesize = os.path.getsize(filepath)

            # 5. Nếu có thư mục thay thế (ví dụ thư mục biển số và thư mục tên người), lưu đồng bộ cả 2 nơi
            if alt_folder_name and alt_folder_name != folder_name:
                alt_folder_path = os.path.join(CAPTURE_DIR, alt_folder_name)
                os.makedirs(alt_folder_path, exist_ok=True)
                alt_filepath = os.path.join(alt_folder_path, filename)
                try:
                    with open(alt_filepath, "wb") as f:
                        f.write(buf.tobytes())
                except Exception:
                    pass

            try:
                rel_web_path = f"/captures/{folder_name}/{filename}"
                print("=" * 65)
                print(f"📸 [ĐÃ CHỤP & LƯU ẢNH ANPR THÀNH CÔNG]")
                print(f"   - Cổng: {dir_label}")
                print(f"   - Biển số: {plate}")
                print(f"   - Thư mục: captures/{folder_name}/")
                print(f"   - Tên tệp: {filename} ({filesize} bytes)")
                print("=" * 65 + "\n")
            except Exception:
                pass
            return f"/captures/{folder_name}/{filename}"
        except Exception as e:
            print(f"❌ [CHỤP ẢNH] Lỗi khi lưu ảnh chụp {filename}: {e}")
            return None

    def process_detection(self, camera_id, direction, plate, confidence, display_text, frame, bbox=None):
        """Gửi kết quả nhận diện lên Backend Node.js và chụp lưu ảnh vào thư mục riêng"""
        now = time.time()
        tracker = self.last_sent_in if direction == "IN" else self.last_sent_out

        if plate == tracker["plate"] and (now - tracker["time"] < DEBOUNCE_SECONDS):
            return

        tracker["plate"] = plate
        tracker["time"] = now

        filename = "anh_vao.jpg" if direction == "IN" else "anh_ra.jpg"

        print(f"\n🚗 [PHÁT HIỆN BIỂN SỐ] {camera_id} ({direction}): {display_text} [{plate}] | Độ tin cậy: {confidence*100:.1f}%")

        # 1. Gửi thông tin nhận diện lên Backend
        ok, res_data = self.api_client.send_detection(
            camera_id=camera_id,
            plate_number=plate,
            confidence=confidence,
            direction=direction,
            raw_plate=display_text
        )

        folder_name = None
        if ok and isinstance(res_data, dict):
            folder_name = res_data.get("data", {}).get("folder_name")
            backend_file = res_data.get("data", {}).get("filename")
            if backend_file:
                filename = backend_file

        local_plate_folder = generate_local_folder_name(None, plate)

        # Nếu backend chưa phản hồi -> Dùng folder cục bộ theo biển số
        if not folder_name:
            folder_name = local_plate_folder

        # 2. Chụp và lưu ảnh webcam vào đúng thư mục (Lưu cả folder_name và local_plate_folder dự phòng)
        web_img_path = self.save_capture_image(
            frame=frame,
            direction=direction,
            folder_name=folder_name,
            filename=filename,
            plate=display_text or plate,
            bbox=bbox,
            conf=confidence,
            alt_folder_name=local_plate_folder
        )

        # 3. Cập nhật lại đường dẫn ảnh cho Backend
        if web_img_path:
            self.api_client.update_image_path(camera_id, plate, direction, web_img_path)

    def draw_overlays(self, frame, direction):
        """Vẽ khung nhận diện biển số thời gian thực lên video"""
        now = time.time()
        data = self.detected_in if direction == "IN" else self.detected_out

        with self.data_lock:
            bbox = data.get("bbox")
            plate = data.get("plate")
            display = data.get("display") or plate
            conf = data.get("conf", 0.0)
            last_t = data.get("time", 0)

        # 1. Vẽ bounding box ôm sát biển số
        if bbox:
            x, y, w, h = bbox
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)

            # Nếu vừa nhận diện trong 4s gần đây -> Vẽ thẻ tên ngay trên box
            if plate and (now - last_t < 4.0):
                tag = f"{display} ({conf*100:.0f}%)"
                (tw, th), _ = cv2.getTextSize(tag, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
                ty = max(y - 8, th + 5)
                cv2.rectangle(frame, (x, ty - th - 4), (x + tw + 6, ty + 4), (0, 0, 0), -1)
                cv2.rectangle(frame, (x, ty - th - 4), (x + tw + 6, ty + 4), (0, 255, 0), 1)
                cv2.putText(frame, tag, (x + 3, ty), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

        # 2. Bảng thông báo lớn ở góc dưới
        if plate and (now - last_t < 4.0):
            cv2.rectangle(frame, (15, FRAME_HEIGHT - 70), (330, FRAME_HEIGHT - 15), (0, 0, 0), -1)
            cv2.rectangle(frame, (15, FRAME_HEIGHT - 70), (330, FRAME_HEIGHT - 15), (0, 255, 255), 2)
            cv2.putText(frame, f"BIEN SO: {display}", (25, FRAME_HEIGHT - 43),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 255, 255), 2)
            cv2.putText(frame, f"DO CHINH XAC: {conf*100:.1f}%", (25, FRAME_HEIGHT - 23),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, (180, 255, 180), 1)

    def run(self):
        """Vòng lặp hiển thị video siêu mượt (30+ FPS) trên Main Thread"""
        print("\n" + "=" * 65)
        print("🚀 HỆ THỐNG ANPR 2 WEBCAM SIÊU MƯỢT ĐANG CHẠY (MULTI-THREADED)")
        print("Phím tắt tiện ích:")
        print("  [1] - Giả lập xe Vào : 36A-999.99")
        print("  [2] - Giả lập xe Ra  : 36A-999.99")
        print("  [i] - Quét tức thì khung hình Camera Vào")
        print("  [o] - Quét tức thì khung hình Camera Ra")
        print("  [Q] - Thoát ứng dụng")
        print("=" * 65 + "\n")

        fps_counter = 0
        fps_time = time.time()
        current_fps = 30.0

        while True:
            # 1. Lấy khung hình Camera Vào (Không bị chặn)
            if self.cam_in.is_active():
                ret_in, frame_in = self.cam_in.read()
                if not ret_in or frame_in is None:
                    frame_in = self.create_placeholder_frame("CAMERA VAO (DANG CHO HINH)")
            else:
                frame_in = self.create_placeholder_frame("CAMERA VAO [CAM_IN]", f"Webcam Index {CAM_IN_INDEX} chua mo")

            # 2. Lấy khung hình Camera Ra (Không bị chặn)
            if self.cam_out.is_active():
                ret_out, frame_out = self.cam_out.read()
                if not ret_out or frame_out is None:
                    frame_out = self.create_placeholder_frame("CAMERA RA (DANG CHO HINH)")
            else:
                frame_out = self.create_placeholder_frame("CAMERA RA [CAM_OUT]", f"Webcam Index {CAM_OUT_INDEX} chua mo")

            # 3. Tính toán FPS thực tế
            fps_counter += 1
            if time.time() - fps_time >= 1.0:
                current_fps = fps_counter / (time.time() - fps_time)
                fps_counter = 0
                fps_time = time.time()

            # 4. Vẽ overlay thông tin
            self.draw_overlays(frame_in, "IN")
            self.draw_overlays(frame_out, "OUT")

            cv2.putText(frame_in, f"[CAM IN] CONG VAO ({current_fps:.0f} FPS)", (20, 35),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            cv2.putText(frame_out, f"[CAM OUT] CONG RA ({current_fps:.0f} FPS)", (20, 35),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 165, 255), 2)

            # 5. Ghép 2 khung hình song song
            combined = np.hstack((frame_in, frame_out))

            # Thanh trạng thái dưới cùng
            status_bar = np.zeros((38, combined.shape[1], 3), dtype=np.uint8)
            cv2.putText(
                status_bar,
                "Phim tat: [1] Xe Vao (36A-999.99) | [2] Xe Ra (36A-999.99) | [i] Quet IN | [o] Quet OUT | [Q] Thoat",
                (20, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1
            )
            final_view = np.vstack((combined, status_bar))

            # Hiển thị
            cv2.imshow("SMART PARKING - DUAL WEBCAM ANPR (30 FPS)", final_view)

            # 6. Bắt phím điều khiển (Độ trễ phản hồi tức thì 1ms)
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q') or key == 27:
                print("👋 Đang tắt dịch vụ ANPR...")
                break
            elif key == ord('1'):
                print("\n[MANUAL] Kích hoạt giả lập: Xe 36A-999.99 vào cổng IN")
                self.process_detection(CAM_IN_ID, "IN", "36A99999", 0.99, "36A-999.99", frame_in)
            elif key == ord('2'):
                print("\n[MANUAL] Kích hoạt giả lập: Xe 36A-999.99 ra cổng OUT")
                self.process_detection(CAM_OUT_ID, "OUT", "36A99999", 0.99, "36A-999.99", frame_out)
            elif key == ord('i'):
                print("\n[MANUAL] Đang quét tức thì Camera Vào...")
                plate, conf, display, bbox = self.detector.detect_and_ocr(frame_in, force=True, cam_name="CAM_IN")
                if plate:
                    with self.data_lock:
                        self.detected_in = {"plate": plate, "display": display, "conf": conf, "bbox": bbox, "time": time.time()}
                    self.process_detection(CAM_IN_ID, "IN", plate, conf, display, frame_in, bbox=bbox)
                else:
                    print("⚠️ Không tìm thấy biển số trong khung hình Camera Vào.")
            elif key == ord('o'):
                print("\n[MANUAL] Đang quét tức thì Camera Ra...")
                plate, conf, display, bbox = self.detector.detect_and_ocr(frame_out, force=True, cam_name="CAM_OUT")
                if plate:
                    with self.data_lock:
                        self.detected_out = {"plate": plate, "display": display, "conf": conf, "bbox": bbox, "time": time.time()}
                    self.process_detection(CAM_OUT_ID, "OUT", plate, conf, display, frame_out, bbox=bbox)
                else:
                    print("⚠️ Không tìm thấy biển số trong khung hình Camera Ra.")

# ============================================================
# FLASK MJPEG WEB STREAMING SERVER (PORT 5000)
# ============================================================
from flask import Flask, Response, jsonify

flask_app = Flask(__name__)
active_service = None

def generate_mjpeg_stream(direction="IN"):
    """Tạo luồng video MJPEG truyền trực tiếp lên trình duyệt Web"""
    while True:
        frame = None
        if active_service:
            cam = active_service.cam_in if direction == "IN" else active_service.cam_out
            if cam and cam.is_active():
                ret, f = cam.read()
                if ret and f is not None:
                    frame = f.copy()

            if frame is None:
                title = "CAM VAO (CONG IN)" if direction == "IN" else "CAM RA (CONG OUT)"
                frame = active_service.create_placeholder_frame(title, "Dang cho webcam ket noi...")

            # Vẽ overlay nhận diện thời gian thực lên khung hình stream
            active_service.draw_overlays(frame, direction)

            # Mã hóa JPEG chất lượng 80
            ret2, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            if ret2:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')
        time.sleep(0.04)  # ~25 FPS

@flask_app.route('/stream/in')
def stream_cam_in():
    return Response(generate_mjpeg_stream("IN"),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@flask_app.route('/stream/out')
def stream_cam_out():
    return Response(generate_mjpeg_stream("OUT"),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@flask_app.route('/status')
def stream_status():
    if not active_service:
        return jsonify({"status": "OFFLINE"})
    with active_service.data_lock:
        return jsonify({
            "status": "ONLINE",
            "detected_in": active_service.detected_in,
            "detected_out": active_service.detected_out
        })

if __name__ == "__main__":
    service = ANPRService()
    active_service = service

    # Bật máy chủ Flask Web Streaming trên luồng nền (Background Daemon Thread)
    def run_web_server():
        import logging
        log = logging.getLogger('werkzeug')
        log.setLevel(logging.ERROR)
        try:
            print("🌐 [WEB STREAM] Khởi động máy chủ Web Camera Stream tại http://localhost:5000...")
            flask_app.run(host='0.0.0.0', port=5000, threaded=True, debug=False, use_reloader=False)
        except Exception as e:
            print(f"⚠️ Không thể khởi động Web Stream trên cổng 5000: {e}")

    stream_thread = threading.Thread(target=run_web_server, daemon=True)
    stream_thread.start()

    service.run()
