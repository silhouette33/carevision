import os
import cv2
import mediapipe as mp
import base64
import numpy as np
from collections import defaultdict, deque

mp_pose = mp.solutions.pose

# 감지 민감도를 낮춰 엎드린/누운 자세도 최대한 잡게 설정
pose = mp_pose.Pose(
    static_image_mode=False,
    model_complexity=2,
    min_detection_confidence=0.3,
    min_tracking_confidence=0.3,
)

LEFT_HIP_IDX = 23
RIGHT_HIP_IDX = 24
SEQUENCE_LEN = 30
NUM_FEATURES = 132  # 33 keypoints × 4 (x, y, z, visibility)
FALL_CLASS = 0
FALL_THRESHOLD = 0.5

# ── 휴리스틱 튜닝 상수 ─────────────────────────
# hip_drop(속도) 조건은 앉기 동작도 그대로 잡아서 제거했다.
# torso_horizontal 은 워밍업 동안만 사용하고, LSTM 활성 후엔
# head_below_hip(강한 신호)만 휴리스틱으로 OR 결합한다.
HORIZONTAL_TORSO_THRESHOLD = 0.10   # |shoulder_y - hip_y| 이하면 몸통 수평

# YOLO 폴백: bbox 가로/세로 비율이 이 값 이상이면 수평 자세(낙상 후보)로 판단
# 2.0 이상 = 완전히 누운 자세만 해당 (앉거나 기댄 자세 오탐 방지)
YOLO_HORIZONTAL_RATIO = 2.0

_MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "models", "fall_lstm_vB_best.keras"
)
_lstm_model = None

# YOLOv8 기본 모델 (person 클래스 감지용 폴백)
_yolo_model = None


def _get_yolo():
    global _yolo_model
    if _yolo_model is not None:
        return _yolo_model
    try:
        from ultralytics import YOLO
        yolo_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "yolov8n.pt")
        _yolo_model = YOLO(yolo_path)
    except Exception as e:
        print(f"[FallDetector] YOLO 로드 실패: {e}")
    return _yolo_model


def _build_and_load_model():
    """모델 구조 직접 구성 후 weights만 로드 (Keras 버전 호환 우회)."""
    import zipfile, tempfile
    import keras

    inputs = keras.layers.Input(shape=(SEQUENCE_LEN, NUM_FEATURES), name="pose_seq")
    x = keras.layers.Masking(mask_value=0.0)(inputs)
    x = keras.layers.Bidirectional(keras.layers.LSTM(128, return_sequences=True))(x)
    x = keras.layers.Dropout(0.3)(x)
    x = keras.layers.Bidirectional(keras.layers.LSTM(64))(x)
    x = keras.layers.Dropout(0.3)(x)
    x = keras.layers.Dense(64, activation="relu")(x)
    x = keras.layers.Dropout(0.3)(x)
    out = keras.layers.Dense(5, activation="softmax", name="logits")(x)
    model = keras.Model(inputs, out)

    with zipfile.ZipFile(_MODEL_PATH) as z:
        with tempfile.TemporaryDirectory() as tmpdir:
            z.extract("model.weights.h5", tmpdir)
            model.load_weights(os.path.join(tmpdir, "model.weights.h5"))

    return model


def _get_model():
    global _lstm_model
    if _lstm_model is not None:
        return _lstm_model
    try:
        _lstm_model = _build_and_load_model()
        print("[FallDetector] LSTM 모델 로드 완료")
    except Exception as e:
        print(f"[FallDetector] LSTM 모델 로드 실패 — 휴리스틱 폴백: {e}")
    return _lstm_model


def _normalize_sequence(seq: np.ndarray) -> np.ndarray:
    """Hip-centering + 95th-percentile scale (훈련 전처리와 동일)."""
    T = seq.shape[0]
    pts = seq.astype(np.float32).reshape(T, 33, 4).copy()
    hip = (pts[:, LEFT_HIP_IDX, :3] + pts[:, RIGHT_HIP_IDX, :3]) / 2.0
    pts[:, :, :3] -= hip[:, None, :]
    vis = pts[:, :, 3].reshape(-1)
    xy = pts[:, :, :2].reshape(-1, 2)
    mask = vis > 0.1
    if mask.sum() > 10:
        xyv = xy[mask]
        scale = max(
            float(np.percentile(np.abs(xyv[:, 0]), 95)),
            float(np.percentile(np.abs(xyv[:, 1]), 95)),
            1e-3,
        )
    else:
        scale = 1.0
    pts[:, :, :3] /= scale
    return pts.reshape(T, NUM_FEATURES)


