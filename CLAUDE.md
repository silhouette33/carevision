# CLAUDE.md — CareVision AI 기반 독거노인 스마트 케어 시스템

> 이 파일은 Claude Code가 프로젝트 컨텍스트를 자동으로 파악하기 위한 지침 파일입니다.

---

## 프로젝트 개요

- **프로젝트명**: CareVision — AI 기반 독거노인 스마트 케어 모니터링 시스템
- **과목**: 컴퓨터공학과 캡스톤 디자인
- **핵심 목표**: 카메라 영상과 AI를 활용하여 독거노인의 낙상·복약 위험을 실시간 감지하고 보호자에게 즉시 알림

---

## 기술 스택

| 파트 | 기술 |
|------|------|
| AI 서버 | Python 3.11 · FastAPI · YOLOv8 · MediaPipe |
| 백엔드 | Node.js 20 · Express · PostgreSQL 18 · Prisma |
| 프론트엔드 | React 18 · Vite · Tailwind CSS |
| 인증 | JWT (jsonwebtoken · bcryptjs) |
| 알림 | Firebase FCM |
| 인프라 | Docker · GitHub Actions |

---

## 프로젝트 구조

```
carevision/
├── CLAUDE.md
├── README.md
├── requirements.txt               # Python 패키지
├── docker-compose.yml
├── ai/                            # AI 서버 (FastAPI :8000)
│   ├── main.py                    # FastAPI 진입점
│   ├── detector.py                # YOLOv8 객체 감지 클래스
│   ├── test_medication.py         # 복약 감지 단독 테스트
│   ├── yolov8n.pt                 # YOLOv8 기본 모델
│   ├── api/
│   │   └── routes.py              # FastAPI 라우터
│   ├── pipelines/
│   │   ├── fall_detector.py       # 낙상 감지 (MediaPipe Pose)
│   │   └── medication_detector.py # 복약 감지 (ONNX + YOLOv8)
│   ├── models/
│   │   └── pills_detection.onnx   # 알약 감지 ONNX 모델
│   ├── services/
│   │   └── backend_client.py      # 백엔드 서버 호출 클라이언트
│   ├── streaming/
│   │   └── mjpeg.py               # MJPEG 스트리밍
│   ├── training/
│   │   ├── download_dataset.py    # 데이터셋 다운로드
│   │   └── train_medication.py    # 모델 학습
│   └── data/                      # 학습 데이터
├── backend/                       # 백엔드 서버 (Express :3000)
│   ├── src/
│   │   ├── index.js               # Express 진입점
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── patients.js
│   │   │   ├── detections.js
│   │   │   ├── medications.js     # 복약 스케줄 라우터
│   │   │   └── notifications.js   # 알림 라우터
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── patientController.js
│   │   │   ├── detectionController.js
│   │   │   ├── medicationController.js   # 복약 스케줄/기록
│   │   │   └── notificationController.js # 알림 CRUD
│   │   ├── middleware/
│   │   │   └── auth.js            # JWT 인증 미들웨어
│   │   └── services/
│   │       ├── ai.js              # AI 서버 호출
│   │       └── fcm.js             # FCM 알림 발송
│   └── prisma/
│       └── schema.prisma          # DB 스키마
├── frontend/                      # 프론트엔드 (React :5173)
│   ├── index.html
│   ├── prototype.html             # UI 프로토타입 (정적 HTML)
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx                # 라우팅 + 로그인 상태 관리
│       ├── main.jsx
│       ├── api/
│       │   └── client.js          # API 클라이언트 (목업 데이터 포함)
│       └── pages/
│           ├── LoginPage.jsx      # 로그인/회원가입
│           ├── DashboardPage.jsx  # 대시보드 (환자 목록)
│           ├── PatientDetailPage.jsx  # 환자 상세 (복약/감지)
│           └── NotificationsPage.jsx  # 알림 목록
├── test/                          # 테스트 이미지
│   ├── medicineDetectionTestPic.jpg
│   └── result_medicineDetectionTestPic.jpg
└── docs/
    └── test.md
```

---

## 포트 정리

| 서비스 | 포트 |
|--------|------|
| 프론트엔드 | 5173 |
| 백엔드 | 3000 |
| AI 서버 | 8000 |
| PostgreSQL | 5432 |

