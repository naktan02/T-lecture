# Project Context for T-LECTURE

## 📋 프로젝트 개요
- **프로젝트명**: T-LECTURE
- **형태**: Monorepo (npm workspace 기반)
- **목표**: react 프론트엔드와 Express/Fastify 백엔드로 구성된 웹 애플리케이션 개발.

## 프로젝트 특정 규약
- API는 RESTful 설계를 따름
- 모든 데이터베이스 작업에는 Prisma ORM 사용
- 프론트엔드 컴포넌트는 반응형 디자인 지원
- 프론트앤드 cloudflare pages 배포 고려
- 서버 render에 배포 고려

## 🛠 기술 스택 (Tech Stack)
| 구분 | 기술 | 비고 |
| :--- | :--- | :--- |
| **Package Manager** | npm | Workspaces 활용 |
| **Frontend** | react | Cloudflare Pages 배포 |
| **Backend** | Node.js (Express or Fastify) | Render 배포 (Docker) |
| **Database** | MySQL | 로컬은 docker-compose, 운영은 Render/외부 DB superbase |
| **ORM** | Prisma | DB 스키마 관리의 단일 진실 공급원(SSOT) |
| **DevOps** | Docker | 로컬 DB 실행 및 백엔드 배포 이미지 빌드 |



## 📂 폴더 구조 및 역할 (Core Structure)
AI는 코드를 제안할 때 반드시 이 폴더 구조를 준수해야 한다.

```plaintext
T-LECTURE/
├── 🐳 docker-compose.yml   # [Dev] 로컬 개발용 MySQL 실행
├── 🖥️ client/              # [Frontend] react
│   ├── public/
│   ├── src/
│   │   ├── pages/          # 페이지 라우트 및 메인 뷰
│   │   ├── features/       # 도메인별 기능 단위 컴포넌트/로직 모음
│   │   ├── components/     # 재사용 가능한 공통 UI 컴포넌트
│   │   ├── router/         # 라우팅 관련 유틸리티 또는 커스텀 로직
│   │   ├── hooks/          # 전역 커스텀 React Hooks
│   │   └── lib/            # 공통 유틸리티 (API 클라이언트 등)
│
├── ⚙️ server/              # [Backend] API Server Application
│   ├── 📁 prisma/          # [ORM] Prisma 설정 및 마이그레이션
│   │   └── schema.prisma   # ✅ DB 스키마의 기준(SSOT)
│   ├── 🐳 Dockerfile       # [Deploy] Render 배포용 이미지 설정
│   └── 📁 src/
│       ├── 📄 server.js    # 앱 엔트리포인트
│       ├── 📁 config/      # 서버 환경 설정 (DB 연결 등)
│       ├── 📁 common/      # 공통 모듈 (미들웨어, 에러 핸들러)
│       └── 📁 modules/     # ✅ 도메인별 모듈 (핵심 비즈니스 로직)
│           ├── 📂 user/
│           │   ├── 📁 schema/       # 입력값 검증 스키마 (Zod/Joi 등) 또는 DB별 보조 정의
│           │   ├── 📁 repositories/ # Prisma를 사용한 DB 접근 계층
│           │   ├── 📁 services/     # 순수 비즈니스 로직 계층
│           │   └── 📁 controllers/  # HTTP 요청/응답 처리 계층
│           └── ... (assignment, auth 등 동일 구조)