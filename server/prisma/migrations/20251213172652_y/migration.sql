-- AlterTable
ALTER TABLE `메시지` ADD COLUMN `제목` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `메시지_템플릿` (
    `템플릿키` VARCHAR(191) NOT NULL,
    `제목` VARCHAR(191) NOT NULL,
    `본문` TEXT NOT NULL,
    `수정일시` DATETIME(3) NOT NULL,

    PRIMARY KEY (`템플릿키`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
