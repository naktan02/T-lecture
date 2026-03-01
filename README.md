# 🎓 T-LECTURE

**군 부대 교육 강사 배정 및 일정 관리 시스템**

군 장병 대상 인성교육 강사진의 배정, 스케줄링, 발송 업무를 자동화한 풀스택 웹 애플리케이션입니다.

---

## 📋 프로젝트 개요

| 항목            | 내용                     |
| --------------- | ------------------------ |
| **개발 기간**   | 2025.10 ~ 현재 (운영 중) |
| **개발 인원**   | 2인 (풀스택)             |
| **주요 사용자** | 관리자, 강사 (150명+)    |

### 주요 사용자

- **관리자**: 부대 관리, 교육 일정 관리, 강사 배정, 대시보드 통계 확인
- **강사**: 배정된 교육 확인 및 응답, 개인 일정/대시보드 관리

---

## 🛠 기술 스택

### Frontend

![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![React Query](https://img.shields.io/badge/React_Query-FF4154?style=flat-square&logo=reactquery&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-CA4245?style=flat-square&logo=reactrouter&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-22B5BF?style=flat-square&logo=chartdotjs&logoColor=white)

### Backend

![Node.js](https://img.shields.io/badge/Node.js_22-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma_7-2D3748?style=flat-square&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)

### Infrastructure & Services

![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white)
![Render](https://img.shields.io/badge/Render-46E3B7?style=flat-square&logo=render&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Cloudflare-F38020?style=flat-square&logo=cloudflare&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)

### External APIs & Tools

![Kakao](https://img.shields.io/badge/Kakao_Maps_API-FFCD00?style=flat-square&logo=kakao&logoColor=black)
![Brevo](https://img.shields.io/badge/Brevo-0B996E?style=flat-square&logo=sendinblue&logoColor=white)
![Sentry](https://img.shields.io/badge/Sentry-362D59?style=flat-square&logo=sentry&logoColor=white)

---

## ✨ 주요 기능

### 🔐 관리자 기능

| 기능                   | 설명                                                    |
| ---------------------- | ------------------------------------------------------- |
| **자동 배정 알고리즘** | 거리, 공정성, 연속일수, 덕목 적합성 기반 최적 강사 매칭 |
| **발송 시스템**        | 이메일 템플릿 기반 배정 안내 자동 발송                  |
| **대시보드**           | 월별 교육 현황, 강사별 통계, 팀 분석                    |
| **부대/강사 관리**     | Excel 일괄 업로드, 좌표 자동 변환                       |

### 👨‍🏫 강사 기능

| 기능              | 설명                              |
| ----------------- | --------------------------------- |
| **배정 응답**     | 수락/거절/대기 상태 관리          |
| **스케줄 캘린더** | 월별 교육 일정 확인               |
| **내 대시보드**   | 근무 시간, 이동 거리, 수락률 통계 |

---

## 🧠 핵심 기술적 도전

### 1. 자동 배정 알고리즘

다중 조건을 고려한 최적 강사 매칭 시스템을 직접 설계 및 구현했습니다.

**Hard Filter (필수 조건 - 미충족 시 배정 불가)**

- 가용일 등록 여부, 중복 배정 방지, 거리 제한 (실습강사 50km, 보조강사 설정값)
- 주강사 필수 조건, 취소자 재배정 방지

**Soft Scoring (가중치 기반 순위 결정)**

```
📊 스코어링 가중치
├── 연속 배정 보너스 (100) - 같은 교육기간 배정 시 최우선
├── 우선배정 크레딧 (25)  - 시스템 지정 우선 배정
├── 형평성 점수 (20)      - 배정 횟수 적을수록 가산
├── 거리 점수 (15)        - 가까울수록 가산
├── 신청 횟수 (10)        - 가능일 등록 많을수록 가산
├── 팀 매칭 (8)           - 같은 팀원과 함께 배정 시 가산
├── 팀 다양성 (-15)       - 한 팀 집중 시 감점
├── 거절 패널티 (-10)     - 최근 거절 횟수만큼 감점
└── 기회비용 (-5)         - 범용 자원 아끼기
```

### 2. 거리 기반 필터링

- **Kakao Maps API** 연동으로 주소 → 좌표 변환
- 강사-교육장소 간 **실제 도로 거리** 계산
- **GitHub Actions 스케줄러**로 거리 데이터 일괄 갱신 (API 호출 제한 대응)

### 3. 성능 최적화

- **N+1 쿼리 제거** 및 배치 처리로 DB 부하 감소
- `Promise.all` 병렬화로 API 응답 시간 단축
- **React Query 캐싱**으로 불필요한 API 호출 최소화

### 4. 무료 티어 인프라 최적화

- **Render** 무료 티어 콜드 스타트 대응
  - GitHub Actions **cron 스케줄러**로 15분 간격 헬스체크 → 서버 상시 활성 유지

- **Sentry** 무료 티어 최적화
  - 에러 샘플링 비율 조정으로 월간 이벤트 한도 관리
  - 트랜잭션 추적 비율 최적화
  - 에러 수집 및 해결

- **Supabase** 연결 풀 타임아웃 해결
  - Supavisor 연결 풀 타임아웃 문제 분석 및 해결
  - Keep-alive 메커니즘 적용으로 유휴 연결 유지
  - GitHub Actions 주기적 ping으로 DB 연결 상태 모니터링
  - Pool size 30, connection limit 및 timeout 설정으로 안정성 확보

---

## 🖼 스크린샷

### 배정 화면

![Admin Dashboard](docs/images/assignment.png)

### 부대 관리 화면

![Assignment](docs/images/unit.png)

---

## 📁 프로젝트 구조

```
T-lecture/
├── client/                    # Frontend (React)
│   ├── src/
│   │   ├── app/              # 앱 진입점, 라우터
│   │   ├── features/         # 기능별 모듈
│   │   │   ├── admin/        # 관리자 기능
│   │   │   ├── assignment/   # 배정 관리
│   │   │   ├── auth/         # 인증
│   │   │   ├── dashboard/    # 대시보드
│   │   │   ├── dispatch/     # 배차 관리
│   │   │   ├── inquiry/      # 문의하기
│   │   │   ├── notice/       # 공지사항
│   │   │   ├── schedule/     # 일정 관리
│   │   │   ├── settings/     # 설정
│   │   │   ├── unit/         # 부대 관리
│   │   │   └── user/         # 사용자 관리
│   │   ├── shared/           # 공통 컴포넌트, 유틸
│   │   └── styles/           # 전역 스타일
│   └── package.json
│
├── server/                    # Backend (Express)
│   ├── src/
│   │   ├── domains/          # 도메인별 모듈
│   │   │   ├── assignment/   # 배정 로직
│   │   │   ├── auth/         # 인증/인가
│   │   │   ├── batch/        # 배치 작업
│   │   │   ├── dashboard/    # 대시보드 API
│   │   │   ├── data-backup/  # 데이터 백업
│   │   │   ├── dispatch/     # 배차 관리
│   │   │   ├── distance/     # 거리 계산
│   │   │   ├── inquiry/      # 문의 관리
│   │   │   ├── instructor/   # 강사 관리
│   │   │   ├── metadata/     # 메타데이터
│   │   │   ├── notice/       # 공지사항
│   │   │   ├── report/       # 리포트
│   │   │   ├── unit/         # 부대 관리
│   │   │   └── user/         # 사용자 관리
│   │   ├── infra/            # 외부 서비스 연동
│   │   ├── middleware/       # Express 미들웨어
│   │   └── config/           # 설정
│   ├── prisma/               # Prisma 스키마 및 마이그레이션
│   └── package.json
│
├── .github/workflows/         # GitHub Actions CI/CD
├── docker-compose.yml         # 로컬 DB 설정
└── package.json              # 루트 패키지 설정
```

---

## 🚀 실행 방법

<details>
<summary><b>개발 환경 설정 (클릭하여 펼치기)</b></summary>

### 사전 요구사항

- Node.js 22.x
- Docker Desktop (로컬 DB용)

### 설치 및 실행

```bash
# 1. 의존성 설치
npm install
```

### 2. 환경 변수 설정

`server/.env` 파일 생성:

```env
# 서버 포트
PORT=3000

# PostgreSQL 연결 (로컬 개발용)
DATABASE_URL="postgresql://root:1234@localhost:5432/Project"
DIRECT_URL="postgresql://root:1234@localhost:5432/Project"

# JWT 설정
JWT_SECRET="your-jwt-secret-key"
JWT_REFRESH_SECRET="your-jwt-refresh-secret-key"

# Kakao Maps API (거리 계산용)
KAKAO_REST_API_KEY="your-kakao-api-key"

# Brevo 이메일 (선택)
BREVO_API_KEY="your-brevo-api-key"

# Sentry 에러 모니터링 (선택)
SENTRY_DSN="your-sentry-dsn"
```

### 3. 데이터베이스 설정

```bash
# PostgreSQL 컨테이너 실행
docker compose up -d

# DB 스키마 반영
cd server
npx prisma generate
npx prisma db push

# 초기 데이터 시딩 (선택)
npx prisma db seed
```

### 4. 개발 서버 실행

```bash
# 터미널 1: 백엔드 서버
cd server
npm run dev

# 터미널 2: 프론트엔드 클라이언트
npm run dev:client
```

- 백엔드: http://localhost:3000
- 프론트엔드: http://localhost:5173

---

## 배포 환경

### CI/CD 파이프라인

GitHub Actions를 통해 자동화된 CI/CD 파이프라인이 구성되어 있습니다.

#### Server CI (`server.yml`)

- 트리거: `main`, `develop` 브랜치 push/PR 시 `server/` 경로 변경
- 단계:
  1. Prisma 클라이언트 생성 및 검증
  2. TypeScript 타입 체크
  3. ESLint 린트 검사
  4. Prettier 포맷 검사
  5. 빌드

#### Client CI (`client.yml`)

- 트리거: `main`, `develop` 브랜치 push/PR 시 `client/` 경로 변경
- 단계:
  1. TypeScript 타입 체크
  2. ESLint 린트 검사
  3. Prettier 포맷 검사
  4. 빌드
  5. 빌드 아티팩트 업로드

#### 추가 워크플로우

- `calculate-distance.yml`: 거리 자동 계산
- `keep-alive.yml`: 서버 상태 유지
- `ping-server.yml`: 서버 헬스체크
- `ping-supabase.yml`: DB 연결 체크

### 프로덕션 환경

```env
# 프로덕션 환경 변수 예시
NODE_ENV=production
PORT=3000
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
```

## 코드 품질

### 린트 및 포맷

```bash
# 전체 포맷 검사
npm run format:check

# 전체 포맷 적용
npm run format

# 서버 린트
cd server && npm run lint

# 클라이언트 린트
cd client && npm run lint
```

---

## 데이터베이스

### Prisma 명령어

```bash
cd server

# 스키마 포맷
npm run prisma:format

# 스키마 검증
npm run prisma:validate

# DB에 스키마 푸시 (개발용)
npm run db:push

# 마이그레이션 생성
npm run db:migrate:create

# 마이그레이션 실행
npm run db:migrate

# Prisma Studio (DB GUI)
npm run db:studio
```

### 주요 모델

- `User`: 사용자 (관리자, 강사)
- `Team`: 팀 (강사 소속)
- `Unit`: 부대
- `TrainingPeriod`: 교육기간
- `TrainingLocation`: 교육장소
- `UnitSchedule`: 교육 일정
- `InstructorUnitAssignment`: 강사 배정
- `InstructorUnitDistance`: 강사-부대 거리
