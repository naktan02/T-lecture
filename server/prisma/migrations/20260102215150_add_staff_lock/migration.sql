/*
  Warnings:

  - You are about to drop the column `배정막기` on the `부대일정` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "부대" ADD COLUMN     "인원고정" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "부대일정" DROP COLUMN "배정막기";
