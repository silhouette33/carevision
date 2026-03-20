# CareVision — AI 기반 독거노인 스마트 케어 시스템

독거노인의 복약 여부를 카메라로 자동 감지하고,
낙상 등 위급상황 발생 시 보호자에게 즉시 알림을 전송하는 AI 기반 생활 안전 보조 시스템

---

## 기술 스택

| 파트 | 기술 |
|------|------|
| AI | Python 3.11 · YOLOv8 · MediaPipe · FastAPI |
| 백엔드 | Node.js 20 · Express · PostgreSQL 18 · Prisma |
| 프론트 | React 18 · Vite · Tailwind CSS |
| 인프라 | Docker · GitHub Actions · Firebase FCM |

---

## 프로젝트 구조

```
carevision/
├── ai/                         # AI 서버 (Python · FastAPI)
│   ├── main.py                 # FastAPI 앱 진입점 (포트 8000)
│   ├── detector.py             # YOLOv8 객체 감지 클래스
│   ├── pipelines/              # 감지 파이프라인 (낙상, 복약 등)
│   ├── models/                 # 커스텀 모델 파일
│   ├── api/                    # 추가 API 라우터
│   └── data/                   # 학습 데이터
│
├── backend/                    # 백엔드 서버 (Node.js · Express)
│   ├── src/
│   │   ├── index.js            # Express 앱 진입점 (포트 3000)
│   │   ├── routes/             # API 라우트
│   │   │   ├── auth.js         # 로그인 / 회원가입
│   │   │   ├── patients.js     # 환자 관리
│   │   │   └── detections.js   # 감지 이력
│   │   ├── controllers/        # 요청 처리 로직
│   │   │   ├── authController.js
│   │   │   ├── patientController.js
│   │   │   └── detectionController.js
│   │   ├── middleware/
│   │   │   └── auth.js         # JWT 인증 미들웨어
│   │   └── services/
│   │       ├── ai.js           # AI 서버 호출
│   │       └── fcm.js          # Firebase 푸시 알림
│   └── prisma/
│       └── schema.prisma       # DB 스키마 (User, Patient, Detection)
│
├── frontend/                   # 프론트엔드 (React · Vite)
│   ├── src/
│   │   ├── main.jsx            # 앱 진입점
│   │   ├── App.jsx             # 라우팅
│   │   ├── pages/              # 페이지 컴포넌트
│   │   ├── components/         # 공통 컴포넌트
│   │   └── api/                # API 호출 함수
│   └── index.html
│
├── requirements.txt            # Python 패키지 목록
├── docker-compose.yml          # 서비스 전체 실행 설정
└── README.md
```

---

## 개발 현황

### 완료
- [x] 프로젝트 구조 설계
- [x] AI 서버 기본 구축 (YOLOv8 객체 감지)
- [x] 백엔드 기본 구축 (Express + Prisma + JWT)
- [x] 프론트엔드 기본 구축 (React + Vite)

### 진행 예정
- [ ] PostgreSQL DB 설정 및 마이그레이션
- [ ] 로그인 / 인증 API 완성
- [ ] 환자 등록 및 관리 API
- [ ] 감지 이력 저장 및 조회
- [ ] 프론트 페이지 개발 (로그인, 대시보드, 모니터링)
- [ ] 실시간 카메라 스트리밍 연동
- [ ] 낙상 감지 파이프라인 개발
- [ ] Firebase FCM 알림 연동

---

## 로컬 실행 방법

### 1. AI 서버
```bash
cd ai
python -m venv venv
venv\Scripts\activate
pip install -r ../requirements.txt
uvicorn main:app --reload --port 8000
```

### 2. 백엔드 서버
```bash
cd backend
npm install
npx prisma migrate dev
npm run dev
```

### 3. 프론트엔드
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
JWT_SECRET="your-secret-key"
AI_SERVER_URL="http://localhost:8000"
FIREBASE_PROJECT_ID="your-firebase-project-id"
```

---

## 프로젝트 기간

2025년 3월 ~ 2025년 7월
