"""
복약 판정 스코어러 (MVP)

입력 신호 두 가지를 시간창(sliding window) 안에서 결합해 복약 여부를 판정한다.

신호 1) "약통/약 객체가 보이는가"       ← medication_detector (YOLO/ONNX)
신호 2) "손이 입으로 가는 동작이 일어나는가" ← hand_to_mouth_detector (MediaPipe Hands + LSTM)

MVP 가정:
- 전용 약통 전용 모델이 아직 없으므로, 현재 medication_detector가 잡는 모든 객체
  (capsules/tablets/bottle/cup 등)를 "약통 대용 신호"로 취급한다.
- 나중에 medication.pt를 약통 전용 모델로 교체하면 이 스코어러 코드는 그대로 동작한다.

판정 로직:
- 최근 WINDOW_SECONDS 초 동안의 (box_seen, motion_positive) 이벤트를 누적
- box_frames >= BOX_MIN_FRAMES AND motion_frames >= MOTION_MIN_FRAMES  → TAKEN (복약 완료)
- box만 충분                                                             → PREPARING (꺼내만 놓음)
- motion만 충분                                                          → EATING_UNKNOWN (뭔가 먹음, 약 아닐 수도)
- 둘 다 부족                                                             → IDLE
"""

from __future__ import annotations

import time
from collections import defaultdict, deque
from typing import Deque, Tuple


