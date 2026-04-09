"""
낙상 LSTM 모델 평가 스크립트

기능:
1. JSON 시퀀스로 평가 (학습에 안 쓴 데이터로 정확도 재확인)
2. 웹캠 실시간 평가 (실제 환경 작동 확인)
3. 임계값(threshold)별 Precision/Recall 곡선 확인

실행:
  cd ai
  # JSON 시퀀스 평가
  python training/eval_fall.py --mode json
  # 웹캠 실시간 평가
  python training/eval_fall.py --mode webcam
  # 단일 시퀀스 디버깅
  python training/eval_fall.py --mode single --file "data/fall dataset/pose_landmarks_ur/fall/fall-05.json"
"""

import os
import sys
import json
import glob
import argparse
import numpy as np
import torch
import torch.nn as nn
from collections import deque

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "fall_lstm.pt")
META_PATH = os.path.join(BASE_DIR, "models", "fall_lstm_meta.json")
POSE_DIR = os.path.join(BASE_DIR, "data", "fall dataset", "pose_landmarks_ur")

# 메타 로드
with open(META_PATH, "r", encoding="utf-8") as f:
    META = json.load(f)
WINDOW_SIZE = META["window_size"]
INPUT_DIM = META["input_dim"]
HIDDEN_DIM = META["hidden_dim"]
NUM_LAYERS = META["num_layers"]
NUM_CLASSES = META["num_classes"]


class FallLSTM(nn.Module):
    def __init__(self):
        super().__init__()
        self.lstm = nn.LSTM(INPUT_DIM, HIDDEN_DIM, NUM_LAYERS, batch_first=True, dropout=0.3)
        self.head = nn.Sequential(
            nn.Linear(HIDDEN_DIM, 32),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(32, NUM_CLASSES),
        )

    def forward(self, x):
        out, _ = self.lstm(x)
        return self.head(out[:, -1, :])


def load_model():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = FallLSTM().to(device)
    model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
    model.eval()
    print(f"[모델 로드] {MODEL_PATH} (device={device})")
    print(f"[메타] window={WINDOW_SIZE}, val_acc={META.get('val_acc')}, recall={META.get('val_recall')}")
    return model, device


def load_sequence(json_path):
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    out = []
    for fr in data["frames"]:
        vec = []
        for p in fr["landmarks"]:
            vec.extend([p["x"], p["y"], p["z"], p["visibility"]])
        out.append(vec)
    return np.array(out, dtype=np.float32)


def predict_sequence(model, device, seq, threshold=0.5):
    """시퀀스 전체에 대해 슬라이딩 윈도우로 fall 확률 리스트 반환"""
    if len(seq) < WINDOW_SIZE:
        pad = np.tile(seq[-1:], (WINDOW_SIZE - len(seq), 1))
        seq = np.concatenate([seq, pad], axis=0)

    probs = []
    for start in range(0, len(seq) - WINDOW_SIZE + 1):
        w = seq[start : start + WINDOW_SIZE]
        x = torch.from_numpy(w).unsqueeze(0).to(device)
        with torch.no_grad():
            logits = model(x)
            p = torch.softmax(logits, dim=1)[0, 1].item()
        probs.append(p)
    return probs


# ───────────────────────────────────────
# 모드 1: 전체 JSON 평가 + 임계값 스윕
# ───────────────────────────────────────
def eval_json_all(model, device):
    fall_files = sorted(glob.glob(os.path.join(POSE_DIR, "fall", "*.json")))
    adl_files = sorted(glob.glob(os.path.join(POSE_DIR, "adl", "*.json")))
    print(f"\n[평가] fall={len(fall_files)} 시퀀스, adl={len(adl_files)} 시퀀스")

    # 시퀀스 단위 판정: max probability가 threshold 넘으면 fall
    fall_max_probs = [max(predict_sequence(model, device, load_sequence(f))) for f in fall_files]
    adl_max_probs = [max(predict_sequence(model, device, load_sequence(f))) for f in adl_files]

    print("\n[임계값별 시퀀스 단위 성능]")
    print(f"{'thr':>6} {'precision':>10} {'recall':>10} {'f1':>8} {'tp':>4} {'fp':>4} {'fn':>4}")
    print("-" * 50)
    for thr in [0.3, 0.4, 0.5, 0.6, 0.7, 0.8]:
        tp = sum(1 for p in fall_max_probs if p >= thr)
        fn = sum(1 for p in fall_max_probs if p < thr)
        fp = sum(1 for p in adl_max_probs if p >= thr)
        tn = sum(1 for p in adl_max_probs if p < thr)
        prec = tp / (tp + fp) if (tp + fp) else 0
        rec = tp / (tp + fn) if (tp + fn) else 0
        f1 = 2 * prec * rec / (prec + rec) if (prec + rec) else 0
        print(f"{thr:>6.2f} {prec:>10.3f} {rec:>10.3f} {f1:>8.3f} {tp:>4} {fp:>4} {fn:>4}")

    print("\n[TIP] Recall 0.95 이상 유지하면서 Precision이 가장 높은 thr를 선택")