def _heuristic_fall(landmarks, strong_only: bool = False) -> tuple[bool, str]:
    """휴리스틱 낙상 판정.

    조건:
    (a) head_below_hip  : 머리가 골반보다 아래 (강한 신호 — 누움/엎드림)
    (b) torso_horizontal: 어깨-골반 y 차이가 매우 작음 (몸통 수평)
                          — strong_only=True 이면 사용하지 않음

    앉기 동작은 hip이 떨어지더라도 머리/어깨가 계속 hip 위에 있으므로 두 조건
    모두 false → 낙상 아님. strong_only 는 LSTM 활성 이후 휴리스틱 범위를 좁힐 때 사용.

    반환: (is_fall, reason)
    """
    nose_y = landmarks[mp_pose.PoseLandmark.NOSE].y
    hip_y = (
        landmarks[mp_pose.PoseLandmark.LEFT_HIP].y
        + landmarks[mp_pose.PoseLandmark.RIGHT_HIP].y
    ) / 2
    shoulder_y = (
        landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER].y
        + landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER].y
    ) / 2

    # (a) 머리가 골반 아래
    if nose_y > hip_y:
        return True, "head_below_hip"

    # (b) 몸통 수평 — 워밍업 동안만
    if not strong_only and abs(shoulder_y - hip_y) < HORIZONTAL_TORSO_THRESHOLD:
        return True, "torso_horizontal"

    return False, "upright"


def _yolo_fall_fallback(image: np.ndarray) -> tuple[bool, float]:
    """
    MediaPipe가 사람을 못 잡을 때 YOLO bbox로 수평 자세 판단.
    사람 bbox의 가로/세로 비율이 YOLO_HORIZONTAL_RATIO 이상 → 낙상 후보.
    """
    yolo = _get_yolo()
    if yolo is None:
        return False, 0.0
    try:
        results = yolo(image, verbose=False, classes=[0])  # class 0 = person
        for r in results:
            for box in r.boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                w = x2 - x1
                h = y2 - y1
                if h < 1:
                    continue
                ratio = w / h
                conf = float(box.conf[0])
                if ratio >= YOLO_HORIZONTAL_RATIO and conf >= 0.3:
                    # 수평 bbox → 낙상 가능성. 비율이 클수록 신뢰도 높임
                    fall_conf = min(0.75, 0.4 + (ratio - YOLO_HORIZONTAL_RATIO) * 0.1)
                    return True, round(fall_conf, 2)
    except Exception:
        pass
    return False, 0.0