---

## 사용자 구성

| 역할 | 디바이스 | 설명 |
|------|---------|------|
| 피보호자 | 카메라 (가정 내 설치) | 약 복용 및 위험 상황을 카메라로 감지 |
| 보호자 | 모바일 앱 (Capacitor) | 약 일정 관리, 알림 수신, 카메라 스트림 확인 |

---

## 핵심 기능

### 1. 복약 스케줄 관리 (보호자 앱)
- 보호자가 앱에서 피보호자의 복약 일정 등록 (예: 아침 8시 혈압약, 점심 12시 당뇨약 등)
- 스케줄 화면에 시간대별 복약 목록 표시
- 복약 감지 시 → 해당 항목에 ✅ 체크 표시
- 복약 미감지 시 → 해당 항목에 ❌ 표시 + 보호자 앱 푸시 알림

### 2. 복약 감지 (AI 카메라)
- YOLOv8으로 약통 / 알약 객체 감지
- 손-입 이동 동작 분석 (연속 프레임 기반)
- 스케줄 시간 기준으로 복약 여부 판정
- 판정 결과: 복약 완료 / 복약 의심 / 복약 누락

### 3. 위험 상황 감지 (AI 카메라)
- MediaPipe Pose로 관절 좌표 추출
- 머리(Nose) Y좌표 > 골반(Hip) Y좌표 → 낙상 판정
- 연속 3프레임 유지 시 위급 확정 (오탐지 방지)
- 위급 확정 시 → 보호자 앱 즉시 푸시 알림

### 4. 실시간 카메라 스트리밍 (보호자 앱)
- 위험 상황 알림 수신 시 보호자 앱에서 해당 카메라 화면 실시간 확인 가능
- 스트리밍 방식: WebRTC 또는 MJPEG over HTTP
- 평상시에는 스트림 비활성, 위급 알림 시 자동 활성화 (프라이버시 보호)

---

## DB 스키마 구조

```
User (보호자)
 └── Patient (환자)
      ├── Camera (카메라)
      ├── Medication (복약 일정)
      │    └── MedicationLog (복약 기록)
      ├── DetectionLog (감지 이력)
      └── Notification (알림)
```

---

## API 구조

### AI 서버
```
POST /detect/fall                  # 낙상 감지
POST /detect/medication            # 복약 감지 (base64 스트림)
POST /detect/medication/upload     # 복약 감지 (이미지 업로드)
POST /detect                       # 일반 객체 감지
GET  /test/medication              # 복약 감지 테스트 UI (HTML)
GET  /health                       # 서버 상태 확인
GET  /stream/:cameraId             # 카메라 실시간 스트리밍 (MJPEG)
```

### 백엔드
```
POST /api/auth/register
POST /api/auth/login

GET    /api/patients               # 환자 목록
GET    /api/patients/:id           # 환자 상세
POST   /api/patients               # 환자 등록
PUT    /api/patients/:id           # 환자 수정
DELETE /api/patients/:id           # 환자 삭제

GET    /api/medications/:patientId # 복약 스케줄 목록
POST   /api/medications            # 복약 스케줄 등록
PATCH  /api/medications/:id        # 스케줄 수정
DELETE /api/medications/:id        # 스케줄 삭제
GET    /api/medications/logs/:patientId  # 복약 기록
POST   /api/medications/logs       # 복약 기록 생성

GET    /api/detections             # 감지 이력 조회
POST   /api/detections             # 감지 결과 저장

GET    /api/notifications          # 알림 목록
GET    /api/notifications/unread-count   # 읽지 않은 알림 수
PATCH  /api/notifications/:id/read      # 알림 읽음 처리
PATCH  /api/notifications/read-all      # 전체 읽음 처리
```

---

## 공통 응답 형식

```json
{ "success": true, "data": {}, "message": "성공" }
{ "success": false, "data": null, "message": "에러 내용" }
```

---

## 환경변수 (backend/.env)

```env
DATABASE_URL="postgresql://carevision:carevision1234@localhost:5432/carevision_db"
JWT_SECRET="carevision-secret-key"
AI_SERVER_URL="http://localhost:8000"
FIREBASE_PROJECT_ID="your-firebase-project-id"
PORT=3000
```

---

