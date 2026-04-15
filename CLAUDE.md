# CLAUDE.md — CareVision

> Claude Code가 프로젝트 컨텍스트를 자동으로 파악하기 위한 지침 파일.
> 팀/일정/발표 같은 **비개발 정보는 여기 두지 않는다**. 코드/아키텍처/파이프라인/API만 기록.

---

## 프로젝트 개요

**CareVision** — AI 기반 독거노인 스마트 케어 모니터링 시스템.
카메라 영상과 AI로 **낙상**과 **복약 여부**를 실시간 감지하고, 보호자 앱으로 즉시 알림.

---

## 기술 스택

| 파트 | 기술 |
|------|------|
| AI 서버 | Python 3.11 · FastAPI · Ultralytics YOLOv8 · MediaPipe (Pose/Hands) · PyTorch (LSTM) · ONNX Runtime · OpenCV |
| 백엔드 | Node.js 20 · Express · Prisma · PostgreSQL 18 · JWT (jsonwebtoken · bcryptjs) |
| 프론트엔드 | React 18 · Vite · Tailwind CSS (보호자 UI는 Capacitor 래핑 예정) |
| 알림 | Firebase FCM (미연동) |
| 인프라 | Docker · GitHub Actions |

---

## 프로젝트 구조

```
carevision/
├── CLAUDE.md
├── README.md
├── requirements.txt
├── docker-compose.yml
├── ai/                                     # AI 서버 (:8000)
│   ├── main.py                             # FastAPI 진입점
│   ├── detector.py                         # 일반 YOLOv8 래퍼
│   ├── yolov8n.pt                          # 기본 YOLOv8 가중치
│   ├── api/routes.py                       # 모든 엔드포인트
│   ├── pipelines/
│   │   ├── fall_detector.py                # MediaPipe Pose 휴리스틱 낙상
│   │   ├── medication_detector.py          # YOLO/ONNX 약 객체 감지
│   │   ├── hand_to_mouth_detector.py       # MediaPipe Hands + LSTM
│   │   └── medication_scorer.py            # 두 신호 시간창 결합 → TAKEN 판정
│   ├── models/
│   │   ├── pills_detection.onnx            # capsules/tablets ONNX (fallback)
│   │   ├── medication.pt                   # 파인튜닝 YOLO (41클래스, mAP50 ≈ 0.34)
│   │   └── hand_to_mouth_lstm.pt           # 손→입 LSTM 가중치
│   ├── services/backend_client.py          # 백엔드 콜백 클라이언트
│   ├── streaming/mjpeg.py                  # MJPEG 스트리밍
│   ├── training/                           # 학습 스크립트
│   ├── test_medication.py                  # 정지 이미지 테스트
│   ├── test_hand_to_mouth.py               # LSTM 단독 테스트
│   └── test_medication_score.py            # 통합 파이프라인 테스트 (웹캠/비디오/headless)
├── backend/                                # Express (:3000)
│   ├── src/
│   │   ├── index.js
│   │   ├── routes/        (auth, patients, medications, detections, notifications)
│   │   ├── controllers/   (동일 5종)
│   │   ├── middleware/auth.js              # JWT 인증
│   │   └── services/      (ai.js, fcm.js)
│   └── prisma/schema.prisma
├── frontend/                               # React + Vite (:5173)
│   ├── vite.config.js                      # base: '/carevision/'
│   └── src/
│       ├── App.jsx
│       ├── api/client.js                   # API 클라이언트 + 목업
│       ├── camera/CameraPage.jsx           # 실시간 웹캠 + 스코어 UI
│       └── pages/        (Login, Dashboard, PatientDetail, Notifications)
├── test/                                   # 테스트용 이미지
└── docs/
    └── PROJECT_OVERVIEW.md                 # 포트폴리오/블로그용 통합 설명
```

**로컬 전용 (git 제외):** `ai/test_videos/`, `ai/probe_camera.py`, `.claude/`, `.vscode/`.

---

## 포트

| 서비스 | 포트 | 비고 |
|---|---|---|
| 프론트엔드 | 5173 | URL: `http://localhost:5173/carevision/` (base 경로 필수) |
| 백엔드 | 3000 | |
| AI 서버 | 8000 | |
| PostgreSQL | 5432 | |

---

## AI 파이프라인

### 1. `fall_detector` — 낙상 (휴리스틱, 학습 없음)
- MediaPipe Pose로 33점 추출
- 판정: `nose_y > hip_y` **OR** `abs(shoulder_y - hip_y) < 0.15`
- 연속 3프레임 이상 → `emergency`, 2프레임 → `suspected`, 1프레임 → `caution`
- **한계:** 침대에 "누움"과 "넘어짐"을 구분 못 함 (오탐 확정 이슈)

