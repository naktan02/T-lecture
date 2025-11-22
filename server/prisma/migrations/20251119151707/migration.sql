/*
  Warnings:

  - The primary key for the `kakao_api_usage` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[date]` on the table `kakao_api_usage` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `id` to the `kakao_api_usage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `kakao_api_usage` DROP PRIMARY KEY,
    ADD COLUMN `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- CreateIndex
CREATE UNIQUE INDEX `kakao_api_usage_date_key` ON `kakao_api_usage`(`date`);
