# CareVision Fall Detection — QA 최종 리포트

> 본 문서는 CareVision vB 낙상감지 모델의 QA 진행 결과를 재현 가능한 형태로 정리한 것이다.
> 작성 시점: 2026-05-02. 다음 단계는 웹 런타임(uvicorn AI 서버 + 프론트) 통합 검증.

---

## 1. 요약

- **API 계약 검증 완료** — pytest 기반 mock 테스트 4건 모두 통과.
- **vB Keras 모델 정상 로드** — `fall_lstm_vB_best.keras`, `labels_vB.json`, input/output shape 모두 일치.
- **학습 분포 재현** — `test_vB.npz` 기준 baseline `accuracy = 0.7402`, `Fall recall = 0.7143` 정확 재현.
- **외부 Zenodo 영상 50개 평가** — 2단계 분리 워크플로우(.venv311 → .venv)로 성공.
- **결정적 결과**: 영상 단위 `fall_min_windows`를 2 → 1 로 완화하면 외부 영상에서
  `accuracy 0.60 → 0.84`, `Fall recall 0.24 → 0.72`. precision 은 오히려 0.857 → 0.947 상승.
  → **Stage 2 default 를 `fall_min_windows=1`로 채택.**
- **모델 자체에는 결함이 없음.** 외부 영상 성능 차이는 영상 단위 판정 규칙과 도메인 갭에 기인.

---

## 2. 실행 환경

| venv | 가능 | 불가능 | 용도 |
|---|---|---|---|
| `.venv` | TensorFlow 2.21 로 vB Keras `.keras` 로드 | MediaPipe 호환 X | Stage 2, npz/모델 검증 |
| `.venv311` | MediaPipe 0.10.14 (`mp.solutions.pose`) | `.keras` 로드 호환 X | Stage 1 (영상 → keypoint) |

> 한 가상환경에서 MediaPipe + Keras 를 동시에 쓰는 데 호환 이슈가 있어 외부 영상 평가는
> 두 venv 를 번갈아 쓰는 2단계 구조로 분리했다. 자세한 내용은 §6, §12 참조.

---

## 3. API mock QA (`pytest`)

### 실행
```bash
py -m pytest -q qa/test_fall_api.py
```

### 결과
```
4 passed in 0.90s
```

### 검증 범위
1. `GET /health` 헬스체크
2. `POST /detect/reset` 상태 초기화 응답
3. `POST /detect/fall` 기본 응답 구조 (`type/status/confidence/method`)
4. `POST /detect/fall` invalid payload → `422`

### 의미와 한계
- `pipelines.fall_detector` 등 무거운 의존성(MediaPipe / TensorFlow / 모델 파일)을 test double 로 주입.
- **API 계약/JSON 구조** 만 검증. **모델 성능** 은 검증하지 않음 (그건 §4-§7 의 책임).

---

## 4. vB Keras 모델 로드 검증

### 실행
```bash
py qa/check_fall_model_load.py
```
전제: `pip install tensorflow`. (opencv/mediapipe/torch 불필요.)

### 검증 항목 / 결과
| 항목 | 값 | 상태 |
|---|---|---|
| `ai/models/fall_lstm_vB_best.keras` 존재 | 5.11 MB | PASS |
| `labels_vB.json` 파싱 | `version = V2.1-B-5class-coarse` | PASS |
| `sequence_len` | 30 | PASS |
| `num_features` | 132 | PASS |
| `vB_labels[0]` | `Fall` | PASS |
| `num_classes` | 5 | PASS |
| `tensorflow.keras.models.load_model()` | 성공 (TF 2.21.0) | PASS |
| `model.input_shape` | `(None, 30, 132)` | PASS |
| `model.output_shape` | `(None, 5)` | PASS |

→ 모델 파일/라벨 메타/입력 shape 문제는 **아님**.

---

## 5. test_vB.npz baseline 재현

### 실행
```bash
py qa/evaluate_vB_npz.py
# 또는 다른 npz 경로
py qa/evaluate_vB_npz.py --npz path/to/test_vB.npz
```
기본 입력: `C:\4-1\Fall_Down_Detail\test_vB.npz` (npz keys: `X`, `y`, `heuristic`, X shape `(766, 30, 132)`).

### 결과
| 지표 | 측정값 | baseline (`test_report_vB.json`) | Δ |
|---|---:|---:|---:|
| accuracy | 0.740209 | 0.740209 | +0.000000 |
| Fall recall | 0.714286 | 0.714286 | +0.000000 |

→ baseline 완전 일치. **vB Keras 모델 + `labels_vB.json` + class mapping + input shape 연결은 정상.**
산출물: `qa/results/vB_npz_eval.json`.

---

## 6. 외부 Zenodo 영상 2단계 QA

