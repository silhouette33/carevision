"""
hand_to_mouth_lstm.pt 단독 테스트 스크립트

사용:
  .\venv\Scripts\python.exe test_hand_to_mouth.py            # 웹캠 실시간 테스트
  .\venv\Scripts\python.exe test_hand_to_mouth.py video.mp4  # 비디오 파일 테스트

키:
  q: 종료
  r: 버퍼 리셋
"""
import sys
import base64
import time

import cv2

from pipelines.hand_to_mouth_detector import HandToMouthDetector


def encode_jpeg_base64(frame) -> str:
    ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
    if not ok:
        return ""
    return base64.b64encode(buf.tobytes()).decode("ascii")


def main():
    source = 0 if len(sys.argv) < 2 else sys.argv[1]
    if isinstance(source, str) and source.isdigit():
        source = int(source)

    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        print(f"Cannot open source: {source}")
        return

    detector = HandToMouthDetector()
    print(f"Model loaded on {detector.device}")
    print("Press 'q' to quit, 'r' to reset buffer.")

    last_t = time.time()
    fps = 0.0

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        b64 = encode_jpeg_base64(frame)
        result = detector.detect(b64, camera_id="test")

        # 간단한 오버레이
        status = result["status"]
        conf = result["confidence"]
        detected = result["detected"]
        color = (0, 0, 255) if detected else ((0, 200, 255) if "suspect" in status else (0, 255, 0))
        text = f"{status}  p={conf:.2f}"
        cv2.putText(frame, text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
        if detected:
            cv2.putText(frame, "HAND -> MOUTH DETECTED",
                        (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)

        # FPS
        now = time.time()
        fps = 0.9 * fps + 0.1 * (1.0 / max(now - last_t, 1e-6))
        last_t = now
        cv2.putText(frame, f"{fps:4.1f} fps", (10, frame.shape[0] - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)

        cv2.imshow("hand_to_mouth test", frame)
        k = cv2.waitKey(1) & 0xFF
        if k == ord("q"):
            break
        if k == ord("r"):
            detector.reset("test")
            print("buffer reset")

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
