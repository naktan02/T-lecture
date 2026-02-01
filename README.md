# T-LECTURE

군 부대 교육 강사 배정 및 일정 관리 시스템

## 시스템 개요

T-LECTURE는 군 부대의 교육 일정과 강사 배정을 효율적으로 관리하기 위한 웹 기반 시스템입니다. 관리자는 부대별 교육 일정을 관리하고, 강사에게 교육을 배정하며, 강사는 배정된 교육을 확인하고 수락/거절할 수 있습니다.

### 주요 사용자

- **관리자 (Admin)**: 부대 관리, 교육 일정 관리, 강사 배정, 대시보드 통계 확인
- **강사 (Instructor)**: 배정된 교육 확인 및 응답, 개인 대시보드 확인, 일정 관리

---

## 기술 스택

### Backend
| 기술 | 버전 | 설명 |
|------|------|------|
| Node.js | 22.x | 런타임 환경 |
| Express | 4.x | 웹 프레임워크 |
| TypeScript | 5.x | 타입 안정성 |
| Prisma | 7.x | ORM |
| PostgreSQL | 15 | 데이터베이스 |
| JWT | - | 인증 |
| Sentry | - | 에러 모니터링 |

### Frontend
| 기술 | 버전 | 설명 |
|------|------|------|
| React | 19.x | UI 라이브러리 |
| Vite | 7.x | 빌드 도구 |
| TypeScript | 5.x | 타입 안정성 |
| TailwindCSS | 4.x | 스타일링 |
| TanStack Query | 5.x | 서버 상태 관리 |
| React Router | 7.x | 라우팅 |
| React Hook Form | 7.x | 폼 관리 |
| Recharts | 3.x | 차트 시각화 |

### Infrastructure
| 기술 | 설명 |
|------|------|
| Docker Compose | 로컬 개발 환경 DB |
| GitHub Actions | CI/CD 파이프라인 |
| Upstash Redis | 캐싱 (선택) |

---

## 주요 기능

### 1. 부대 관리 (Unit Management)
- 부대 정보 등록 및 수정 (부대명, 군 구분, 지역, 좌표 등)
- 교육기간 설정 (정규교육, 추가교육 등)
- 교육장소 관리 (장소별 시설 정보)
- 일정별 계획인원/참여인원 관리

### 2. 강사 배정 (Assignment)
- 교육 일정에 강사 자동/수동 배정
- 배정 제안 발송 및 응답 관리
- 강사별 거리 기반 최적 배정
- 배정 상태 추적 (Pending, Accepted, Rejected, Canceled)

### 3. 대시보드 (Dashboard)
- **관리자 대시보드**
  - 전체 교육 현황 통계
  - 강사별/팀별 성과 분석
  - 상태별 일정 현황 (완료, 진행중, 예정, 미배정)
- **강사 대시보드**
  - 총 근무 시간/이동 거리
  - 배정 수락률
  - 월별 활동 추이
  - 활동 내역

### 4. 일정 관리 (Schedule)
- 캘린더 기반 일정 조회
- 일정 상세 정보 확인
- 교육 진행 상태 관리

### 5. 거리 계산 (Distance)
- Kakao Maps API를 활용한 강사-부대 간 거리 계산
- 거리 정보 캐싱 및 관리
- GitHub Actions를 통한 자동 거리 계산

### 6. 알림 및 커뮤니케이션
- 공지사항 관리
- 문의하기 기능
- 이메일 알림 (Brevo)

### 7. 데이터 관리
- Excel 파일 가져오기/내보내기
- 년도별 데이터 백업
- 리포트 생성

---

## 프로젝트 구조

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

## 개발 환경 설정

### 필수 요구사항
- **Node.js** 22.x 이상
- **npm** (Node.js와 함께 설치)
- **Docker Desktop** (로컬 DB 실행용)

### 1. 의존성 설치

```bash
# 프로젝트 루트에서 실행 (서버/클라이언트 동시 설치)
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

---

## 테스트

### 통합 테스트

```bash
cd server

# 전체 테스트
npm test

# 개별 모듈 테스트
npm run test:auth
npm run test:assignments
npm run test:units
npm run test:instructor
npm run test:distance
```

### 부하 테스트

```bash
cd server

# Artillery
npm run load:quick
npm run load:test
npm run load:stress

# k6
npm run k6:quick
npm run k6:full
npm run k6:role
npm run k6:stress
```

---

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

### 커밋 컨벤션

```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅
refactor: 코드 리팩토링
test: 테스트 코드
chore: 빌드 설정 등 기타 변경
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

---

## 라이선스

Private - All rights reserved

---

## 기여

이 프로젝트에 기여하려면:

1. 이슈를 생성하여 변경 사항을 논의합니다
2. `develop` 브랜치에서 새 브랜치를 생성합니다
3. 변경 사항을 커밋합니다
4. Pull Request를 생성합니다
5. 코드 리뷰 후 머지됩니다

---

## 문의

프로젝트 관련 문의사항은 GitHub Issues를 통해 등록해 주세요.
