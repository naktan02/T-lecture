-- DropForeignKey
ALTER TABLE "강사가능덕목" DROP CONSTRAINT "강사가능덕목_덕목id_fkey";

-- AlterTable
ALTER TABLE "team" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "강사가능덕목" ADD CONSTRAINT "강사가능덕목_덕목id_fkey" FOREIGN KEY ("덕목id") REFERENCES "덕목"("id") ON DELETE CASCADE ON UPDATE CASCADE;