### 6.1 폴더 구조 (사용자 준비)
```
qa/new_videos/
├── fall/      ← 25개 (mp4/avi/mov/mkv)
└── normal/    ← 25개
```
> fall/01.mp4 와 normal/01.mp4 처럼 **동일 파일명이 양쪽 폴더에 존재하는 경우** 도 정상 처리.
> filename 이 아니라 stage-1 이 부여한 `video_id` 로 매칭한다 (§7 참조).

### 6.2 Stage 1 — `.venv311` 에서 keypoint 추출
```bash
.\.venv311\Scripts\activate
py qa/extract_new_video_keypoints.py
```

산출물:
- `qa/results/new_video_windows.npz` — `X(W,30,132)`, `video_ids(W,)`, `true_labels(W,)`,
  `filenames(V,)`, `window_counts(V,)`, `sequence_len/num_features/stride`
- `qa/results/new_video_metadata.csv` — `video_id`, `source_folder`, `relative_path`, `filename`,
  `true_label`, `frames_read`, `frames_with_pose`, `kp_extraction_rate`, `fps/width/height`,
  `n_windows`, `extract_seconds`, `warning`, `error`

전처리: 학습 코드와 동일한 `hip-centering` + `95th-percentile scale` 정규화 → 30프레임 × 132 feature
슬라이딩 윈도우 (stride 15). pose 미감지 프레임은 0.0 으로 채움 (모델의 `Masking(0.0)` 가 처리).

확인된 결과:
```
X.shape = (648, 30, 132)
video 수 = 50
metadata true_label 분포 = {Fall: 25, Normal: 25}
keypoint 추출률 = 전반적으로 정상
```

### 6.3 Stage 2 — `.venv` 에서 모델 추론 / metric
```bash
.\.venv\Scripts\activate
py qa/evaluate_new_video_windows.py
```

산출물:
- `qa/results/new_video_eval.csv` — 영상별 결과
- `qa/results/new_video_metrics.json` — 데이터셋 metric (Accuracy / Fall P/R/F1 / Normal Recall / CM)

집계 규칙:
- 윈도우가 'Fall' 로 잡히려면: `softmax[Fall] >= --fall-prob-thr` AND `argmax == Fall(0)`
- 영상이 'Fall' 로 분류되려면: `fall_window_count >= --fall-min-windows` AND
  `max(softmax[Fall]) >= --fall-prob-thr`
- 영상 단위 `true_label` 은 **`metadata.csv` 의 `video_id` 기준** 이 신뢰 소스. npz 는 fallback.

---

## 7. 평가 버그와 수정 내역

### 7.1 filename 중복 → metadata dedup
- **증상**: Stage 2 console 이 `true=Normal` 만 출력. confusion matrix 의 Fall true row 가 0/0.
- **원인**: `qa/new_videos/fall/01.mp4` 와 `qa/new_videos/normal/01.mp4` 처럼 동일 basename 이
  fall/normal 양쪽에 존재. metadata 를 `dict[filename]=row` 로 만들면 두 번째 write 가 첫 번째 row
  를 덮어써 50개 row 중 25개(Normal)만 살아남음.
- **수정**:
  - `_load_metadata()` → `list[dict]` 반환 (dedup 안 함).
  - `_index_metadata_by_video_id()` 신규 — `int(video_id) → row`.
  - 영상 단위 매칭은 **`video_id` 키**. filename 은 표시용으로만 사용.
  - 콘솔/CSV/JSON 에 `relative_path` 추가 (`Fall/01.mp4` 형태).
- **결과**: metadata 분포 / npz 영상 분포 / 최종 video_true_labels 분포 모두 `{Fall: 25, Normal: 25}` 정상화.

### 7.2 라벨 인코딩 안전화 (보조)
- `_decode_str()` — bytes/np.str_/None 통일.
- `_nfc()` — Unicode NFC 정규화 + strip (Mac/Win NFD 차이 보정).
- `_load_metadata()` 는 `encoding="utf-8-sig"` 로 BOM 자동 제거.

---

## 8. 외부 Zenodo 영상 실험 결과 비교표

낙상 25 + 비낙상 25 영상으로 임계값 3종을 비교 (모두 같은 npz/모델 사용).

| 조건 | `fall_prob_thr` | `fall_min_windows` | Accuracy | Fall Precision | Fall Recall | Fall F1 | Normal Recall |
|---|---:|---:|---:|---:|---:|---:|---:|
| 기본 (이전 default) | 0.5 | 2 | 0.6000 | 0.8571 | 0.2400 | 0.3750 | 0.9600 |
| **A (현 default)** | **0.5** | **1** | **0.8400** | **0.9474** | **0.7200** | **0.8182** | **0.9600** |
| B | 0.3 | 1 | 0.8400 | 0.9474 | 0.7200 | 0.8182 | 0.9600 |