## 자주 사용하는 명령어

```bash
# AI 서버
cd ai && uvicorn main:app --reload --port 8000

# 백엔드
cd backend && npm run dev

# 프론트엔드
cd frontend && npm run dev

# DB 마이그레이션
cd backend && npx prisma migrate dev
```

---

## 개발 원칙

1. **오탐지 최소화** — 단일 프레임이 아닌 연속 프레임 분석 필수
2. **프라이버시 보호** — 영상 스트리밍은 위급 상황 알림 시에만 활성화
3. **골든타임 확보** — 감지 → 알림까지 지연 최소화
4. **종합 점수 판정** — 단일 지표가 아닌 다중 지표 종합
5. **모바일 우선** — 보호자 UI는 Capacitor 기반 앱 (기존 React 코드 재사용)

---

## 팀 구성 (6명)

| 역할 | 인원 | 담당 |
|------|------|------|
| 팀장 + AI + 통합 | 1명 | 전체 구조 관리, AI 서버, 라즈베리파이, 통합 테스트 |
| 백엔드 | 1명 | PostgreSQL 연결, FCM 연동, API 완성 |
| 데이터처리 (AI) | 1명 | 복약/낙상 감지 정확도 개선, 학습 데이터 수집 |
| 프론트엔드 | 2명 | 디자인, UI/UX, 페이지 개선, API 연동 |
| 문서/QA | 1명 | 발표 자료, 보고서, 테스트 케이스 |

---

## Git 브랜치 전략

```
main              → 항상 동작하는 최종 코드
develop           → 통합 테스트용
feature/ai        → AI 파이프라인 개발
feature/backend   → 백엔드 개발
feature/frontend  → 프론트엔드 개발
```

---

## 개발 현황

### 완료
- [x] 프로젝트 구조 설계 및 GitHub 세팅
- [x] AI 서버 기본 구축 (FastAPI + YOLOv8)
- [x] 낙상 감지 파이프라인 (MediaPipe Pose — 연속 3프레임 판정)
- [x] 복약 감지 파이프라인 MVP (ONNX 모델 — capsules/tablets 감지)
- [x] 복약 감지 테스트 페이지 (`GET /test/medication`)
- [x] 실시간 카메라 MJPEG 스트리밍
- [x] 백엔드 기본 구조 (Express · Prisma · JWT)
- [x] DB 스키마 설계 완료
- [x] 백엔드 라우터/컨트롤러 전체 구현 (auth, patients, medications, detections, notifications)
- [x] 백엔드 AI 서버 호출 클라이언트
- [x] 프론트엔드 페이지 4종 완성 (로그인, 대시보드, 환자 상세, 알림)
- [x] 프론트엔드 API 클라이언트 + 목업 데이터 (DB 없이 화면 테스트 가능)
- [x] Git 브랜치 전략 수립 (main, develop, feature/*)

### 미완료
- [ ] PostgreSQL 설치 및 DB 마이그레이션
- [ ] 복약 감지 모델 파인튜닝 (데스크탑에서 진행 예정)
- [ ] 프론트엔드 디자인 개선 (UI/UX)
- [ ] Firebase FCM 연동
- [ ] 라즈베리파이 설치 및 카메라 연결
- [ ] 통합 테스트
- [ ] Docker 배포

---

## 모델 현황

| 모델 | 파일 | 클래스 | 비고 |
|------|------|--------|------|
| 복약 감지 (ONNX) | `ai/models/pills_detection.onnx` | capsules, tablets | seblful/pills-detection, mAP 91.7% |
| 낙상 감지 | MediaPipe Pose (내장) | — | 별도 모델 파일 없음 |
| 복약 감지 (파인튜닝) | `ai/models/medication.pt` | — | 미완성 (데스크탑 학습 예정) |

---

## 테스트

```bash
# 복약 감지 — 사진 파일로 테스트
cd ai
.\venv\Scripts\python.exe test_medication.py ..\test\medicineDetectionTestPic.jpg

# 복약 감지 — 브라우저 UI 테스트 (서버 실행 후)
# http://localhost:8000/test/medication

# 웹캠 실시간 테스트
.\venv\Scripts\python.exe test_medication.py --webcam
```

---

*마지막 업데이트: 2026-03-27*