class MedicationScorer:
    # ── 튜닝 상수 ────────────────────────────────
    WINDOW_SECONDS = 10.0          # 시간창 길이
    BOX_MIN_FRAMES = 2             # 약통 최소 감지 프레임 수 (3→2, 원거리 누락 완화)
    MOTION_MIN_FRAMES = 2          # 손→입 양성 최소 프레임 수
    MOTION_POS_THRESHOLD = 0.35    # LSTM sigmoid 양성 기준 (0.5→0.35, 경계값 활용)
    MOTION_EMA_ALPHA = 0.4         # motion_prob 지수이동평균 (지터 완화)
    BOX_SCORING_CONF = 0.2         # 스코어링용 감지 임계값 (recall 우선)
    STICKY_BOX_FRAMES = 5          # 박스를 마지막으로 본 뒤 N프레임은 보인 것으로 간주

    # 가중치 (score 0~1)
    W_BOX = 0.4
    W_MOTION = 0.6

    def __init__(self, medication_detector, hand_to_mouth_detector):
        self.med = medication_detector
        self.hand = hand_to_mouth_detector
        # camera_id → deque[(timestamp, box_seen: bool, motion_prob: float)]
        self.histories: dict[str, Deque[Tuple[float, bool, float]]] = defaultdict(deque)
        # 한 번 TAKEN으로 확정된 카메라는 래치해두고, reset 할 때까지 재확정 안 함
        self.taken_latched: dict[str, bool] = defaultdict(bool)
        # Sticky box: 카메라별 "박스를 마지막으로 본 이후 경과 프레임 수"
        self.frames_since_box: dict[str, int] = defaultdict(lambda: 10**6)
        # motion EMA 상태
        self.motion_ema: dict[str, float] = defaultdict(float)

    # ────────────────────────────────────────────
    def _trim(self, cam: str, now: float):
        buf = self.histories[cam]
        cutoff = now - self.WINDOW_SECONDS
        while buf and buf[0][0] < cutoff:
            buf.popleft()

    # ────────────────────────────────────────────
    def update(self, image_base64: str, camera_id: str = "default") -> dict:
        """
        한 프레임 입력 → 두 파이프라인 실행 → 누적 + 점수 산출.
        """
        now = time.time()

        # ── 신호 1: 약통/약 감지 (스코어링용 저임계값) ──
        image = self.med._decode_image(image_base64)
        med_objects, all_objects = self.med._detect_objects(
            image, conf_threshold=self.BOX_SCORING_CONF
        )
        box_seen_raw = len(med_objects) > 0
        box_top_conf = max((o["confidence"] for o in med_objects), default=0.0)

        # Sticky box: 원시 감지가 끊겨도 STICKY_BOX_FRAMES 동안 유지
        if box_seen_raw:
            self.frames_since_box[camera_id] = 0
        else:
            self.frames_since_box[camera_id] += 1
        box_seen = self.frames_since_box[camera_id] <= self.STICKY_BOX_FRAMES

        # ── 신호 2: 손→입 동작 (EMA 스무딩) ─────
        if self.hand is not None:
            hand_result = self.hand.detect(image_base64, camera_id)
            motion_prob_raw = float(hand_result.get("confidence", 0.0))
            hand_status = hand_result.get("status", "unknown")
        else:
            motion_prob_raw = 0.0
            hand_status = "not_loaded"

        prev_ema = self.motion_ema[camera_id]
        motion_prob = self.MOTION_EMA_ALPHA * motion_prob_raw + (1 - self.MOTION_EMA_ALPHA) * prev_ema
        self.motion_ema[camera_id] = motion_prob

        # ── 시간창 누적 ────────────────────────
        self.histories[camera_id].append((now, box_seen, motion_prob))
        self._trim(camera_id, now)
        buf = self.histories[camera_id]

        box_frames = sum(1 for _, b, _ in buf if b)
        motion_frames = sum(1 for _, _, p in buf if p >= self.MOTION_POS_THRESHOLD)
        total_frames = len(buf)

        box_ratio = box_frames / total_frames if total_frames else 0.0
        motion_ratio = motion_frames / total_frames if total_frames else 0.0
        score = self.W_BOX * box_ratio + self.W_MOTION * motion_ratio

        # ── 상태 판정 ─────────────────────────
        box_enough = box_frames >= self.BOX_MIN_FRAMES
        motion_enough = motion_frames >= self.MOTION_MIN_FRAMES

        if box_enough and motion_enough:
            status = "taken"
            self.taken_latched[camera_id] = True
        elif self.taken_latched[camera_id]:
            status = "taken"          # 한번 확정되면 창이 지나도 래치 유지
        elif box_enough and not motion_enough:
            status = "preparing"
        elif motion_enough and not box_enough:
            status = "eating_unknown"
        else:
            status = "idle"

        taken = status == "taken"

        return {
            "taken": taken,
            "score": round(score, 3),
            "status": status,
            "signals": {
                "box_visible": box_seen,
                "box_visible_raw": box_seen_raw,
                "box_top_confidence": round(box_top_conf, 3),
                "hand_to_mouth_prob": round(motion_prob, 4),
                "hand_to_mouth_prob_raw": round(motion_prob_raw, 4),
                "hand_status": hand_status,
            },
            "window": {
                "seconds": self.WINDOW_SECONDS,
                "total_frames": total_frames,
                "box_frames": box_frames,
                "motion_frames": motion_frames,
                "box_min": self.BOX_MIN_FRAMES,
                "motion_min": self.MOTION_MIN_FRAMES,
            },
            # 원본 신호도 함께 반환 (프론트에서 bbox 오버레이에 사용)
            "medication_objects": med_objects,
            "all_objects": all_objects,
        }

    # ────────────────────────────────────────────
    def reset(self, camera_id: str = "default"):
        self.histories.pop(camera_id, None)
        self.taken_latched[camera_id] = False
        self.frames_since_box[camera_id] = 10**6
        self.motion_ema[camera_id] = 0.0
        # 하위 파이프라인도 초기화 (LSTM 버퍼)
        if self.hand is not None:
            self.hand.reset(camera_id)


# ── 싱글턴 ─────────────────────────────────────
# 순환 import 방지를 위해 런타임에 생성 (routes.py 에서 구성)
medication_scorer: "MedicationScorer | None" = None


def init_scorer(medication_detector, hand_to_mouth_detector) -> MedicationScorer:
    global medication_scorer
    medication_scorer = MedicationScorer(medication_detector, hand_to_mouth_detector)
    return medication_scorer
