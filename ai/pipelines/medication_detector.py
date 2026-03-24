import cv2
import mediapipe as mp
import base64
import numpy as np
from collections import defaultdict
from ultralytics import YOLO
import os

mp_pose = mp.solutions.pose
pose = mp_pose.Pose(
    static_image_mode=False,
    model_complexity=1,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
)

# 파인튜닝 모델이 있으면 사용, 없으면 기본 모델
MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "medication.pt")
FALLBACK_MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "yolov8n.pt")


class MedicationDetector:
    """
    복약 감지 파이프라인
    - YOLOv8로 약통/알약 객체 감지
    - MediaPipe Pose로 손-입 이동 동작 분석
    - 연속 프레임 기반으로 복약 여부 판정
    """

    # 기본 YOLOv8 모델에서 약 관련으로 쓸 수 있는 클래스
    # 파인튜닝 모델에서는 pill, pill_bottle, medicine 등이 됨
    MEDICATION_LABELS = {"bottle", "cup", "pill", "pill_bottle", "medicine", "tablet"}

    CONSECUTIVE_THRESHOLD = 3
    CONFIDENCE_THRESHOLD = 0.6

    def __init__(self):
        if os.path.exists(MODEL_PATH):
            self.model = YOLO(MODEL_PATH)
            print(f"복약 감지 모델 로드: {MODEL_PATH}")
        else:
            self.model = YOLO(FALLBACK_MODEL_PATH)
            print(f"파인튜닝 모델 없음, 기본 모델 사용: {FALLBACK_MODEL_PATH}")

        # 카메라별 상태 추적
        self.medication_counters = defaultdict(int)  # 약 객체 연속 감지 카운터
        self.hand_mouth_counters = defaultdict(int)  # 손-입 이동 연속 카운터

    def _decode_image(self, image_base64: str) -> np.ndarray:
        img_data = base64.b64decode(image_base64)
        np_arr = np.frombuffer(img_data, np.uint8)
        return cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    def _detect_medication_objects(self, image: np.ndarray) -> list:
        """YOLOv8로 약 관련 객체 감지"""
        results = self.model(image, verbose=False)
        detections = []
        for result in results:
            for box in result.boxes:
                label = self.model.names[int(box.cls)]
                conf = float(box.conf)
                if conf >= self.CONFIDENCE_THRESHOLD and label in self.MEDICATION_LABELS:
                    detections.append({
                        "label": label,
                        "confidence": round(conf, 2),
                        "bbox": {
                            "x1": int(box.xyxy[0][0]),
                            "y1": int(box.xyxy[0][1]),
                            "x2": int(box.xyxy[0][2]),
                            "y2": int(box.xyxy[0][3]),
                        },
                    })
        return detections

    def _check_hand_near_mouth(self, landmarks) -> bool:
        """손이 입 근처에 있는지 확인 (복약 동작)"""
        mouth_y = landmarks[mp_pose.PoseLandmark.MOUTH_LEFT].y
        mouth_x = (
            landmarks[mp_pose.PoseLandmark.MOUTH_LEFT].x
            + landmarks[mp_pose.PoseLandmark.MOUTH_RIGHT].x
        ) / 2

        # 왼손, 오른손 손목 좌표
        left_wrist = landmarks[mp_pose.PoseLandmark.LEFT_WRIST]
        right_wrist = landmarks[mp_pose.PoseLandmark.RIGHT_WRIST]

        # 손목이 입 근처에 있는지 (거리 기반)
        threshold = 0.12  # 정규화 좌표 기준

        left_dist = ((left_wrist.x - mouth_x) ** 2 + (left_wrist.y - mouth_y) ** 2) ** 0.5
        right_dist = ((right_wrist.x - mouth_x) ** 2 + (right_wrist.y - mouth_y) ** 2) ** 0.5

        return left_dist < threshold or right_dist < threshold

    def detect(self, image_base64: str, camera_id: str = "default") -> dict:
        image = self._decode_image(image_base64)

        # 1. 약 객체 감지
        med_objects = self._detect_medication_objects(image)
        has_medication = len(med_objects) > 0

        # 2. 손-입 동작 감지
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        pose_results = pose.process(image_rgb)
        hand_near_mouth = False

        if pose_results.pose_landmarks:
            hand_near_mouth = self._check_hand_near_mouth(
                pose_results.pose_landmarks.landmark
            )

        # 3. 연속 프레임 카운터 업데이트
        if has_medication:
            self.medication_counters[camera_id] += 1
        else:
            self.medication_counters[camera_id] = 0

        if hand_near_mouth:
            self.hand_mouth_counters[camera_id] += 1
        else:
            self.hand_mouth_counters[camera_id] = 0

        med_count = self.medication_counters[camera_id]
        hand_count = self.hand_mouth_counters[camera_id]

        # 4. 복약 상태 판정
        # 약 감지 + 손-입 동작 모두 연속 감지 → 복약 완료
        if med_count >= self.CONSECUTIVE_THRESHOLD and hand_count >= self.CONSECUTIVE_THRESHOLD:
            status = "completed"
            confidence = min(0.7 + (min(med_count, hand_count) - self.CONSECUTIVE_THRESHOLD) * 0.1, 0.99)
            detected = True
        # 약 감지 또는 손-입 동작 중 하나만 연속 감지 → 복약 의심
        elif med_count >= self.CONSECUTIVE_THRESHOLD or hand_count >= 2:
            status = "suspected"
            confidence = 0.4
            detected = False
        else:
            status = "pending"
            confidence = 0.0
            detected = False

        return {
            "detected": detected,
            "confidence": round(confidence, 2),
            "type": "MEDICATION",
            "status": status,
            "label": med_objects[0]["label"] if med_objects else None,
            "medication_objects": med_objects,
        }

    def reset(self, camera_id: str = "default"):
        self.medication_counters[camera_id] = 0
        self.hand_mouth_counters[camera_id] = 0


medication_detector = MedicationDetector()
