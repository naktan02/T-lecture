-- DropIndex
DROP INDEX "강사가능일_instructor_idx";

-- AlterTable
ALTER TABLE "교육기간" ADD COLUMN     "최초그룹수" INTEGER,
ADD COLUMN     "최초기간" INTEGER;

-- CreateIndex
CREATE INDEX "배정_userId_idx" ON "강사_부대_배정"("userId");

-- CreateIndex
CREATE INDEX "공지_createdAt_idx" ON "공지사항"("생성일시");

-- CreateIndex
CREATE INDEX "문의_authorId_status_idx" ON "문의사항"("작성자id", "상태");

-- CreateIndex
CREATE INDEX "부대_lectureYear_idx" ON "부대"("강의년도");
