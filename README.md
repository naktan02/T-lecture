# T-LECTURE 개발 협업자용 README


## 🛠️ 로컬 개발 환경 설정 (Local Development Setup)

### 1\. 전제 조건

  * **Node.js** (\>=20.0.0) 및 **npm** 설치
  * **Docker Desktop** 설치 및 실행 (로컬 DB 구동을 위해 필수)

### 2\. 의존성 패키지 설치

프로젝트 루트 디렉토리 (`T-lecture/`)에서 서버와 클라이언트의 모든 의존성 패키지를 설치합니다.

```bash
# T-lecture/ 폴더에서 실행
npm install
```

### 3\. 데이터베이스 설정 및 실행

#### A. `.env` 파일 생성

`T-lecture/server` 폴더 안에 **`.env`** 파일을 생성하고, 아래 내용을 복사하여 붙여넣습니다.

**파일: `T-lecture/server/.env`**

```env
# API Server 포트 설정 (기본값 3000)
PORT=3000

# 로컬 개발용 MySQL 연결 URL (3306 포트 사용)
# docker-compose.yml 파일의 환경 변수를 따름
DATABASE_URL="mysql://root:1234@localhost:3306/Project"
```

#### B. MySQL 컨테이너 실행

Docker Compose를 사용하여 로컬 MySQL 데이터베이스 컨테이너를 실행합니다.

```bash
# T-lecture/ 폴더에서 실행 (최상위)
docker compose up -d mysql
```

#### C. DB 스키마 반영

Prisma ORM을 사용하여 정의된 스키마(`schema.prisma`)를 실행 중인 MySQL에 반영합니다.

```bash
# T-lecture/server 폴더로 이동
cd server
# DB 스키마 반영 및 Prisma Client 재생성
npm run db:migrate # 후에 엔터

# 만약 db 초기화 할 일이 생길경우
npx prisma migrate reset # yes 나오면 y

npx prisma generate

# 스키마 바로 적용
npx prisma db push
```

```bash
npx tsx prisma/seed.ts
npx tsx prisma/seedunit.js
npx prisma db seed
```


## ▶️ 프로젝트 실행 (Running the Project)

### 1\. 백엔드 서버 실행 (API Server)

`T-lecture/server` 폴더에서 서버를 개발 모드로 실행합니다.

```bash
# T-lecture/server 폴더에서 실행
npm run dev
```

서버가 시작되면 콘솔에 `Server listening at http://localhost:3000` 메시지가 출력됩니다.

### 2\. 프론트엔드 클라이언트 실행

프로젝트 루트 폴더 (`T-lecture/`)로 돌아가 클라이언트를 실행합니다.

```bash
# T-lecture/ 폴더로 이동 (cd ..)
npm run dev:client
```
```bash
instructor1@test.com
1234
```

