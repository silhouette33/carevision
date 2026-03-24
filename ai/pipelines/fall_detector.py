import cv2
import mediapipe as mp
import base64
import numpy as np
from collections import defaultdict

mp_pose = mp.solutions.pose
pose = mp_pose.Pose(
    static_image_mode=False,
    model_complexity=1,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
)


class FallDetector:
    """
    낙상 감지 파이프라인
    - MediaPipe Pose로 관절 좌표 추출
    - 머리(Nose) Y > 골반(Hip) Y → 낙상 의심
    - 연속 3프레임 유지 시 위급 확정 (오탐지 방지)
    """

    CONSECUTIVE_THRESHOLD = 3  # 연속 프레임 기준

    def __init__(self):
        # 카메라별 연속 낙상 프레임 카운터
        self.fall_counters = defaultdict(int)

    def _decode_image(self, image_base64: str) -> np.ndarray:
        img_data = base64.b64decode(image_base64)
        np_arr = np.frombuffer(img_data, np.uint8)
        return cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    def _extract_landmarks(self, image: np.ndarray):
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = pose.process(image_rgb)
        if not results.pose_landmarks:
            return None
        return results.pose_landmarks.landmark

    def _check_fall_pose(self, landmarks) -> bool:
        """머리가 골반보다 낮으면 낙상 의심"""
        nose_y = landmarks[mp_pose.PoseLandmark.NOSE].y
        left_hip_y = landmarks[mp_pose.PoseLandmark.LEFT_HIP].y
        right_hip_y = landmarks[mp_pose.PoseLandmark.RIGHT_HIP].y
        hip_y = (left_hip_y + right_hip_y) / 2

        # 어깨 높이 차이로 수평 여부 판단
        left_shoulder_y = landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER].y
        right_shoulder_y = landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER].y
        shoulder_y = (left_shoulder_y + right_shoulder_y) / 2

        # 조건 1: 머리가 골반보다 낮거나 같음
        head_below_hip = nose_y > hip_y

        # 조건 2: 어깨와 골반의 높이 차이가 작음 (몸이 수평에 가까움)
        body_horizontal = abs(shoulder_y - hip_y) < 0.15

        return head_below_hip or body_horizontal

    def detect(self, image_base64: str, camera_id: str = "default") -> dict:
        image = self._decode_image(image_base64)
        landmarks = self._extract_landmarks(image)

        # 사람이 감지되지 않은 경우
        if landmarks is None:
            self.fall_counters[camera_id] = 0
            return {
                "detected": False,
                "confidence": 0.0,
                "type": "FALL",
                "status": "no_person",
            }

        is_fall_pose = self._check_fall_pose(landmarks)

        if is_fall_pose:
            self.fall_counters[camera_id] += 1
        else:
            self.fall_counters[camera_id] = 0

        count = self.fall_counters[camera_id]

        # 상태 판정
        if count >= self.CONSECUTIVE_THRESHOLD:
            status = "emergency"
            confidence = min(0.6 + (count - self.CONSECUTIVE_THRESHOLD) * 0.1, 0.99)
        elif count >= 2:
            status = "suspected"
            confidence = 0.5
        elif count >= 1:
            status = "caution"
            confidence = 0.3
        else:
            status = "normal"
            confidence = 0.0

        return {
            "detected": count >= self.CONSECUTIVE_THRESHOLD,
            "confidence": round(confidence, 2),
            "type": "FALL",
            "status": status,
            "consecutive_frames": count,
        }

    def reset(self, camera_id: str = "default"):
        """특정 카메라의 카운터 리셋"""
        self.fall_counters[camera_id] = 0


fall_detector = FallDetector()
