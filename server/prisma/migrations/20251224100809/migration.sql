/*
  Warnings:

  - You are about to drop the `부대_교육불가일자` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "부대_교육불가일자" DROP CONSTRAINT "부대_교육불가일자_부대id_fkey";

-- AlterTable
ALTER TABLE "부대일정" ADD COLUMN     "교육불가" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "부대_교육불가일자";
