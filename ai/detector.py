import cv2
from ultralytics import YOLO
import base64
import numpy as np

class ObjectDetector:
    def __init__(self):
        # yolov8n = 가장 가벼운 버전, 처음 실행시 자동 다운로드됨
        self.model = YOLO('yolov8n.pt')
        print("YOLOv8 모델 로드 완료!")

    def detect_from_base64(self, image_base64: str):
        # base64 이미지를 numpy 배열로 변환
        img_data = base64.b64decode(image_base64)
        np_arr = np.frombuffer(img_data, np.uint8)
        image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        # YOLOv8로 감지 실행
        results = self.model(image)

        # 결과 정리
        detections = []
        for result in results:
            for box in result.boxes:
                detection = {
                    "label": self.model.names[int(box.cls)],  # 감지된 물체 이름
                    "confidence": round(float(box.conf), 2),  # 확신도 (0~1)
                    "bbox": {
                        "x1": int(box.xyxy[0][0]),
                        "y1": int(box.xyxy[0][1]),
                        "x2": int(box.xyxy[0][2]),
                        "y2": int(box.xyxy[0][3]),
                    }
                }
                detections.append(detection)

        return detections

# 전역으로 하나만 만들어서 재사용 (매 요청마다 모델 로드하면 느림)
detector = ObjectDetector()