### 2. `medication_detector` — 약 객체 감지
- 우선순위: `medication.pt` (파인튜닝 YOLO) > `pills_detection.onnx` > `yolov8n.pt`
- 기본 신뢰도 임계값 0.25 (routes에서 override 가능)
- **한계:** `medication.pt` mAP50 ≈ 0.34. 원거리/작은 약통 박스 누락 심함.

### 3. `hand_to_mouth_detector` — 손→입 동작 (LSTM)
- MediaPipe Hands 21점 × 2손 = 42차원 특징
- 15프레임 슬라이딩 버퍼 → LSTM(2층, hidden 128, dropout 0.3) → Linear(128→64) → ReLU → Dropout → Linear(64→1) → sigmoid
- 임계값 0.5, 연속 2프레임 양성에서 `detecting`
- 파일: `ai/models/hand_to_mouth_lstm.pt` (898K)

### 4. `medication_scorer` — 두 신호 결합 (상태 머신)
- 10초 슬라이딩 윈도우에서 `box_seen`, `motion_prob ≥ 0.5` 카운트
- 판정:
  ```
  box_frames ≥ 3 AND motion_frames ≥ 2 → taken       (복약 완료)
  box만 충분                             → preparing   (꺼내만 놓음)
  motion만 충분                          → eating_unknown (뭔가 먹음)
  둘 다 부족                              → idle
  ```
- 점수: `score = 0.4 × box_ratio + 0.6 × motion_ratio`
- `taken` 래치: 한 번 확정되면 `reset` 전까지 유지
- 카메라별(`camera_id`) 독립 상태

---

## API

### AI 서버 (`ai/api/routes.py`)
```
POST /detect/live                 # 프론트 웹캠 통합 엔드포인트
                                  # → {medication, hand_to_mouth, medication_score, fall, model_type}
POST /detect/reset                # 스코어러 + 낙상 카운터 초기화 (cameraId)
POST /detect/fall                 # 낙상 단독
POST /detect/medication           # 복약 단독 (base64)
POST /detect/medication/upload    # 복약 단독 (multipart)
POST /detect                      # 일반 YOLO 객체 감지
GET  /test/medication             # 브라우저 테스트 UI
GET  /stream/:cameraId            # MJPEG 스트림
GET  /health
```

**`/detect/live` 응답 스키마 (핵심):**
```jsonc
{
  "success": true,
  "medication":     { "detected": true, "objects": [{bbox,label,confidence}, ...] },
  "hand_to_mouth":  { "detected": false, "confidence": 0.42, "status": "..." },
  "medication_score": {
    "taken": false,
    "score": 0.35,
    "status": "preparing",
    "window": { "seconds":10, "total_frames":18, "box_frames":5, "motion_frames":1,
                "box_min":3, "motion_min":2 }
  },
  "fall": { "detected": false, "status": "normal", "confidence": 0.0 },
  "model_type": "custom_pt"
}
```

### 백엔드 (`backend/src/routes/*`)
```
POST   /api/auth/register | /api/auth/login

GET    /api/patients                       POST   /api/patients
GET    /api/patients/:id                   PUT    /api/patients/:id
DELETE /api/patients/:id

GET    /api/medications/:patientId         POST   /api/medications
PATCH  /api/medications/:id                DELETE /api/medications/:id
GET    /api/medications/logs/:patientId    POST   /api/medications/logs

GET    /api/detections                     POST   /api/detections

GET    /api/notifications
GET    /api/notifications/unread-count
PATCH  /api/notifications/:id/read
PATCH  /api/notifications/read-all
```

### 공통 응답 형식
```json
{ "success": true,  "data": {}, "message": "성공" }
{ "success": false, "data": null, "message": "에러 내용" }
```

---

## DB 스키마 (Prisma)

```
User (보호자)
 └── Patient (환자)
      ├── Camera
      ├── Medication             (복약 일정)
      │    └── MedicationLog     (복약 기록)
      ├── DetectionLog           (감지 이력)
      └── Notification
```

---

## 환경변수

**`backend/.env`**
```env
DATABASE_URL="postgresql://carevision:carevision1234@localhost:5432/carevision_db"
JWT_SECRET="carevision-secret-key"
AI_SERVER_URL="http://localhost:8000"
FIREBASE_PROJECT_ID="your-firebase-project-id"
PORT=3000
```

