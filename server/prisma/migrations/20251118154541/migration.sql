-- CreateTable
CREATE TABLE `kakao_api_usage` (
    `date` DATE NOT NULL,
    `routeCount` INTEGER NOT NULL DEFAULT 0,
    `geocodeCount` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`date`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `메시지` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `유형` ENUM('Notice', 'Temporary', 'Confirmed') NULL,
    `본문` VARCHAR(191) NULL,
    `상태` ENUM('Pending', 'Sent', 'Canceled') NULL,
    `생성일시` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `메시지 수신자` (
    `메시지id` INTEGER NOT NULL,
    `강사id` INTEGER NOT NULL,
    `read_at` DATETIME(3) NULL,

    INDEX `메시지수신_user_idx`(`강사id`),
    PRIMARY KEY (`강사id`, `메시지id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `메시지_배정` (
    `messageId` INTEGER NOT NULL,
    `unitScheduleId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    PRIMARY KEY (`messageId`, `unitScheduleId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `강사가능일` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `강사id` INTEGER NOT NULL,
    `가능일` DATETIME(3) NULL,

    INDEX `강사가능일_instructor_idx`(`강사id`),
    UNIQUE INDEX `강사가능일_instructor_date_unique`(`강사id`, `가능일`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `강사_부대_배정` (
    `userId` INTEGER NOT NULL,
    `unitScheduleId` INTEGER NOT NULL,
    `배치분류` ENUM('Temporary', 'Confirmed') NULL,
    `배정상태` ENUM('Active', 'Canceled') NOT NULL DEFAULT 'Active',

    UNIQUE INDEX `강사_부대_배정_unitScheduleId_userId_key`(`unitScheduleId`, `userId`),
    PRIMARY KEY (`unitScheduleId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `강사-부대 거리` (
    `userId` INTEGER NOT NULL,
    `부대id` INTEGER NOT NULL,
    `거리` DECIMAL(65, 30) NULL,
    `걸리는시간` INTEGER NULL,

    PRIMARY KEY (`userId`, `부대id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `부대` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `군구분` ENUM('Army', 'Navy') NULL,
    `부대명` VARCHAR(191) NULL,
    `광역` VARCHAR(191) NULL,
    `지역` VARCHAR(191) NULL,
    `부대상세주소` TEXT NULL,
    `위도` DOUBLE NULL,
    `경도` DOUBLE NULL,
    `교육시작일자` DATETIME(3) NULL,
    `교육종료일자` DATETIME(3) NULL,
    `근무시작시간` DATETIME(3) NULL,
    `근무종료시간` DATETIME(3) NULL,
    `점심시작시간` DATETIME(3) NULL,
    `점심종료시간` DATETIME(3) NULL,
    `간부명` VARCHAR(191) NULL,
    `간부 전화번호` VARCHAR(191) NULL,
    `간부 이메일 주소` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `교육장소` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `부대id` INTEGER NOT NULL,
    `기존교육장소` VARCHAR(191) NULL,
    `변경교육장소` VARCHAR(191) NULL,
    `강사휴게실 여부` BOOLEAN NULL,
    `여자화장실 여부` BOOLEAN NULL,
    `수탁급식여부` BOOLEAN NULL,
    `회관숙박여부` BOOLEAN NULL,
    `사전사후 휴대폰 불출 여부` BOOLEAN NULL,
    `계획인원` INTEGER NULL,
    `참여인원` INTEGER NULL,
    `투입강사수` INTEGER NULL,
    `특이사항` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `부대일정` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `부대id` INTEGER NOT NULL,
    `교육일` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NULL,
    `userEmail` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `userphoneNumber` VARCHAR(191) NULL,
    `분류` ENUM('Main', 'Co', 'Assistant', 'Practicum') NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `강사` (
    `user_id` INTEGER NOT NULL,
    `team_id` INTEGER NULL,
    `location` TEXT NULL,
    `강사등급id` INTEGER NULL,
    `기수` SMALLINT NULL,
    `제한지역` TEXT NULL,
    `위도` DOUBLE NULL,
    `경도` DOUBLE NULL,

    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `team` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `team_name` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `강사등급` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `강사등급` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `덕목` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `덕목` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `강사가능덕목` (
    `강사id` INTEGER NOT NULL,
    `덕목id` INTEGER NOT NULL,

    PRIMARY KEY (`강사id`, `덕목id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `instructor_stats` (
    `instructor_id` INTEGER NOT NULL,
    `legacy_practicum_count` INTEGER NOT NULL DEFAULT 0,
    `auto_promotion_enabled` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`instructor_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `메시지 수신자` ADD CONSTRAINT `메시지 수신자_메시지id_fkey` FOREIGN KEY (`메시지id`) REFERENCES `메시지`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `메시지 수신자` ADD CONSTRAINT `메시지 수신자_강사id_fkey` FOREIGN KEY (`강사id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `메시지_배정` ADD CONSTRAINT `메시지_배정_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `메시지`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `메시지_배정` ADD CONSTRAINT `메시지_배정_unitScheduleId_userId_fkey` FOREIGN KEY (`unitScheduleId`, `userId`) REFERENCES `강사_부대_배정`(`unitScheduleId`, `userId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `강사가능일` ADD CONSTRAINT `강사가능일_강사id_fkey` FOREIGN KEY (`강사id`) REFERENCES `강사`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `강사_부대_배정` ADD CONSTRAINT `강사_부대_배정_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `강사_부대_배정` ADD CONSTRAINT `강사_부대_배정_unitScheduleId_fkey` FOREIGN KEY (`unitScheduleId`) REFERENCES `부대일정`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `강사-부대 거리` ADD CONSTRAINT `강사-부대 거리_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `강사`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `강사-부대 거리` ADD CONSTRAINT `강사-부대 거리_부대id_fkey` FOREIGN KEY (`부대id`) REFERENCES `부대`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `교육장소` ADD CONSTRAINT `교육장소_부대id_fkey` FOREIGN KEY (`부대id`) REFERENCES `부대`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `부대일정` ADD CONSTRAINT `부대일정_부대id_fkey` FOREIGN KEY (`부대id`) REFERENCES `부대`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `강사` ADD CONSTRAINT `강사_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `강사` ADD CONSTRAINT `강사_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `team`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `강사` ADD CONSTRAINT `강사_강사등급id_fkey` FOREIGN KEY (`강사등급id`) REFERENCES `강사등급`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `강사가능덕목` ADD CONSTRAINT `강사가능덕목_강사id_fkey` FOREIGN KEY (`강사id`) REFERENCES `강사`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `강사가능덕목` ADD CONSTRAINT `강사가능덕목_덕목id_fkey` FOREIGN KEY (`덕목id`) REFERENCES `덕목`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `instructor_stats` ADD CONSTRAINT `instructor_stats_instructor_id_fkey` FOREIGN KEY (`instructor_id`) REFERENCES `강사`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
