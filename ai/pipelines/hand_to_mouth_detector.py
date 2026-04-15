"""
손→입 동작 감지 파이프라인 (MediaPipe Hands + LSTM)

체크포인트: ai/models/hand_to_mouth_lstm.pt
아키텍처(역추적): 2-layer LSTM(input=42, hidden=128) → FC(128→64) → ReLU → Dropout → FC(64→1)

⚠️ 팀원으로부터 받은 체크포인트에 메타데이터가 없어 아래 값은 추정치입니다.
   실제 학습 설정을 확인하면 ASSUMPTIONS 상수를 맞춰주세요.
"""

from __future__ import annotations

import base64
from collections import defaultdict, deque
from pathlib import Path
from typing import Deque, Optional

import cv2
import mediapipe as mp
import numpy as np
import torch
import torch.nn as nn

# ─────────────────────────────────────────────
# ASSUMPTIONS (팀원 확인 후 수정)
# ─────────────────────────────────────────────
WINDOW_SIZE = 15            # 학습 시 시퀀스 길이 (fall_lstm 기본값과 동일 가정)
INPUT_DIM = 42              # 21 landmarks × (x, y)
HIDDEN_DIM = 128
NUM_LAYERS = 2
DROPOUT = 0.3
POSITIVE_THRESHOLD = 0.5    # sigmoid 양성 기준
CONSECUTIVE_POSITIVE = 2    # 연속 몇 프레임 양성이어야 최종 확정할지 (오탐 감소)

MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "hand_to_mouth_lstm.pt"

mp_hands = mp.solutions.hands


# ─────────────────────────────────────────────
# Model
# ─────────────────────────────────────────────
class HandToMouthLSTM(nn.Module):
    def __init__(self, input_dim=INPUT_DIM, hidden_dim=HIDDEN_DIM,
                 num_layers=NUM_LAYERS, dropout=DROPOUT):
        super().__init__()
        self.lstm = nn.LSTM(input_dim, hidden_dim, num_layers=num_layers,
                            batch_first=True, dropout=dropout)
        self.fc = nn.Sequential(
            nn.Linear(hidden_dim, 64),   # fc.0
            nn.ReLU(),                    # fc.1
            nn.Dropout(dropout),          # fc.2
            nn.Linear(64, 1),             # fc.3
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out, _ = self.lstm(x)
        return self.fc(out[:, -1, :])    # 마지막 타임스텝


# ─────────────────────────────────────────────
# Detector
# ─────────────────────────────────────────────
class HandToMouthDetector:
    """
    실시간 손→입 동작 감지기.
    - MediaPipe Hands로 21개 랜드마크 추출 (x, y만 사용)
    - 카메라별로 최근 WINDOW_SIZE 프레임 버퍼링
    - 버퍼가 가득 차면 LSTM 추론 → sigmoid 확률
    - 연속 양성이 CONSECUTIVE_POSITIVE 이상이면 `detected=True`
    """

    def __init__(self, model_path: Path = MODEL_PATH, device: Optional[str] = None):
        self.device = torch.device(device or ("cuda" if torch.cuda.is_available() else "cpu"))
        self.model = HandToMouthLSTM().to(self.device)

        if not model_path.exists():
            raise FileNotFoundError(f"hand_to_mouth_lstm.pt not found at {model_path}")

        state_dict = torch.load(model_path, map_location=self.device)
        self.model.load_state_dict(state_dict, strict=True)
        self.model.eval()

        # 카메라별 프레임 버퍼
        self.buffers: dict[str, Deque[np.ndarray]] = defaultdict(
            lambda: deque(maxlen=WINDOW_SIZE)
        )
        self.positive_counters: dict[str, int] = defaultdict(int)

        # MediaPipe Hands (1인 기준이므로 max_num_hands=1)
        self.hands = mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=1,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )

    # ── image utils ────────────────────────────
    @staticmethod
    def _decode_image(image_base64: str) -> np.ndarray:
        # data:image/...;base64, 헤더 제거
        if "," in image_base64:
            image_base64 = image_base64.split(",", 1)[1]
        img_data = base64.b64decode(image_base64)
        np_arr = np.frombuffer(img_data, np.uint8)
        return cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    # ── feature extraction ────────────────────
    def _extract_hand_vector(self, image_bgr: np.ndarray) -> Optional[np.ndarray]:
        """한 프레임에서 (42,) 벡터 추출 — 손 없으면 None."""
        image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        result = self.hands.process(image_rgb)
        if not result.multi_hand_landmarks:
            return None
        lms = result.multi_hand_landmarks[0].landmark  # 21개
        # MediaPipe는 이미 정규화된 좌표(0~1)를 출력함 — 절대 위치 정보 유지를 위해 그대로 사용
        vec = np.empty(42, dtype=np.float32)
        for i, lm in enumerate(lms):
            vec[i * 2]     = lm.x
            vec[i * 2 + 1] = lm.y
        return vec

    # ── public API ────────────────────────────
    def detect(self, image_base64: str, camera_id: str = "default") -> dict:
        image = self._decode_image(image_base64)
        if image is None:
            return self._empty_response("decode_failed")

        vec = self._extract_hand_vector(image)
        buf = self.buffers[camera_id]

        # 손이 감지되지 않은 프레임은 0벡터로 채워 버퍼의 연속성을 유지한다.
        # (대체 전략: 버퍼 리셋. 학습 방식을 모르므로 일단 0-padding 유지.)
        if vec is None:
            buf.append(np.zeros(42, dtype=np.float32))
            status = "no_hand"
        else:
            buf.append(vec)
            status = "tracking"

        # 버퍼가 가득 찰 때까지는 판정 보류
        if len(buf) < WINDOW_SIZE:
            return {
                "detected": False,
                "confidence": 0.0,
                "type": "HAND_TO_MOUTH",
                "status": f"warming_up ({len(buf)}/{WINDOW_SIZE})",
                "window_filled": len(buf),
                "window_size": WINDOW_SIZE,
            }

        # 추론
        seq = np.stack(list(buf), axis=0)                       # (W, 42)
        x = torch.from_numpy(seq).unsqueeze(0).to(self.device)  # (1, W, 42)
        with torch.no_grad():
            logit = self.model(x)                                # (1, 1)
            prob = torch.sigmoid(logit).item()

        is_positive = prob >= POSITIVE_THRESHOLD
        if is_positive:
            self.positive_counters[camera_id] += 1
        else:
            self.positive_counters[camera_id] = 0

        cnt = self.positive_counters[camera_id]
        confirmed = cnt >= CONSECUTIVE_POSITIVE

        return {
            "detected": confirmed,
            "confidence": round(prob, 4),
            "type": "HAND_TO_MOUTH",
            "status": "confirmed" if confirmed else ("suspected" if is_positive else status),
            "consecutive_positive": cnt,
            "window_size": WINDOW_SIZE,
            "threshold": POSITIVE_THRESHOLD,
        }

    def reset(self, camera_id: str = "default"):
        self.buffers.pop(camera_id, None)
        self.positive_counters[camera_id] = 0

    @staticmethod
    def _empty_response(reason: str) -> dict:
        return {
            "detected": False,
            "confidence": 0.0,
            "type": "HAND_TO_MOUTH",
            "status": reason,
        }


# 모듈 전역 인스턴스 (lazy init: 이 파일이 import 될 때만 생성)
try:
    hand_to_mouth_detector = HandToMouthDetector()
except FileNotFoundError as e:
    hand_to_mouth_detector = None
    print(f"[hand_to_mouth_detector] WARNING: {e}")