**`frontend/.env` (선택)**
```env
VITE_AI_BASE_URL=http://localhost:8000
```

---

## 자주 쓰는 명령어

```bash
# AI 서버
cd ai && .\venv\Scripts\activate && uvicorn main:app --reload --port 8000

# 백엔드
cd backend && npm run dev

# 프론트엔드
cd frontend && npm run dev           # http://localhost:5173/carevision/

# DB 마이그레이션
cd backend && npx prisma migrate dev
```

### 테스트 스크립트 (`ai/`)
```bash
# 복약 단일 이미지
.\venv\Scripts\python.exe test_medication.py ..\test\medicineDetectionTestPic.jpg

# 손→입 LSTM 단독 (웹캠 또는 비디오)
.\venv\Scripts\python.exe test_hand_to_mouth.py [video.mp4]

# 전체 파이프라인 통합 (스코어러 포함)
.\venv\Scripts\python.exe test_medication_score.py                        # 웹캠
.\venv\Scripts\python.exe test_medication_score.py video.mp4 --headless   # 로그 only
.\venv\Scripts\python.exe test_medication_score.py video.mp4 --save out.mp4

# 윈도우 웹캠 백엔드 이슈가 있으면 probe_camera.py 로 DSHOW/MSMF 진단 (로컬 전용)
```

**윈도우 웹캠 주의:** OpenCV 기본(MSMF)이 프레임을 못 잡는 경우 `cv2.VideoCapture(idx, cv2.CAP_DSHOW)`로 백엔드 강제. `test_medication_score.py`는 이미 정수 인덱스일 때 DSHOW를 씀.

---

## 모델 인벤토리

| 모델 | 파일 | 역할 | 상태 |
|---|---|---|---|
| YOLOv8 기본 | `ai/yolov8n.pt` | 일반 객체 감지 | OK |
| 알약 ONNX | `ai/models/pills_detection.onnx` | capsules/tablets | OK (fallback 용) |
| 복약 파인튜닝 | `ai/models/medication.pt` | 41클래스 한국 의약품 | ⚠️ mAP50 ≈ 0.34, 원거리 약함 |
| 손→입 LSTM | `ai/models/hand_to_mouth_lstm.pt` | 복약 동작 판별 | ✅ 작동 확인 |
| 낙상 | — | MediaPipe Pose 휴리스틱 | ⚠️ 학습 모델 없음 |

---

## 개발 원칙

1. **오탐 최소화** — 단일 프레임 판정 금지, 시간창/연속 프레임 필수.
2. **종합 점수 판정** — 단일 신호 아닌 복수 신호 결합 (약 객체 + 손→입 동작).
3. **프라이버시** — 영상 스트림은 위급 알림 시에만 활성화.
4. **골든타임** — 감지 → 알림 지연 최소화.
5. **모바일 우선** — 보호자 UI는 세로 480px 기준, Capacitor 래핑 전제.

---

## 현재 상태 스냅샷

### 완료
- AI 서버: FastAPI + 3 파이프라인 + 스코어러 통합
- 백엔드: Express + Prisma + JWT + 라우터/컨트롤러 5종
- 프론트: 로그인/대시보드/환자 상세/알림 + **실시간 카메라 페이지(스코어 UI 포함)**
- `/detect/live`에서 bbox + LSTM 확률 + 상태 머신 결과 동시 반환

### 미완
- 낙상을 학습 모델로 교체 (침대 누움 오탐 해결)
- `medication.pt` 정확도 개선 또는 약통 전용 모델로 교체
- PostgreSQL 실제 연결 (현재 목업)
- Firebase FCM 연동
- 라즈베리파이 배포
- Docker 통합 배포

---

## 알려진 한계

- **낙상 휴리스틱**: 누움 자세 = 낙상 오탐. 카메라 각도/시간 기반(급격한 자세 변화) 추가 필요.
- **`medication.pt` 저정확도**: 원거리에서 박스 누락 → `BOX_MIN_FRAMES` 충족 실패. 학습 데이터 증강 또는 임계값 튜닝 필요.
- **브라우저 웹캠 의존**: `CameraPage.jsx`는 `getUserMedia` 기반이라 HTTPS 아니면 localhost 외 접근 불가.
- **스코어러 단일 인스턴스**: `camera_id`로 분리하지만 프로세스 재시작 시 상태 소실 (래치 포함).

---

## Git

메인 브랜치는 `main`. 기능 개발은 `feature/*`에서 진행 후 PR. 최근 흐름: `feature/ai-live-detection`에 스코어러 + 프론트 UI 통합.

---

*마지막 업데이트: 2026-04-15*