# ───────────────────────────────────────
# 모드 2: 단일 시퀀스 프레임별 디버깅
# ───────────────────────────────────────
def eval_single(model, device, file_path):
    seq = load_sequence(file_path)
    probs = predict_sequence(model, device, seq)
    label = "fall" if "fall" in file_path else "adl"
    print(f"\n[시퀀스] {os.path.basename(file_path)} (실제={label}, 길이={len(seq)})")
    print(f"[fall 확률] min={min(probs):.3f}, max={max(probs):.3f}, mean={np.mean(probs):.3f}")
    print("\n프레임별 fall 확률 (▮ = 0.5 임계값):")
    for i, p in enumerate(probs):
        bar = "█" * int(p * 30)
        marker = " ← FALL" if p >= 0.5 else ""
        print(f"  win {i:>3d}: {p:.3f} |{bar:<30}|{marker}")


# ───────────────────────────────────────
# 모드 3: 웹캠 실시간 평가
# ───────────────────────────────────────
def eval_webcam(model, device):
    import cv2
    import mediapipe as mp

    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5)
    mp_draw = mp.solutions.drawing_utils

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("웹캠을 열 수 없습니다")
        return

    buffer = deque(maxlen=WINDOW_SIZE)
    print("\n[웹캠 평가] q를 누르면 종료. 일부러 엎드리거나 자세를 낮춰서 테스트해보세요")

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = pose.process(rgb)

        prob = 0.0
        status = "no person"
        color = (128, 128, 128)

        if result.pose_landmarks:
            mp_draw.draw_landmarks(frame, result.pose_landmarks, mp_pose.POSE_CONNECTIONS)
            vec = []
            for p in result.pose_landmarks.landmark:
                vec.extend([p.x, p.y, p.z, p.visibility])
            buffer.append(vec)

            if len(buffer) == WINDOW_SIZE:
                x = torch.tensor(np.array(buffer), dtype=torch.float32).unsqueeze(0).to(device)
                with torch.no_grad():
                    logits = model(x)
                    prob = torch.softmax(logits, dim=1)[0, 1].item()

                if prob >= 0.7:
                    status, color = "FALL!", (0, 0, 255)
                elif prob >= 0.4:
                    status, color = "suspected", (0, 165, 255)
                else:
                    status, color = "normal", (0, 200, 0)

        # 화면 표시
        cv2.rectangle(frame, (0, 0), (640, 60), (0, 0, 0), -1)
        cv2.putText(frame, f"{status}  prob={prob:.2f}", (10, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.0, color, 2)
        bar_w = int(prob * 400)
        cv2.rectangle(frame, (10, 70), (10 + bar_w, 90), color, -1)
        cv2.rectangle(frame, (10, 70), (410, 90), (255, 255, 255), 1)

        cv2.imshow("Fall Detection - Eval", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()


# ───────────────────────────────────────
# 모드 4: 영상 파일 평가 (낙상 확률 오버레이 + 결과 영상 저장)
# ───────────────────────────────────────
def eval_video(model, device, video_path, save=True, show=True, threshold=0.7):
    import cv2
    import mediapipe as mp

    if not os.path.exists(video_path):
        print(f"파일 없음: {video_path}")
        return

    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5)
    mp_draw = mp.solutions.drawing_utils

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"영상을 열 수 없음: {video_path}")
        return

    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    n_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    print(f"\n[영상] {os.path.basename(video_path)}  {w}x{h} @ {fps:.1f}fps, {n_frames}프레임")

    writer = None
    if save:
        out_dir = os.path.join(BASE_DIR, "outputs")
        os.makedirs(out_dir, exist_ok=True)
        out_path = os.path.join(out_dir, f"fall_eval_{os.path.basename(video_path)}.mp4")
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(out_path, fourcc, fps, (w, h))
        print(f"[저장] {out_path}")

    buffer = deque(maxlen=WINDOW_SIZE)
    frame_idx = 0
    fall_frames = 0
    max_prob = 0.0
    fall_intervals = []  # (start_frame, end_frame)
    in_fall = False
    fall_start = None

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frame_idx += 1

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = pose.process(rgb)

        prob = 0.0
        status = "no person"
        color = (128, 128, 128)

        if result.pose_landmarks:
            mp_draw.draw_landmarks(frame, result.pose_landmarks, mp_pose.POSE_CONNECTIONS)
            vec = []
            for p in result.pose_landmarks.landmark:
                vec.extend([p.x, p.y, p.z, p.visibility])
            buffer.append(vec)

            if len(buffer) == WINDOW_SIZE:
                x = torch.tensor(np.array(buffer), dtype=torch.float32).unsqueeze(0).to(device)
                with torch.no_grad():
                    logits = model(x)
                    prob = torch.softmax(logits, dim=1)[0, 1].item()

                if prob >= threshold:
                    status, color = "FALL DETECTED", (0, 0, 255)
                    fall_frames += 1
                    if not in_fall:
                        in_fall = True
                        fall_start = frame_idx
                elif prob >= 0.4:
                    status, color = "suspected", (0, 165, 255)
                    if in_fall:
                        fall_intervals.append((fall_start, frame_idx))
                        in_fall = False
                else:
                    status, color = "normal", (0, 200, 0)
                    if in_fall:
                        fall_intervals.append((fall_start, frame_idx))
                        in_fall = False

                max_prob = max(max_prob, prob)

        # 오버레이
        cv2.rectangle(frame, (0, 0), (w, 70), (0, 0, 0), -1)
        cv2.putText(frame, f"{status}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)
        cv2.putText(frame, f"prob: {prob:.2f}  frame: {frame_idx}/{n_frames}",
                    (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
        # 확률 막대
        bar_w = int(prob * (w - 20))
        cv2.rectangle(frame, (10, 80), (10 + bar_w, 95), color, -1)
        cv2.rectangle(frame, (10, 80), (w - 10, 95), (255, 255, 255), 1)
        # 임계선
        thr_x = 10 + int(threshold * (w - 20))
        cv2.line(frame, (thr_x, 75), (thr_x, 100), (255, 255, 255), 1)

        if writer:
            writer.write(frame)
        if show:
            cv2.imshow("Fall Detection - Video Eval", frame)
            if cv2.waitKey(int(1000 / fps)) & 0xFF == ord("q"):
                break

    if in_fall:
        fall_intervals.append((fall_start, frame_idx))

    cap.release()
    if writer:
        writer.release()
    if show:
        cv2.destroyAllWindows()

    # 요약
    print("\n" + "=" * 60)
    print(f"[요약] {os.path.basename(video_path)}")
    print(f"  총 프레임: {frame_idx}")
    print(f"  최대 fall 확률: {max_prob:.3f}")
    print(f"  낙상 판정 프레임: {fall_frames}개 ({fall_frames/max(frame_idx,1)*100:.1f}%)")
    print(f"  낙상 구간: {len(fall_intervals)}회")
    for i, (s, e) in enumerate(fall_intervals, 1):
        print(f"    #{i}: 프레임 {s}~{e} ({(e-s)/fps:.1f}초)")
    if max_prob >= threshold:
        print("  [판정] 낙상 감지됨")
    else:
        print("  [판정] 낙상 없음")
    print("=" * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["json", "webcam", "single", "video"], default="json")
    parser.add_argument("--file", type=str, help="single/video 모드에서 사용할 파일 경로")
    parser.add_argument("--threshold", type=float, default=0.7, help="낙상 판정 임계값 (기본 0.7)")
    parser.add_argument("--no-show", action="store_true", help="화면 표시 안 함 (저장만)")
    parser.add_argument("--no-save", action="store_true", help="결과 영상 저장 안 함")
    args = parser.parse_args()

    model, device = load_model()

    if args.mode == "json":
        eval_json_all(model, device)
    elif args.mode == "webcam":
        eval_webcam(model, device)
    elif args.mode == "single":
        if not args.file:
            print("--file 인자를 줘야 합니다")
            sys.exit(1)
        eval_single(model, device, args.file)
    elif args.mode == "video":
        if not args.file:
            print("--file 인자를 줘야 합니다 (mp4/avi/mov 등)")
            sys.exit(1)
        eval_video(model, device, args.file,
                   save=not args.no_save, show=not args.no_show,
                   threshold=args.threshold)
