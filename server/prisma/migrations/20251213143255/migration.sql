/*
  Warnings:

  - You are about to alter the column `배정상태` on the `강사_부대_배정` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(4))` to `Enum(EnumId(3))`.

*/
-- AlterTable
ALTER TABLE `강사_부대_배정` MODIFY `배정상태` ENUM('Pending', 'Accepted', 'Rejected', 'Canceled') NOT NULL DEFAULT 'Pending';
