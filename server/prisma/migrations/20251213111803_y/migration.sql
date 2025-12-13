/*
  Warnings:

  - Made the column `가능일` on table `강사가능일` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `강사가능일` MODIFY `가능일` DATE NOT NULL;
