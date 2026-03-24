# CareVision — AI 기반 독거노인 스마트 케어 시스템

독거노인의 복약 여부를 카메라로 자동 감지하고,
낙상 등 위급상황 발생 시 보호자 앱에 즉시 알림을 전송하는 AI 기반 생활 안전 보조 시스템

---

## 핵심 기능

| 기능 | 설명 |
|------|------|
| 복약 스케줄 관리 | 보호자가 앱에서 피보호자의 복약 일정 등록 (아침/점심/저녁) |
| 복약 감지 | 카메라로 알약/캡슐 객체 감지 → 스케줄에 ✅/❌ 표시 |
| 낙상 감지 | MediaPipe Pose로 관절 분석 → 위급 상황 판정 |
| 보호자 알림 | 복약 누락 및 위급 상황 시 앱 푸시 알림 (FCM) |
| 카메라 스트리밍 | 위급 알림 수신 시 보호자 앱에서 실시간 화면 확인 |

---

## 기술 스택

| 파트 | 기술 |
|------|------|
| AI 서버 | Python 3.11 · FastAPI · YOLOv8 · MediaPipe · ONNX Runtime |
| 백엔드 | Node.js 20 · Express · PostgreSQL · Prisma |
| 프론트 | React 18 · Vite · Tailwind CSS |
| 인프라 | Docker · GitHub Actions · Firebase FCM |

---

## 시스템 구성

```
피보호자 집                          보호자
┌─────────────────────┐              ┌─────────────────────┐
│  카메라              │              │  모바일 앱           │
│  ┌───────────────┐  │   알림/스트림  │  ┌───────────────┐  │
│  │ AI 서버 :8000 │──┼──────────────▶│  │ 복약 스케줄    │  │
│  │ - 낙상 감지   │  │              │  │ 감지 이력     │  │
│  │ - 복약 감지   │  │              │  │ 카메라 스트림  │  │
│  └──────┬────────┘  │              │  └───────────────┘  │
│         │           │              └─────────────────────┘
│  ┌──────▼────────┐  │
│  │ 백엔드 :3000  │  │
│  │ Express+Prisma│  │
│  └───────────────┘  │
└─────────────────────┘
```

---

## 프로젝트 구조

```
carevision/
├── ai/                              # AI 서버 (FastAPI · 포트 8000)
│   ├── main.py                      # FastAPI 진입점
│   ├── detector.py                  # YOLOv8 기본 객체 감지
│   ├── pipelines/
│   │   ├── fall_detector.py         # 낙상 감지 (MediaPipe Pose)
│   │   └── medication_detector.py   # 복약 감지 (ONNX + YOLOv8)
│   ├── api/
│   │   └── routes.py                # API 엔드포인트
│   ├── streaming/
│   │   └── mjpeg.py                 # MJPEG 카메라 스트리밍
│   ├── services/
│   │   └── backend_client.py        # 백엔드 결과 전송
│   ├── training/
│   │   ├── train_medication.py      # 복약 모델 파인튜닝 스크립트
│   │   └── download_dataset.py      # 데이터셋 다운로드
│   ├── models/
│   │   └── pills_detection.onnx     # 사전학습 약 감지 모델
│   └── test_medication.py           # 복약 감지 테스트 스크립트
│
├── backend/                         # 백엔드 서버 (Express · 포트 3000)
│   ├── src/
│   │   ├── index.js                 # Express 진입점
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── patients.js
│   │   │   └── detections.js
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── patientController.js
│   │   │   └── detectionController.js
│   │   ├── middleware/
│   │   │   └── auth.js              # JWT 인증 미들웨어
│   │   └── services/
│   │       ├── ai.js                # AI 서버 호출
│   │       └── fcm.js               # FCM 알림 발송
│   └── prisma/
│       └── schema.prisma            # DB 스키마
│
├── frontend/                        # 프론트엔드 (React · 포트 5173)
│   └── src/
│       ├── App.jsx
│       ├── pages/
│       ├── components/
│       └── api/
│
├── test/                            # 테스트 이미지/영상
├── requirements.txt
└── docker-compose.yml
```

---

## 개발 현황

### 완료
- [x] 프로젝트 구조 설계 및 GitHub 세팅
- [x] AI 서버 기본 구축 (YOLOv8 객체 감지)
- [x] 낙상 감지 파이프라인 (MediaPipe Pose · 연속 3프레임 판정)
- [x] 복약 감지 파이프라인 MVP (ONNX 사전학습 모델 · capsules/tablets 감지)
- [x] 복약 감지 브라우저 테스트 페이지 (`GET /test/medication`)
- [x] 실시간 카메라 MJPEG 스트리밍
- [x] 백엔드 기본 구축 (Express · Prisma · JWT)
- [x] 인증/환자/감지 API 컨트롤러 및 라우터
- [x] DB 스키마 설계 완료 (7개 테이블)
- [x] 프론트엔드 기본 구조

### 진행 예정
- [ ] PostgreSQL 설치 및 DB 마이그레이션
- [ ] 복약 감지 모델 파인튜닝 (데스크탑 GPU 환경)
- [ ] 보호자 앱 UI 개발 (복약 스케줄, 대시보드, 알림)
- [ ] Firebase FCM 알림 연동
- [ ] 통합 테스트

---

## AI 모델 현황

| 모델 | 파일 | 클래스 | 상태 |
|------|------|--------|------|
| 복약 감지 | `ai/models/pills_detection.onnx` | capsules, tablets | ✅ 동작 중 (mAP 91.7%) |
| 낙상 감지 | MediaPipe Pose (내장) | — | ✅ 동작 중 |
| 복약 감지 (파인튜닝) | `ai/models/medication.pt` | — | 학습 예정 |

---

## 로컬 실행 방법

### AI 서버
```bash
cd ai
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r ../requirements.txt
uvicorn main:app --reload --port 8000
```

AI 서버 실행 후 브라우저에서 복약 감지 테스트:
```
http://localhost:8000/test/medication
```

### 복약 감지 CLI 테스트
```bash
cd ai
.\venv\Scripts\python.exe test_medication.py <이미지경로>
# 예: .\venv\Scripts\python.exe test_medication.py ..\test\medicineDetectionTestPic.jpg
```

### 백엔드 서버
```bash
cd backend
npm install
npx prisma migrate dev   # PostgreSQL 설치 후
npm run dev
```

### 프론트엔드
```bash
cd frontend
npm install
npm run dev
```

---

## 환경변수 설정

`backend/.env` 파일 생성:
```env
DATABASE_URL="postgresql://carevision:carevision1234@localhost:5432/carevision_db"
JWT_SECRET="carevision-secret-key"
AI_SERVER_URL="http://localhost:8000"
FIREBASE_PROJECT_ID="your-firebase-project-id"
PORT=3000
```

---

## 포트 정리

| 서비스 | 포트 |
|--------|------|
| AI 서버 | 8000 |
| 백엔드 | 3000 |
| 프론트엔드 | 5173 |
| PostgreSQL | 5432 |

---

## 프로젝트 기간

2026년 3월 ~ 2026년 7월 (컴퓨터공학과 캡스톤 디자인)
