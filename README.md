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
| AI 서버 | Python 3.10+ · FastAPI · YOLOv8 · MediaPipe · ONNX Runtime |
| 백엔드 | Node.js 20 · Express · PostgreSQL 18 · Prisma |
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
│   └── models/
│       └── pills_detection.onnx     # 사전학습 약 감지 모델 (별도 다운로드 필요)
│
├── backend/                         # 백엔드 서버 (Express · 포트 3000)
│   ├── src/
│   │   ├── index.js
│   │   ├── routes/                  # auth, patients, medications, detections, notifications
│   │   ├── controllers/
│   │   ├── middleware/
│   │   │   └── auth.js              # JWT 인증 미들웨어
│   │   └── services/
│   │       ├── ai.js                # AI 서버 호출
│   │       └── fcm.js               # FCM 알림 발송
│   └── prisma/
│       ├── schema.prisma            # DB 스키마
│       └── migrations/              # DB 마이그레이션 이력
│
├── frontend/                        # 프론트엔드 (React · 포트 5173)
│   └── src/
│       ├── App.jsx
│       ├── api/client.js            # API 클라이언트 (목업 데이터 포함)
│       └── pages/
│           ├── LoginPage.jsx
│           ├── DashboardPage.jsx
│           ├── PatientDetailPage.jsx
│           └── NotificationsPage.jsx
│
├── requirements.txt
└── docker-compose.yml
```

---

## 개발 현황 (2026-04-02 기준)

### ✅ 완료

**AI 서버**
- FastAPI 서버 구조 완성
- 낙상 감지 파이프라인 — MediaPipe Pose, 연속 3프레임 판정 로직 구현
- 복약 감지 파이프라인 — **정지 이미지(사진) 1장 감지만 동작**
- MJPEG 실시간 스트리밍 엔드포인트 구현
- 백엔드 결과 전송 클라이언트 구현

**백엔드**
- Express + Prisma + JWT 인증 구조 완성
- DB 스키마 설계 완료 (User, Patient, Camera, Medication, MedicationLog, DetectionLog, Notification)
- 모든 라우터/컨트롤러 구현 (auth, patients, medications, detections, notifications)
- DB 마이그레이션 완료 (PostgreSQL 연결 가능 상태)

**프론트엔드**
- 4개 페이지 구현: 로그인, 대시보드, 환자 상세, 알림
- 목업 데이터로 전체 화면 동작 가능 (DB 없이도 UI 확인 가능)
- GitHub Pages 자동 배포 설정 완료

---

### ⚠️ 미완료 / 현재 한계

**AI 모델 — 가장 중요**

| 항목 | 상태 | 설명 |
|------|------|------|
| 복약 감지 (정지 이미지) | ✅ 동작 | `pills_detection.onnx` 모델로 캡슐/알약 객체 감지 |
| 복약 감지 (실시간 영상) | ❌ 미구현 | 코드 골격만 있음, 실제 동작 안 함 |
| 복약 동작 인식 (손→입) | ❌ 미구현 | 약을 집어서 먹는 동작 분석 없음 |
| 복약 파인튜닝 모델 | ❌ 미학습 | `medication.pt` 없음, 학습 데이터 수집 필요 |
| 낙상 감지 (실시간 영상) | ⚠️ 부분 구현 | 로직은 완성, 실제 카메라 연결 테스트 안 됨 |
| ONNX 모델 파일 | ❌ 없음 | `ai/models/pills_detection.onnx` git에 없음, 별도 다운로드 필요 |

**기타**
- Firebase FCM 알림 미연동 (코드만 있음)
- 프론트엔드 실제 API 연동 안 됨 (목업 데이터 사용 중)
- 라즈베리파이 설치 및 카메라 연결 미진행
- Docker 배포 미진행
- 통합 테스트 미진행

---

### 📋 남은 작업

- [ ] **[AI] `pills_detection.onnx` 모델 파일 공유 방법 결정** (파일 크기로 git 업로드 불가)
- [ ] **[AI] 실시간 영상 기반 복약 동작 감지 구현** (손-입 이동 추적)
- [ ] **[AI] 복약 감지 모델 파인튜닝** (데스크탑 GPU 환경)
- [ ] **[AI] 낙상 감지 실제 카메라 연결 테스트**
- [ ] [백엔드] Firebase FCM 연동
- [ ] [프론트] 실제 API 연동 (목업 → 실제)
- [ ] [인프라] 라즈베리파이 설정 및 카메라 연결
- [ ] [인프라] Docker 배포
- [ ] 통합 테스트

---

## AI 모델 현황

| 모델 | 파일 | 감지 대상 | 상태 |
|------|------|----------|------|
| 복약 감지 (사전학습) | `ai/models/pills_detection.onnx` | capsules, tablets | ⚠️ 파일 없음 (별도 다운로드) |
| 복약 감지 (파인튜닝) | `ai/models/medication.pt` | — | ❌ 미학습 |
| 낙상 감지 | MediaPipe Pose (내장) | 사람 관절 | ✅ 코드 완성 |

> **pills_detection.onnx 다운로드**: [seblful/pills-detection](https://huggingface.co/seblful/pills-detection) (mAP 91.7%)
> 다운로드 후 `ai/models/pills_detection.onnx` 경로에 저장

---

## 로컬 실행 방법

### 사전 요구사항
- Node.js 20+
- Python 3.10+
- PostgreSQL 18

### AI 서버
```bash
cd ai
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r ../requirements.txt
uvicorn main:app --reload --port 8000
```

복약 감지 브라우저 테스트:
```
http://localhost:8000/test/medication
```

### 백엔드 서버
```bash
cd backend
npm install
# backend/.env 파일 생성 (아래 환경변수 참고)
npx prisma migrate dev
npm run dev
```

### 프론트엔드
```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
# 목업 데이터로 바로 확인 가능 (DB 없이도 동작)
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