class FallDetector:
    CONSECUTIVE_THRESHOLD = 3

    def __init__(self):
        self.fall_counters = defaultdict(int)
        self.frame_buffers: dict[str, deque] = defaultdict(
            lambda: deque(maxlen=SEQUENCE_LEN)
        )
        self.lstm_started: dict[str, bool] = defaultdict(bool)

    def _decode_image(self, image_base64: str) -> np.ndarray:
        img_data = base64.b64decode(image_base64)
        np_arr = np.frombuffer(img_data, np.uint8)
        return cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    def _extract_features(self, image: np.ndarray):
        """MediaPipe Pose → (132,) 특징 벡터 + landmarks 반환."""
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = pose.process(image_rgb)
        if not results.pose_landmarks:
            return None, None
        lm = results.pose_landmarks.landmark
        feat = np.array(
            [[l.x, l.y, l.z, l.visibility] for l in lm], dtype=np.float32
        ).reshape(NUM_FEATURES)
        return feat, lm

    def _predict_lstm(self, buffer: deque) -> tuple[bool, float]:
        model = _get_model()
        if model is None or len(buffer) < SEQUENCE_LEN:
            return False, 0.0
        seq = np.stack(list(buffer), axis=0)
        seq_norm = _normalize_sequence(seq)
        x = seq_norm[np.newaxis, ...].astype(np.float32)
        probs = model.predict(x, verbose=0)[0]
        fall_prob = float(probs[FALL_CLASS])
        return fall_prob >= FALL_THRESHOLD, fall_prob

    def _update_counter(self, camera_id: str, is_fall: bool) -> int:
        if is_fall:
            self.fall_counters[camera_id] += 1
        else:
            self.fall_counters[camera_id] = 0
        return self.fall_counters[camera_id]

    def detect(self, image_base64: str, camera_id: str = "default") -> dict:
        image = self._decode_image(image_base64)
        features, landmarks = self._extract_features(image)

        # ── MediaPipe가 사람을 못 잡은 경우 ──
        if features is None:
            is_fall, conf = _yolo_fall_fallback(image)
            count = self._update_counter(camera_id, is_fall)

            if not is_fall:
                # YOLO도 수평 사람을 못 잡음 → 사람 없음
                return {
                    "detected": False,
                    "confidence": 0.0,
                    "type": "FALL",
                    "status": "no_person",
                }

            # YOLO 수평 bbox 감지 → 낙상 후보
            if count >= self.CONSECUTIVE_THRESHOLD:
                status = "emergency"
            elif count >= 2:
                status = "suspected"
            else:
                status = "caution"

            return {
                "detected": count >= self.CONSECUTIVE_THRESHOLD,
                "confidence": conf,
                "type": "FALL",
                "status": status,
                "consecutive_frames": count,
                "method": "yolo_bbox",
            }

        # ── MediaPipe 성공 경로 ──
        self.frame_buffers[camera_id].append(features)
        buffer_full = len(self.frame_buffers[camera_id]) >= SEQUENCE_LEN

        # 워밍업: 전 조건(a+b). LSTM 활성 후: 강한 신호(a)만.
        heuristic_is_fall, reason = _heuristic_fall(landmarks, strong_only=buffer_full)

        # ── 워밍업: 버퍼 부족 시 휴리스틱만으로도 카운팅 ──
        if not buffer_full:
            count = self._update_counter(camera_id, heuristic_is_fall)
            if count >= self.CONSECUTIVE_THRESHOLD:
                status = "emergency"
            elif count >= 2:
                status = "suspected"
            elif count >= 1:
                status = "caution"
            else:
                status = "buffering"
            return {
                "detected": count >= self.CONSECUTIVE_THRESHOLD,
                "confidence": 0.5 if heuristic_is_fall else 0.0,
                "type": "FALL",
                "status": status,
                "buffered": len(self.frame_buffers[camera_id]),
                "consecutive_frames": count,
                "method": f"heuristic:{reason}",
            }

        # 최초 LSTM 가동 플래그만 세움 (카운터 리셋하지 않음 → 워밍업 누적 유지)
        if not self.lstm_started[camera_id]:
            self.lstm_started[camera_id] = True

        # 버퍼 풀 → LSTM 추론 + 강한 휴리스틱 OR 결합
        lstm_fall, fall_prob = self._predict_lstm(self.frame_buffers[camera_id])
        combined_fall = lstm_fall or heuristic_is_fall
        count = self._update_counter(camera_id, combined_fall)

        if count >= self.CONSECUTIVE_THRESHOLD:
            status = "emergency"
        elif count >= 2:
            status = "suspected"
        elif count >= 1:
            status = "caution"
        else:
            status = "normal"

        method = "lstm" if lstm_fall else (f"heuristic:{reason}" if heuristic_is_fall else "lstm")
        # 신뢰도: LSTM 확률과 휴리스틱(0.5)의 최댓값
        confidence = max(fall_prob, 0.5 if heuristic_is_fall else 0.0)

        return {
            "detected": count >= self.CONSECUTIVE_THRESHOLD,
            "confidence": round(confidence, 2),
            "type": "FALL",
            "status": status,
            "consecutive_frames": count,
            "method": method,
            "lstm_prob": round(fall_prob, 3),
            "heuristic": heuristic_is_fall,
        }

    def reset(self, camera_id: str = "default"):
        self.fall_counters[camera_id] = 0
        self.frame_buffers[camera_id].clear()
        self.lstm_started[camera_id] = False


fall_detector = FallDetector()
