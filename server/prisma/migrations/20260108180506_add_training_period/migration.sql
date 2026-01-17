/*
  Warnings:

  - You are about to drop the column `수락건수` on the `instructor_stats` table. All the data in the column will be lost.
  - You are about to drop the column `총근무시간` on the `instructor_stats` table. All the data in the column will be lost.
  - You are about to drop the column `총근무일수` on the `instructor_stats` table. All the data in the column will be lost.
  - You are about to drop the column `총이동거리` on the `instructor_stats` table. All the data in the column will be lost.
  - You are about to drop the column `총제안건수` on the `instructor_stats` table. All the data in the column will be lost.
  - You are about to drop the column `최근집계일시` on the `instructor_stats` table. All the data in the column will be lost.
  - You are about to drop the column `계획인원` on the `교육장소` table. All the data in the column will be lost.
  - You are about to drop the column `부대id` on the `교육장소` table. All the data in the column will be lost.
  - You are about to drop the column `사전사후 휴대폰 불출 여부` on the `교육장소` table. All the data in the column will be lost.
  - You are about to drop the column `수탁급식여부` on the `교육장소` table. All the data in the column will be lost.
  - You are about to drop the column `참여인원` on the `교육장소` table. All the data in the column will be lost.
  - You are about to drop the column `회관숙박여부` on the `교육장소` table. All the data in the column will be lost.
  - You are about to drop the column `간부 이메일 주소` on the `부대` table. All the data in the column will be lost.
  - You are about to drop the column `간부 전화번호` on the `부대` table. All the data in the column will be lost.
  - You are about to drop the column `간부명` on the `부대` table. All the data in the column will be lost.
  - You are about to drop the column `교육불가일자` on the `부대` table. All the data in the column will be lost.
  - You are about to drop the column `교육시작일자` on the `부대` table. All the data in the column will be lost.
  - You are about to drop the column `교육종료일자` on the `부대` table. All the data in the column will be lost.
  - You are about to drop the column `근무시작시간` on the `부대` table. All the data in the column will be lost.
  - You are about to drop the column `근무종료시간` on the `부대` table. All the data in the column will be lost.
  - You are about to drop the column `인원고정` on the `부대` table. All the data in the column will be lost.
  - You are about to drop the column `점심시작시간` on the `부대` table. All the data in the column will be lost.
  - You are about to drop the column `점심종료시간` on the `부대` table. All the data in the column will be lost.
  - You are about to drop the column `부대id` on the `부대일정` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[부대명]` on the table `부대` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `교육기간id` to the `교육장소` table without a default value. This is not possible if the table is not empty.
  - Added the required column `강의년도` to the `부대` table without a default value. This is not possible if the table is not empty.
  - Made the column `부대명` on table `부대` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `교육기간id` to the `부대일정` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "교육장소" DROP CONSTRAINT "교육장소_부대id_fkey";

-- DropForeignKey
ALTER TABLE "부대일정" DROP CONSTRAINT "부대일정_부대id_fkey";

-- AlterTable
ALTER TABLE "instructor_stats" DROP COLUMN "수락건수",
DROP COLUMN "총근무시간",
DROP COLUMN "총근무일수",
DROP COLUMN "총이동거리",
DROP COLUMN "총제안건수",
DROP COLUMN "최근집계일시";

-- AlterTable
ALTER TABLE "교육장소" DROP COLUMN "계획인원",
DROP COLUMN "부대id",
DROP COLUMN "사전사후 휴대폰 불출 여부",
DROP COLUMN "수탁급식여부",
DROP COLUMN "참여인원",
DROP COLUMN "회관숙박여부",
ADD COLUMN     "교육기간id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "부대" DROP COLUMN "간부 이메일 주소",
DROP COLUMN "간부 전화번호",
DROP COLUMN "간부명",
DROP COLUMN "교육불가일자",
DROP COLUMN "교육시작일자",
DROP COLUMN "교육종료일자",
DROP COLUMN "근무시작시간",
DROP COLUMN "근무종료시간",
DROP COLUMN "인원고정",
DROP COLUMN "점심시작시간",
DROP COLUMN "점심종료시간",
ADD COLUMN     "강의년도" INTEGER NOT NULL,
ALTER COLUMN "부대명" SET NOT NULL;

-- AlterTable
ALTER TABLE "부대일정" DROP COLUMN "부대id",
ADD COLUMN     "교육기간id" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "교육기간" (
    "id" SERIAL NOT NULL,
    "부대id" INTEGER NOT NULL,
    "교육기간명" TEXT NOT NULL,
    "근무시작시간" TIMESTAMP(3),
    "근무종료시간" TIMESTAMP(3),
    "점심시작시간" TIMESTAMP(3),
    "점심종료시간" TIMESTAMP(3),
    "간부명" TEXT,
    "간부 전화번호" TEXT,
    "간부 이메일 주소" TEXT,
    "인원고정" BOOLEAN NOT NULL DEFAULT false,
    "교육불가일자" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "수탁급식여부" BOOLEAN,
    "회관숙박여부" BOOLEAN,
    "사전사후 휴대폰 불출 여부" BOOLEAN,

    CONSTRAINT "교육기간_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "일정_장소" (
    "id" SERIAL NOT NULL,
    "일정id" INTEGER NOT NULL,
    "장소id" INTEGER NOT NULL,
    "계획인원" INTEGER,
    "참여인원" INTEGER,
    "필요인원" INTEGER,

    CONSTRAINT "일정_장소_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "일정_장소_일정id_장소id_key" ON "일정_장소"("일정id", "장소id");

-- CreateIndex
CREATE UNIQUE INDEX "부대_부대명_key" ON "부대"("부대명");

-- CreateIndex
CREATE INDEX "부대_강의년도_idx" ON "부대"("강의년도");

-- AddForeignKey
ALTER TABLE "교육기간" ADD CONSTRAINT "교육기간_부대id_fkey" FOREIGN KEY ("부대id") REFERENCES "부대"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "교육장소" ADD CONSTRAINT "교육장소_교육기간id_fkey" FOREIGN KEY ("교육기간id") REFERENCES "교육기간"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "부대일정" ADD CONSTRAINT "부대일정_교육기간id_fkey" FOREIGN KEY ("교육기간id") REFERENCES "교육기간"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "일정_장소" ADD CONSTRAINT "일정_장소_일정id_fkey" FOREIGN KEY ("일정id") REFERENCES "부대일정"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "일정_장소" ADD CONSTRAINT "일정_장소_장소id_fkey" FOREIGN KEY ("장소id") REFERENCES "교육장소"("id") ON DELETE CASCADE ON UPDATE CASCADE;
