/*
  Warnings:

  - You are about to drop the column `교육불가` on the `부대일정` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "부대일정" DROP COLUMN "교육불가";

-- CreateTable
CREATE TABLE "강사우선배정크레딧" (
    "id" SERIAL NOT NULL,
    "강사id" INTEGER NOT NULL,
    "우선배정크레딧" INTEGER NOT NULL DEFAULT 1,
    "생성일시" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "수정일시" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "강사우선배정크레딧_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "시스템설정" (
    "id" SERIAL NOT NULL,
    "설정키" TEXT NOT NULL,
    "설정값" TEXT NOT NULL,
    "설명" TEXT,

    CONSTRAINT "시스템설정_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "강사우선배정크레딧_강사id_key" ON "강사우선배정크레딧"("강사id");

-- CreateIndex
CREATE UNIQUE INDEX "시스템설정_설정키_key" ON "시스템설정"("설정키");

-- AddForeignKey
ALTER TABLE "강사우선배정크레딧" ADD CONSTRAINT "강사우선배정크레딧_강사id_fkey" FOREIGN KEY ("강사id") REFERENCES "강사"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
