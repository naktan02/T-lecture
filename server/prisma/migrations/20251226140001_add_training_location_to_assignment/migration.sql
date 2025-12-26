-- AlterTable
ALTER TABLE "강사_부대_배정" ADD COLUMN     "교육장id" INTEGER;

-- AddForeignKey
ALTER TABLE "강사_부대_배정" ADD CONSTRAINT "강사_부대_배정_교육장id_fkey" FOREIGN KEY ("교육장id") REFERENCES "교육장소"("id") ON DELETE SET NULL ON UPDATE CASCADE;
