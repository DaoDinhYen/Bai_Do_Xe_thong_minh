import requests
import json
from datetime import datetime
from config import DETECTION_ENDPOINT

class BackendApiClient:
    """Quản lý giao tiếp HTTP gửi kết quả nhận diện biển số về Backend Node.js"""
    
    def __init__(self, endpoint=DETECTION_ENDPOINT):
        self.endpoint = endpoint
        self.session = requests.Session()

    def send_detection(self, camera_id, plate_number, confidence, direction="IN", raw_plate=None, image_path=None):
        """
        Gửi kết quả nhận diện lên API: POST /api/camera/detection
        """
        payload = {
            "camera_id": camera_id,
            "plate_number": plate_number,
            "detected_plate": raw_plate or plate_number,
            "confidence": round(float(confidence), 2),
            "direction": direction,
            "image_path": image_path,
            "timestamp": datetime.now().isoformat()
        }

        try:
            response = self.session.post(self.endpoint, json=payload, timeout=5)
            if response.status_code in [200, 201]:
                res_data = response.json()
                print(f"✅ [API OK] {camera_id} ({direction}): {plate_number} (Conf: {confidence*100:.1f}%) -> Status: {res_data.get('data', {}).get('verification_status')}")
                return True, res_data
            else:
                print(f"⚠️ [API WARN] Status {response.status_code}: {response.text}")
                return False, response.text
        except requests.exceptions.ConnectionError:
            print(f"❌ [API ERROR] Không thể kết nối tới Backend tại: {self.endpoint}. Hãy chắc chắn server Node.js đang chạy.")
            return False, "Connection error"
        except Exception as e:
            print(f"❌ [API ERROR] Lỗi gửi dữ liệu: {e}")
            return False, str(e)

    def update_image_path(self, camera_id, plate_number, direction, image_path):
        """Cập nhật đường dẫn ảnh sau khi chụp: POST /api/camera/detection/image"""
        url = self.endpoint + "/image"
        try:
            self.session.post(url, json={
                "camera_id": camera_id,
                "plate_number": plate_number,
                "direction": direction,
                "image_path": image_path
            }, timeout=3)
        except Exception:
            pass
