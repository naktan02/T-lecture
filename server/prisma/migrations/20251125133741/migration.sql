/*
  Warnings:

  - You are about to drop the column `userEmail` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `분류` on the `user` table. All the data in the column will be lost.
  - The values [REJECTED] on the enum `user_status` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `강사등급id` on the `강사` table. All the data in the column will be lost.
  - You are about to drop the `강사등급` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[user_email]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `강사` DROP FOREIGN KEY `강사_강사등급id_fkey`;

-- DropForeignKey
ALTER TABLE `강사-부대 거리` DROP FOREIGN KEY `강사-부대 거리_userId_fkey`;

-- DropForeignKey
ALTER TABLE `강사-부대 거리` DROP FOREIGN KEY `강사-부대 거리_부대id_fkey`;

-- DropForeignKey
ALTER TABLE `교육장소` DROP FOREIGN KEY `교육장소_부대id_fkey`;

-- DropForeignKey
ALTER TABLE `부대일정` DROP FOREIGN KEY `부대일정_부대id_fkey`;

-- DropIndex
DROP INDEX `user_userEmail_key` ON `user`;

-- DropIndex
DROP INDEX `강사_강사등급id_fkey` ON `강사`;

-- DropIndex
DROP INDEX `강사-부대 거리_부대id_fkey` ON `강사-부대 거리`;

-- DropIndex
DROP INDEX `교육장소_부대id_fkey` ON `교육장소`;

-- DropIndex
DROP INDEX `부대일정_부대id_fkey` ON `부대일정`;

-- AlterTable
ALTER TABLE `user` DROP COLUMN `userEmail`,
    DROP COLUMN `분류`,
    ADD COLUMN `user_email` VARCHAR(191) NULL,
    MODIFY `status` ENUM('PENDING', 'APPROVED', 'RESTING', 'INACTIVE') NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `강사` DROP COLUMN `강사등급id`,
    ADD COLUMN `강사프로필완료` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `분류` ENUM('Main', 'Co', 'Assistant', 'Practicum') NULL;

-- DropTable
DROP TABLE `강사등급`;

-- CreateTable
CREATE TABLE `admins` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `level` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `admins_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `user_user_email_key` ON `user`(`user_email`);

-- AddForeignKey
ALTER TABLE `강사-부대 거리` ADD CONSTRAINT `강사-부대 거리_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `강사`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `강사-부대 거리` ADD CONSTRAINT `강사-부대 거리_부대id_fkey` FOREIGN KEY (`부대id`) REFERENCES `부대`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `교육장소` ADD CONSTRAINT `교육장소_부대id_fkey` FOREIGN KEY (`부대id`) REFERENCES `부대`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `부대일정` ADD CONSTRAINT `부대일정_부대id_fkey` FOREIGN KEY (`부대id`) REFERENCES `부대`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admins` ADD CONSTRAINT `admins_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
