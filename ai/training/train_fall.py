"""
낙상 감지 LSTM 학습 스크립트 (UR Fall Detection Dataset)

데이터 구조:
  ai/data/fall dataset/
    pose_landmarks_ur/
      fall/fall-01.json ... fall-30.json   (라벨=1)
      adl/adl-01.json ... adl-15.json      (라벨=0)
  각 JSON 구조:
    { "frames": [ { "landmarks": [ {x,y,z,visibility} × 33 ] } × N ] }

학습 방식:
  - 각 시퀀스를 슬라이딩 윈도우(길이 WINDOW_SIZE=15, stride 3)로 쪼개 샘플 생성
  - 입력 shape: (WINDOW_SIZE, 33*4) = (15, 132)
  - 모델: 2-layer LSTM → FC → 2 클래스 (normal/fall)
  - 출력 모델: ai/models/fall_lstm.pt + ai/models/fall_lstm_meta.json

실행:
  cd ai
  .\\venv\\Scripts\\activate
  pip install torch scikit-learn
  python training/train_fall.py
"""

import os
import json
import glob
import random
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader, random_split

# ───── 하이퍼파라미터 ─────
WINDOW_SIZE = 15       # 연속 프레임 수 (≈ 0.5초 @ 30fps → UR은 저프레임이라 0.75~1초)
STRIDE = 3             # 윈도우 이동 간격
NUM_LANDMARKS = 33
FEATURES_PER_LM = 4    # x, y, z, visibility
INPUT_DIM = NUM_LANDMARKS * FEATURES_PER_LM  # 132
HIDDEN_DIM = 64
NUM_LAYERS = 2
DROPOUT = 0.3
NUM_CLASSES = 2
BATCH_SIZE = 32
EPOCHS = 40
LR = 1e-3
SEED = 42

# ───── 경로 ─────
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
POSE_DIR = os.path.join(BASE_DIR, "data", "fall dataset", "pose_landmarks_ur")
OUT_DIR = os.path.join(BASE_DIR, "models")
OUT_MODEL = os.path.join(OUT_DIR, "fall_lstm.pt")
OUT_META = os.path.join(OUT_DIR, "fall_lstm_meta.json")


def set_seed(s):
    random.seed(s)
    np.random.seed(s)
    torch.manual_seed(s)


def load_sequence(json_path: str) -> np.ndarray:
    """JSON 파일 → (T, 132) numpy"""
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    frames = data["frames"]
    out = []
    for fr in frames:
        lm = fr["landmarks"]
        vec = []
        for p in lm:
            vec.extend([p["x"], p["y"], p["z"], p["visibility"]])
        out.append(vec)
    return np.array(out, dtype=np.float32)  # (T, 132)


def make_windows(seq: np.ndarray, label: int):
    """시퀀스를 고정 길이 윈도우로 쪼개기"""
    windows = []
    if len(seq) < WINDOW_SIZE:
        # 짧은 시퀀스는 마지막 프레임으로 패딩
        pad = np.tile(seq[-1:], (WINDOW_SIZE - len(seq), 1))
        seq = np.concatenate([seq, pad], axis=0)
    for start in range(0, len(seq) - WINDOW_SIZE + 1, STRIDE):
        w = seq[start : start + WINDOW_SIZE]
        windows.append((w, label))
    return windows


class FallWindowDataset(Dataset):
    def __init__(self, samples):
        self.samples = samples

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        x, y = self.samples[idx]
        return torch.from_numpy(x), torch.tensor(y, dtype=torch.long)


def build_dataset():
    fall_files = sorted(glob.glob(os.path.join(POSE_DIR, "fall", "*.json")))
    adl_files = sorted(glob.glob(os.path.join(POSE_DIR, "adl", "*.json")))
    print(f"[데이터] fall 시퀀스: {len(fall_files)}개, adl 시퀀스: {len(adl_files)}개")

    if not fall_files or not adl_files:
        raise FileNotFoundError(
            f"JSON 파일을 찾을 수 없음: {POSE_DIR}\n"
            "'ai/data/fall dataset/pose_landmarks_ur/{fall,adl}/' 경로 확인"
        )

    samples = []
    for fp in fall_files:
        samples.extend(make_windows(load_sequence(fp), label=1))
    for fp in adl_files:
        samples.extend(make_windows(load_sequence(fp), label=0))

    n_fall = sum(1 for _, y in samples if y == 1)
    n_adl = sum(1 for _, y in samples if y == 0)
    print(f"[데이터] 윈도우 수 — fall={n_fall}, adl={n_adl}, 총={len(samples)}")
    return samples


