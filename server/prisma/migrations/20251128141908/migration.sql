/*
  Warnings:

  - You are about to alter the column `level` on the `admins` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Enum(EnumId(6))`.
  - You are about to drop the column `role` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `admins` MODIFY `level` ENUM('GENERAL', 'SUPER') NOT NULL DEFAULT 'GENERAL';

-- AlterTable
ALTER TABLE `user` DROP COLUMN `role`;

-- AlterTable
ALTER TABLE `강사` ADD COLUMN `팀장여부` BOOLEAN NOT NULL DEFAULT false;
