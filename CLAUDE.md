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
│   ├── pipelines/
│   │   ├── fall_detector.py       # 낙상 감지 (MediaPipe Pose)
│   │   └── medication_detector.py # 복약 감지 (YOLOv8)
│   ├── models/                    # 모델 파일 (.pt)
│   ├── api/                       # 추가 라우터
│   └── data/                      # 학습 데이터
├── backend/                       # 백엔드 서버 (Express :3000)
│   ├── src/
│   │   ├── index.js               # Express 진입점
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── patients.js
│   │   │   └── detections.js
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── patientController.js
│   │   │   └── detectionController.js
│   │   ├── middleware/
│   │   │   └── auth.js            # JWT 인증 미들웨어
│   │   └── services/
│   │       ├── ai.js              # AI 서버 호출
│   │       └── fcm.js             # FCM 알림 발송
│   └── prisma/
│       └── schema.prisma          # DB 스키마
└── frontend/                      # 프론트엔드 (React :5173)
    ├── src/
    │   ├── App.jsx
    │   ├── main.jsx
    │   ├── pages/
    │   ├── components/
    │   └── api/
    └── index.html
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
POST /detect/fall              # 낙상 감지
POST /detect/medication        # 복약 감지
GET  /health                   # 서버 상태 확인
GET  /stream/:cameraId         # 카메라 실시간 스트리밍 (MJPEG)
```

### 백엔드
```
POST /api/auth/register
POST /api/auth/login

GET  /api/patients
POST /api/patients

GET  /api/medications/:patientId           # 복약 스케줄 목록
POST /api/medications                      # 복약 스케줄 등록
PATCH /api/medications/:id                 # 스케줄 수정
DELETE /api/medications/:id               # 스케줄 삭제

GET  /api/medications/logs/:patientId      # 복약 기록 (체크/X 이력)

GET  /api/detections/:patientId            # 위험 감지 이력
POST /api/detections                       # 감지 결과 저장

GET  /api/notifications                    # 보호자 알림 목록
PATCH /api/notifications/:id/read         # 알림 읽음 처리
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

## 개발 현황

- [x] 프로젝트 구조 설계 및 GitHub 세팅
- [x] AI 서버 기본 구축 (YOLOv8 객체 감지)
- [x] 백엔드 기본 구조 (Express · Prisma · JWT)
- [x] DB 스키마 설계 완료
- [x] 프론트엔드 기본 구조
- [ ] PostgreSQL 설치 및 DB 마이그레이션
- [ ] 낙상 감지 파이프라인 (MediaPipe)
- [ ] 복약 감지 파이프라인 (YOLOv8 파인튜닝)
- [ ] 프론트 페이지 개발
- [ ] Firebase FCM 연동
- [ ] 통합 테스트

---

*마지막 업데이트: 2026-03-20*
