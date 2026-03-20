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

## 핵심 기능

### 1. 낙상 감지
- MediaPipe Pose로 관절 좌표 추출
- 머리(Nose) Y좌표 > 골반(Hip) Y좌표 → 낙상 판정
- 연속 3프레임 유지 시 확정 (오탐지 방지)
- 판정 결과: 정상 / 주의 / 응급 의심 / 응급 확정
- 응급 확정 시 보호자에게 FCM 즉시 알림

### 2. 복약 감지
- YOLOv8으로 약통 / 알약 객체 감지
- 손-입 이동 동작 분석 (연속 프레임 기반)
- 복약 스케줄과 비교하여 복약 여부 판정
- 판정 결과: 복약 완료 / 복약 의심 / 복약 미확인 / 복약 누락
- 복약 누락 시 보호자에게 FCM 알림

### 3. 보호자 모니터링
- 실시간 카메라 스트림 + 감지 결과 오버레이
- 복약 이력 / 감지 이력 조회
- 푸시 알림 수신 및 읽음 처리

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
POST /detect/fall         # 낙상 감지
POST /detect/medication   # 복약 감지
GET  /health              # 서버 상태 확인
```

### 백엔드
```
POST /api/auth/register
POST /api/auth/login
GET  /api/patients
POST /api/patients
GET  /api/detections/:patientId
POST /api/detections
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
2. **프라이버시 보호** — 영상은 최소 처리, 응급 시에만 클립 제공
3. **골든타임 확보** — 감지 → 알림까지 지연 최소화
4. **종합 점수 판정** — 단일 지표가 아닌 다중 지표 종합

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
