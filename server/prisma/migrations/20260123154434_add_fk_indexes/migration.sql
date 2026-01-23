-- DropIndex
DROP INDEX "부대_강의년도_idx";

-- AlterTable
ALTER TABLE "부대" ADD COLUMN     "검증메시지" TEXT,
ADD COLUMN     "검증상태" TEXT NOT NULL DEFAULT 'Valid';

-- CreateIndex
CREATE INDEX "강사_teamId_idx" ON "강사"("team_id");

-- CreateIndex
CREATE INDEX "배정_trainingLocationId_idx" ON "강사_부대_배정"("교육장id");

-- CreateIndex
CREATE INDEX "강사가능일_date_idx" ON "강사가능일"("가능일");

-- CreateIndex
CREATE INDEX "교육기간_unitId_idx" ON "교육기간"("부대id");

-- CreateIndex
CREATE INDEX "교육장소_trainingPeriodId_idx" ON "교육장소"("교육기간id");

-- CreateIndex
CREATE INDEX "부대일정_date_idx" ON "부대일정"("교육일");

-- CreateIndex
CREATE INDEX "부대일정_trainingPeriodId_idx" ON "부대일정"("교육기간id");
