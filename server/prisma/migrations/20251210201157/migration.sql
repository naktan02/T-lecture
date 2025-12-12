/*
  Warnings:

  - A unique constraint covering the columns `[user_id,deviceId]` on the table `refresh_tokens` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `refresh_tokens` ADD COLUMN `deviceId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `refresh_tokens_user_id_deviceId_key` ON `refresh_tokens`(`user_id`, `deviceId`);