class FallLSTM(nn.Module):
    def __init__(self):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=INPUT_DIM,
            hidden_size=HIDDEN_DIM,
            num_layers=NUM_LAYERS,
            batch_first=True,
            dropout=DROPOUT,
        )
        self.head = nn.Sequential(
            nn.Linear(HIDDEN_DIM, 32),
            nn.ReLU(),
            nn.Dropout(DROPOUT),
            nn.Linear(32, NUM_CLASSES),
        )

    def forward(self, x):
        out, _ = self.lstm(x)  # (B, T, H)
        last = out[:, -1, :]   # 마지막 타임스텝
        return self.head(last)


def train():
    set_seed(SEED)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[환경] device={device}")

    samples = build_dataset()
    random.shuffle(samples)

    # 80/20 split
    n_total = len(samples)
    n_train = int(n_total * 0.8)
    train_samples = samples[:n_train]
    val_samples = samples[n_train:]

    # 클래스 가중치 (불균형 보정)
    n_fall = sum(1 for _, y in train_samples if y == 1)
    n_adl = sum(1 for _, y in train_samples if y == 0)
    total = n_fall + n_adl
    w_adl = total / (2 * max(n_adl, 1))
    w_fall = total / (2 * max(n_fall, 1))
    class_weights = torch.tensor([w_adl, w_fall], dtype=torch.float32, device=device)
    print(f"[가중치] normal={w_adl:.3f}, fall={w_fall:.3f}")

    train_loader = DataLoader(FallWindowDataset(train_samples), batch_size=BATCH_SIZE, shuffle=True)
    val_loader = DataLoader(FallWindowDataset(val_samples), batch_size=BATCH_SIZE)

    model = FallLSTM().to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=LR)
    criterion = nn.CrossEntropyLoss(weight=class_weights)

    best_val_acc = 0.0
    print("\n" + "=" * 60)
    print(f"{'Epoch':>5} {'TrainLoss':>10} {'TrainAcc':>10} {'ValLoss':>10} {'ValAcc':>10}")
    print("=" * 60)

    for epoch in range(1, EPOCHS + 1):
        # ── train ──
        model.train()
        tr_loss, tr_correct, tr_total = 0, 0, 0
        for x, y in train_loader:
            x, y = x.to(device), y.to(device)
            optimizer.zero_grad()
            logits = model(x)
            loss = criterion(logits, y)
            loss.backward()
            optimizer.step()
            tr_loss += loss.item() * x.size(0)
            tr_correct += (logits.argmax(1) == y).sum().item()
            tr_total += x.size(0)
        tr_loss /= tr_total
        tr_acc = tr_correct / tr_total

        # ── val ──
        model.eval()
        vl_loss, vl_correct, vl_total = 0, 0, 0
        tp = fp = tn = fn = 0
        with torch.no_grad():
            for x, y in val_loader:
                x, y = x.to(device), y.to(device)
                logits = model(x)
                loss = criterion(logits, y)
                vl_loss += loss.item() * x.size(0)
                preds = logits.argmax(1)
                vl_correct += (preds == y).sum().item()
                vl_total += x.size(0)
                for p, t in zip(preds.cpu().tolist(), y.cpu().tolist()):
                    if p == 1 and t == 1: tp += 1
                    elif p == 1 and t == 0: fp += 1
                    elif p == 0 and t == 0: tn += 1
                    else: fn += 1
        vl_loss /= vl_total
        vl_acc = vl_correct / vl_total

        print(f"{epoch:>5d} {tr_loss:>10.4f} {tr_acc:>10.4f} {vl_loss:>10.4f} {vl_acc:>10.4f}")

        if vl_acc > best_val_acc:
            best_val_acc = vl_acc
            os.makedirs(OUT_DIR, exist_ok=True)
            torch.save(model.state_dict(), OUT_MODEL)
            precision = tp / (tp + fp) if (tp + fp) else 0
            recall = tp / (tp + fn) if (tp + fn) else 0
            f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0
            meta = {
                "window_size": WINDOW_SIZE,
                "input_dim": INPUT_DIM,
                "hidden_dim": HIDDEN_DIM,
                "num_layers": NUM_LAYERS,
                "num_classes": NUM_CLASSES,
                "best_epoch": epoch,
                "val_acc": round(vl_acc, 4),
                "val_precision": round(precision, 4),
                "val_recall": round(recall, 4),
                "val_f1": round(f1, 4),
                "confusion": {"tp": tp, "fp": fp, "tn": tn, "fn": fn},
            }
            with open(OUT_META, "w", encoding="utf-8") as f:
                json.dump(meta, f, indent=2, ensure_ascii=False)

    print("=" * 60)
    print(f"[완료] 최고 val acc = {best_val_acc:.4f}")
    print(f"[저장] {OUT_MODEL}")
    print(f"[메타] {OUT_META}")


if __name__ == "__main__":
    train()
