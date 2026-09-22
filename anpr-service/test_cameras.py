import cv2
import time

def test_single_cam(index):
    print(f"\n================ ĐANG THỬ INDEX {index} ================")
    # Dùng DirectShow để cấu hình thông số chuẩn
    cap = cv2.VideoCapture(index, cv2.CAP_DSHOW)
    
    if not cap.isOpened():
        print(f"[-] Không thể mở kết nối với Index {index}")
        return

    # Ép dùng codec MJPG để tránh nghẽn băng thông USB
    cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'MJPG'))
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_FPS, 30)

    time.sleep(1) # Chờ cảm biến nhận diện

    # Thử đọc 15 frame đầu tiên
    success = False
    for i in range(15):
        ret, frame = cap.read()
        if ret and frame is not None:
            success = True
            break
        time.sleep(0.05)

    if not success:
        print(f"[-] Index {index}: Mở được nhưng KHÔNG LẤY ĐƯỢC HÌNH (Frame None/False).")
        cap.release()
        return

    print(f"[+] Index {index}: LÊN HÌNH THÀNH CÔNG! Nhấn 'q' để kiểm tra tiếp...")
    while True:
        ret, frame = cap.read()
        if not ret or frame is None:
            continue
        
        cv2.putText(frame, f"CAM INDEX: {index}", (20, 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        cv2.imshow("Preview Camera", frame)
        
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    # Thử quét lần lượt index 0, 1, 2
    for idx in [0, 1, 2]:
        test_single_cam(idx)