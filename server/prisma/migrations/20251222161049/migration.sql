-- CreateEnum
CREATE TYPE "유형__t" AS ENUM ('Notice', 'Temporary', 'Confirmed');

-- CreateEnum
CREATE TYPE "상태__t" AS ENUM ('Pending', 'Sent', 'Canceled');

-- CreateEnum
CREATE TYPE "배치분류__t" AS ENUM ('Temporary', 'Confirmed');

-- CreateEnum
CREATE TYPE "배정상태__t" AS ENUM ('Pending', 'Accepted', 'Rejected', 'Canceled');

-- CreateEnum
CREATE TYPE "군구분__t" AS ENUM ('Army', 'Navy');

-- CreateEnum
CREATE TYPE "분류__t" AS ENUM ('Main', 'Co', 'Assistant', 'Practicum');

-- CreateEnum
CREATE TYPE "AdminLevel" AS ENUM ('GENERAL', 'SUPER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'APPROVED', 'RESTING', 'INACTIVE');

-- CreateTable
CREATE TABLE "email_verifications" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" SERIAL NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "user_id" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceId" TEXT,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kakao_api_usage" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "routeCount" INTEGER NOT NULL DEFAULT 0,
    "geocodeCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "kakao_api_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "메시지" (
    "id" SERIAL NOT NULL,
    "유형" "유형__t",
    "제목" TEXT,
    "본문" TEXT,
    "상태" "상태__t",
    "생성일시" TIMESTAMP(3),

    CONSTRAINT "메시지_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "메시지 수신자" (
    "메시지id" INTEGER NOT NULL,
    "강사id" INTEGER NOT NULL,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "메시지 수신자_pkey" PRIMARY KEY ("강사id","메시지id")
);

-- CreateTable
CREATE TABLE "메시지_배정" (
    "messageId" INTEGER NOT NULL,
    "unitScheduleId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "메시지_배정_pkey" PRIMARY KEY ("messageId","unitScheduleId","userId")
);

-- CreateTable
CREATE TABLE "메시지_템플릿" (
    "템플릿키" TEXT NOT NULL,
    "제목" TEXT NOT NULL,
    "본문" TEXT NOT NULL,
    "수정일시" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "메시지_템플릿_pkey" PRIMARY KEY ("템플릿키")
);

-- CreateTable
CREATE TABLE "강사가능일" (
    "id" SERIAL NOT NULL,
    "강사id" INTEGER NOT NULL,
    "가능일" DATE NOT NULL,

    CONSTRAINT "강사가능일_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "강사_부대_배정" (
    "userId" INTEGER NOT NULL,
    "unitScheduleId" INTEGER NOT NULL,
    "배치분류" "배치분류__t",
    "배정상태" "배정상태__t" NOT NULL DEFAULT 'Pending',

    CONSTRAINT "강사_부대_배정_pkey" PRIMARY KEY ("unitScheduleId","userId")
);

-- CreateTable
CREATE TABLE "강사-부대 거리" (
    "userId" INTEGER NOT NULL,
    "부대id" INTEGER NOT NULL,
    "거리" DECIMAL(65,30),
    "걸리는시간" INTEGER,

    CONSTRAINT "강사-부대 거리_pkey" PRIMARY KEY ("userId","부대id")
);

-- CreateTable
CREATE TABLE "부대" (
    "id" SERIAL NOT NULL,
    "군구분" "군구분__t",
    "부대명" TEXT,
    "광역" TEXT,
    "지역" TEXT,
    "부대상세주소" TEXT,
    "위도" DOUBLE PRECISION,
    "경도" DOUBLE PRECISION,
    "교육시작일자" TIMESTAMP(3),
    "교육종료일자" TIMESTAMP(3),
    "근무시작시간" TIMESTAMP(3),
    "근무종료시간" TIMESTAMP(3),
    "점심시작시간" TIMESTAMP(3),
    "점심종료시간" TIMESTAMP(3),
    "간부명" TEXT,
    "간부 전화번호" TEXT,
    "간부 이메일 주소" TEXT,

    CONSTRAINT "부대_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "교육장소" (
    "id" SERIAL NOT NULL,
    "부대id" INTEGER NOT NULL,
    "기존교육장소" TEXT,
    "변경교육장소" TEXT,
    "강사휴게실 여부" BOOLEAN,
    "여자화장실 여부" BOOLEAN,
    "수탁급식여부" BOOLEAN,
    "회관숙박여부" BOOLEAN,
    "사전사후 휴대폰 불출 여부" BOOLEAN,
    "계획인원" INTEGER,
    "참여인원" INTEGER,
    "투입강사수" INTEGER,
    "특이사항" TEXT,

    CONSTRAINT "교육장소_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "부대일정" (
    "id" SERIAL NOT NULL,
    "부대id" INTEGER NOT NULL,
    "교육일" TIMESTAMP(3),

    CONSTRAINT "부대일정_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "user_email" TEXT,
    "password" TEXT,
    "name" TEXT,
    "userphoneNumber" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "level" "AdminLevel" NOT NULL DEFAULT 'GENERAL',

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "강사" (
    "user_id" INTEGER NOT NULL,
    "분류" "분류__t",
    "team_id" INTEGER,
    "팀장여부" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "기수" SMALLINT,
    "제한지역" TEXT,
    "위도" DOUBLE PRECISION,
    "경도" DOUBLE PRECISION,
    "강사프로필완료" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "강사_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "team" (
    "id" SERIAL NOT NULL,
    "team_name" TEXT,

    CONSTRAINT "team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "덕목" (
    "id" SERIAL NOT NULL,
    "덕목" TEXT,

    CONSTRAINT "덕목_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "강사가능덕목" (
    "강사id" INTEGER NOT NULL,
    "덕목id" INTEGER NOT NULL,

    CONSTRAINT "강사가능덕목_pkey" PRIMARY KEY ("강사id","덕목id")
);

-- CreateTable
CREATE TABLE "instructor_stats" (
    "instructor_id" INTEGER NOT NULL,
    "legacy_practicum_count" INTEGER NOT NULL DEFAULT 0,
    "auto_promotion_enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "instructor_stats_pkey" PRIMARY KEY ("instructor_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_user_id_deviceId_key" ON "refresh_tokens"("user_id", "deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "kakao_api_usage_date_key" ON "kakao_api_usage"("date");

-- CreateIndex
CREATE INDEX "메시지수신_user_idx" ON "메시지 수신자"("강사id");

-- CreateIndex
CREATE INDEX "강사가능일_instructor_idx" ON "강사가능일"("강사id");

-- CreateIndex
CREATE UNIQUE INDEX "강사가능일_instructor_date_unique" ON "강사가능일"("강사id", "가능일");

-- CreateIndex
CREATE UNIQUE INDEX "강사_부대_배정_unitScheduleId_userId_key" ON "강사_부대_배정"("unitScheduleId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_user_email_key" ON "user"("user_email");

-- CreateIndex
CREATE UNIQUE INDEX "admins_user_id_key" ON "admins"("user_id");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "메시지 수신자" ADD CONSTRAINT "메시지 수신자_메시지id_fkey" FOREIGN KEY ("메시지id") REFERENCES "메시지"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "메시지 수신자" ADD CONSTRAINT "메시지 수신자_강사id_fkey" FOREIGN KEY ("강사id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "메시지_배정" ADD CONSTRAINT "메시지_배정_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "메시지"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "메시지_배정" ADD CONSTRAINT "메시지_배정_unitScheduleId_userId_fkey" FOREIGN KEY ("unitScheduleId", "userId") REFERENCES "강사_부대_배정"("unitScheduleId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "강사가능일" ADD CONSTRAINT "강사가능일_강사id_fkey" FOREIGN KEY ("강사id") REFERENCES "강사"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "강사_부대_배정" ADD CONSTRAINT "강사_부대_배정_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "강사_부대_배정" ADD CONSTRAINT "강사_부대_배정_unitScheduleId_fkey" FOREIGN KEY ("unitScheduleId") REFERENCES "부대일정"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "강사-부대 거리" ADD CONSTRAINT "강사-부대 거리_userId_fkey" FOREIGN KEY ("userId") REFERENCES "강사"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "강사-부대 거리" ADD CONSTRAINT "강사-부대 거리_부대id_fkey" FOREIGN KEY ("부대id") REFERENCES "부대"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "교육장소" ADD CONSTRAINT "교육장소_부대id_fkey" FOREIGN KEY ("부대id") REFERENCES "부대"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "부대일정" ADD CONSTRAINT "부대일정_부대id_fkey" FOREIGN KEY ("부대id") REFERENCES "부대"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "강사" ADD CONSTRAINT "강사_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "강사" ADD CONSTRAINT "강사_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "강사가능덕목" ADD CONSTRAINT "강사가능덕목_강사id_fkey" FOREIGN KEY ("강사id") REFERENCES "강사"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "강사가능덕목" ADD CONSTRAINT "강사가능덕목_덕목id_fkey" FOREIGN KEY ("덕목id") REFERENCES "덕목"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instructor_stats" ADD CONSTRAINT "instructor_stats_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "강사"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