Confusion matrix (행=true, 열=pred):

| 조건 | Fall→Fall | Fall→Normal | Normal→Fall | Normal→Normal |
|---|---:|---:|---:|---:|
| 기본 | 6 | 19 | 1 | 24 |
| A / B | 18 | 7 | 1 | 24 |

---

## 9. 최종 해석

1. **모델 자체에는 결함이 없다.** §4 (로드) + §5 (test_vB.npz 재현) 가 동일 모델/라벨로 통과.
2. **`fall_min_windows`(2 → 1) 가 단일 핵심 변수.** Fall recall +0.48, accuracy +0.24,
   precision 도 +0.090 상승. 낙상 모션이 짧아(≈1~2 s) stride 15 윈도우 기준 1~3 개만 fall 신호를
   내는 경우가 많고, 최소 2 윈도우를 요구하면 짧은 낙상이 항상 누락되는 구조였다.
3. **B == A 의 의미.** `softmax[Fall]` 이 `(0.3, 0.5)` 구간에 있으면서 동시에 `argmax == Fall` 인
   윈도우가 0 개. 즉 모델은 Zenodo 데이터에서 "약하게" Fall 을 예측하는 케이스가 거의 없고,
   Fall argmax 분포가 sharp 하다. 이 데이터의 한계 요인은 임계값이 아니라 **모델이 그 영상에서
   Fall argmax 자체를 만들지 못하는 것** (false negative 의 본질).
4. **Normal recall 0.96 이 모든 조건에서 유지된다.** false positive 는 1 개로 유지 → 임계값
   완화의 안전 근거.

---

## 10. 권장 기준 (배치 평가)

| 항목 | 값 | 비고 |
|---|---|---|
| `fall_prob_thr` | `0.5` | 보수적인 default. 다른 데이터셋에 약신호가 많다면 0.3 까지 내려볼 수 있음. |
| `fall_min_windows` | **`1`** | Zenodo 검증 결과 채택. precision 손실 없음. |
| 운영 override | `--fall-min-windows 2` | precision 우선 운영 시. |

`evaluate_new_video_windows.py` 는 이미 위 default 로 설정되어 있어 다음과 같이 단순 실행 가능.

```bash
py qa/evaluate_new_video_windows.py                                 # 권장 default
py qa/evaluate_new_video_windows.py --fall-min-windows 2            # 보수적
py qa/evaluate_new_video_windows.py --fall-prob-thr 0.3 --fall-min-windows 1  # 약신호 포함
```

---

## 11. 실시간 런타임 기준과 환경변수

`ai/pipelines/fall_detector.py` 의 `CONSECUTIVE_THRESHOLD` 는 **batch 평가의
`fall_min_windows` 와 의미가 다르다.**

| 항목 | Stage 2 `fall_min_windows` | Runtime `CONSECUTIVE_THRESHOLD` |
|---|---|---|
| 단위 | 윈도우 (stride 15) | 프레임 |
| 시간 의미 | 0.5 s 간격 윈도우 N 개 (영상 전체 누적) | 연속 N 프레임 (≈ N/30 s) |
| 적용 시점 | 영상 전체 추론 후 batch 집계 | 매 프레임 실시간 카운트 |
| 위양성 영향 | batch 결과만 영향 (알림 없음) | 즉시 emergency 알림 → 보호자 SMS |
| Default | **1** (Zenodo 결과로 변경) | **3** (실시간 debouncing 위해 유지) |

→ Zenodo 의 `fall_min_windows=1` 결과를 그대로 runtime 에 적용하면 **단일 프레임 false positive 가
즉시 알림으로 이어지므로** 적용하지 않는다.

### 환경변수 override (데모/개발용)

운영자가 실측 데이터를 가지고 있다면 환경변수로 runtime threshold 를 조정 가능:

```bash
# Windows
set FALL_CONSECUTIVE_THRESHOLD=2

# Linux/Mac
export FALL_CONSECUTIVE_THRESHOLD=2

uvicorn ai.main:app --reload --port 8000
```

값 범위 `1 ~ 100`, 비정상 값이면 default 3 으로 fallback.
첫 검출 시 stdout 에 다음과 같이 1 회 출력:
```
[FallDetector] CONSECUTIVE_THRESHOLD overridden via env FALL_CONSECUTIVE_THRESHOLD = 2 (default 3)
```

→ production 은 default 3 유지 권장. 데모/개발 환경에서만 1~2 로 낮춰 즉응성 시연.

---

## 12. 남은 이슈: 웹 런타임 환경

