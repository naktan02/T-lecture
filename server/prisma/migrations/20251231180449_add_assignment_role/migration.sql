-- CreateEnum
CREATE TYPE "배정역할__t" AS ENUM ('Head', 'Supervisor');

-- AlterTable
ALTER TABLE "강사_부대_배정" ADD COLUMN     "배정역할" "배정역할__t";