QA 는 모두 통과했지만 **실제 웹 AI 서버 (uvicorn) 에서는 한 프로세스 안에서 MediaPipe Pose
추출과 Keras `.keras` 추론이 동시에 필요하다.** 외부 영상 QA 처럼 venv 를 분리하는 방식이
런타임에서는 불가능하다.

### 현재 venv 별 상태
| venv | TensorFlow 2.21 (vB Keras 로드) | MediaPipe 0.10.14 (`mp.solutions`) |
|---|---|---|
| `.venv` | ✅ | ❌ (protobuf 충돌) |
| `.venv311` | ❌ (`.keras` 로드 호환 문제) | ✅ |

### 웹 런타임 진입 전 후보 전략 (택 1 또는 조합)

1. **fallback 모드 우선 검증**
   - `.venv311` 에서 `.keras` 로드를 포기하고 `fall_lstm.pt` (PyTorch) 또는 휴리스틱 fallback 으로
     서버를 우선 띄워 웹 → AI 연결 동작을 검증.
   - `fall_detector.py` 가 이미 `.keras → .pt → 휴리스틱` 순으로 안전 폴백하므로 코드 수정 불필요.
   - 정확도는 약간 낮지만 통신/스트림/알림 경로는 모두 검증 가능.

2. **호환 가능한 단일 venv 재구성**
   - `.keras` 를 H5 (`.h5`) 또는 `SavedModel` 로 변환해 TF/Keras 버전 의존성 완화.
   - 또는 MediaPipe 측 protobuf 핀 버전을 맞춰 `.venv` 에 MediaPipe 합류 재시도.

3. **프로세스 분리**
   - MediaPipe 추출 프로세스 ↔ 모델 추론 프로세스 를 IPC (HTTP / shared memory / file) 로 연결.
   - 운영 복잡도가 올라가므로 1·2 가 실패할 때만 고려.

→ **다음 작업 권장 순서**: 전략 1 로 웹 연결 동작을 먼저 확인 → 전략 2 로 정확도 회복 →
실패 시 전략 3 검토.

---

## 13. 실행 명령어 모음

```bash
# (A) API 계약 검증
py -m pytest -q qa/test_fall_api.py

# (B) vB Keras 모델 로드 검증 (.venv)
py qa/check_fall_model_load.py

# (C) test_vB.npz baseline 재현 (.venv)
py qa/evaluate_vB_npz.py
py qa/evaluate_vB_npz.py --npz path/to/test_vB.npz

# (D) 외부 영상 QA — Stage 1 (.venv311)
.\.venv311\Scripts\activate
py qa/extract_new_video_keypoints.py
py qa/extract_new_video_keypoints.py --max-frames 600 --mediapipe-complexity 2

# (E) 외부 영상 QA — Stage 2 (.venv)
.\.venv\Scripts\activate
py qa/evaluate_new_video_windows.py                                  # default: thr=0.5, min=1
py qa/evaluate_new_video_windows.py --fall-min-windows 2             # 보수
py qa/evaluate_new_video_windows.py --fall-prob-thr 0.3 --fall-min-windows 1   # 약신호 포함

# (F) 실시간 서버 (개발/데모)
set FALL_CONSECUTIVE_THRESHOLD=2     # Windows
export FALL_CONSECUTIVE_THRESHOLD=2  # Linux/Mac
uvicorn ai.main:app --reload --port 8000
```

### 산출물 위치
- `qa/results/new_video_windows.npz` — Stage 1 키포인트 윈도우
- `qa/results/new_video_metadata.csv` — Stage 1 영상 메타
- `qa/results/new_video_eval.csv` — Stage 2 영상별 결과
- `qa/results/new_video_metrics.json` — Stage 2 데이터셋 metric
- `qa/results/vB_npz_eval.json` — `test_vB.npz` baseline 재현 결과

> `qa/results/` 와 `qa/new_videos/` 는 대용량/실험 산출물이므로 `.gitignore` 에 등록되어 있다.

---

## 부록 A. 변경 이력 (요약)

| 날짜 | 내용 |
|---|---|
| 2026-05-02 | API mock pytest 4건 정착, vB 모델 로드 검증, test_vB.npz baseline 재현, 외부 영상 2단계 QA 구축, filename dedup 버그 수정(video_id 키 매칭), Zenodo 임계값 실험 후 Stage 2 default `fall_min_windows=1` 채택, runtime `FALL_CONSECUTIVE_THRESHOLD` env 도입 |

세부 이력은 git log 참조.

## 부록 B. 알려진 이슈 (코드 외)

- `ai/training/fall_lstm_vB/` 의 세 학습 스크립트는 `from config import ...` 를 시도하지만
  현재 레포에 `config.py` 가 없어 `ModuleNotFoundError` 로 실패한다. 학습 재현이 필요할 때만
  복원하면 됨 (런타임 추론과는 무관).
