-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `firstName` VARCHAR(100) NOT NULL,
    `lastName` VARCHAR(100) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'ADMIN', 'DELEGATE') NOT NULL DEFAULT 'DELEGATE',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdById` VARCHAR(30) NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Laboratory` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Laboratory_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdminLaboratory` (
    `userId` VARCHAR(30) NOT NULL,
    `laboratoryId` VARCHAR(30) NOT NULL,

    PRIMARY KEY (`userId`, `laboratoryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Grossiste` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Grossiste_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GrossisteLaboratory` (
    `grossisteId` VARCHAR(30) NOT NULL,
    `laboratoryId` VARCHAR(30) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `updatedById` VARCHAR(30) NULL,

    PRIMARY KEY (`grossisteId`, `laboratoryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GrossisteStock` (
    `id` VARCHAR(191) NOT NULL,
    `grossisteId` VARCHAR(30) NOT NULL,
    `laboratoryId` VARCHAR(30) NOT NULL,
    `productName` VARCHAR(200) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `unitPrice` DOUBLE NOT NULL DEFAULT 0,
    `month` VARCHAR(10) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pharmacy` (
    `id` VARCHAR(191) NOT NULL,
    `grossisteId` VARCHAR(30) NULL,
    `codeClient` VARCHAR(50) NULL,
    `nom` VARCHAR(255) NOT NULL,
    `pharmacien` VARCHAR(255) NULL,
    `adresse` VARCHAR(255) NULL,
    `ville` VARCHAR(150) NULL,
    `region` VARCHAR(150) NULL,
    `province` VARCHAR(150) NULL,
    `telephone` VARCHAR(100) NULL,
    `email` VARCHAR(255) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Pharmacy_ville_idx`(`ville`),
    INDEX `Pharmacy_region_idx`(`region`),
    INDEX `Pharmacy_nom_idx`(`nom`),
    UNIQUE INDEX `Pharmacy_grossisteId_codeClient_key`(`grossisteId`, `codeClient`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Sector` (
    `id` VARCHAR(191) NOT NULL,
    `numero` INTEGER NOT NULL,
    `delegateName` VARCHAR(255) NULL,
    `zoneResidence` VARCHAR(255) NOT NULL,
    `peripherie` LONGTEXT NULL,
    `axesMission` LONGTEXT NULL,
    `type` VARCHAR(20) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Sector_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Delegate` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(30) NOT NULL,
    `laboratoryId` VARCHAR(30) NOT NULL,
    `sectorId` VARCHAR(30) NULL,
    `zone` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(50) NULL,
    `status` ENUM('EN_VISITE', 'EN_DEPLACEMENT', 'EN_PAUSE', 'INACTIF') NOT NULL DEFAULT 'INACTIF',
    `lastLat` DOUBLE NULL,
    `lastLng` DOUBLE NULL,
    `lastSeen` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Delegate_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GPSLog` (
    `id` VARCHAR(191) NOT NULL,
    `delegateId` VARCHAR(30) NOT NULL,
    `latitude` DOUBLE NOT NULL,
    `longitude` DOUBLE NOT NULL,
    `status` ENUM('EN_VISITE', 'EN_DEPLACEMENT', 'EN_PAUSE', 'INACTIF') NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `GPSLog_delegateId_idx`(`delegateId`),
    INDEX `GPSLog_timestamp_idx`(`timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `group` VARCHAR(50) NOT NULL,
    `specialty` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Product_name_key`(`name`),
    INDEX `Product_specialty_idx`(`specialty`),
    INDEX `Product_group_idx`(`group`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WeeklyPlanning` (
    `id` VARCHAR(191) NOT NULL,
    `delegateId` VARCHAR(30) NOT NULL,
    `weekNumber` INTEGER NOT NULL,
    `zone` VARCHAR(100) NOT NULL,
    `lundi` LONGTEXT NULL,
    `mardi` LONGTEXT NULL,
    `mercredi` LONGTEXT NULL,
    `jeudi` LONGTEXT NULL,
    `vendredi` LONGTEXT NULL,
    `month` VARCHAR(10) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `WeeklyPlanning_zone_idx`(`zone`),
    INDEX `WeeklyPlanning_month_idx`(`month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VisitReport` (
    `id` VARCHAR(191) NOT NULL,
    `delegateId` VARCHAR(30) NOT NULL,
    `laboratoryId` VARCHAR(30) NOT NULL,
    `pharmacyId` VARCHAR(30) NULL,
    `doctorName` VARCHAR(255) NOT NULL,
    `specialty` VARCHAR(100) NULL,
    `productsShown` TEXT NULL,
    `notes` LONGTEXT NOT NULL,
    `aiSummary` LONGTEXT NULL,
    `visitDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `VisitReport_delegateId_idx`(`delegateId`),
    INDEX `VisitReport_visitDate_idx`(`visitDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdminLaboratory` ADD CONSTRAINT `AdminLaboratory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdminLaboratory` ADD CONSTRAINT `AdminLaboratory_laboratoryId_fkey` FOREIGN KEY (`laboratoryId`) REFERENCES `Laboratory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GrossisteLaboratory` ADD CONSTRAINT `GrossisteLaboratory_grossisteId_fkey` FOREIGN KEY (`grossisteId`) REFERENCES `Grossiste`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GrossisteLaboratory` ADD CONSTRAINT `GrossisteLaboratory_laboratoryId_fkey` FOREIGN KEY (`laboratoryId`) REFERENCES `Laboratory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GrossisteStock` ADD CONSTRAINT `GrossisteStock_grossisteId_laboratoryId_fkey` FOREIGN KEY (`grossisteId`, `laboratoryId`) REFERENCES `GrossisteLaboratory`(`grossisteId`, `laboratoryId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pharmacy` ADD CONSTRAINT `Pharmacy_grossisteId_fkey` FOREIGN KEY (`grossisteId`) REFERENCES `Grossiste`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Delegate` ADD CONSTRAINT `Delegate_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Delegate` ADD CONSTRAINT `Delegate_laboratoryId_fkey` FOREIGN KEY (`laboratoryId`) REFERENCES `Laboratory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Delegate` ADD CONSTRAINT `Delegate_sectorId_fkey` FOREIGN KEY (`sectorId`) REFERENCES `Sector`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GPSLog` ADD CONSTRAINT `GPSLog_delegateId_fkey` FOREIGN KEY (`delegateId`) REFERENCES `Delegate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WeeklyPlanning` ADD CONSTRAINT `WeeklyPlanning_delegateId_fkey` FOREIGN KEY (`delegateId`) REFERENCES `Delegate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VisitReport` ADD CONSTRAINT `VisitReport_delegateId_fkey` FOREIGN KEY (`delegateId`) REFERENCES `Delegate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VisitReport` ADD CONSTRAINT `VisitReport_laboratoryId_fkey` FOREIGN KEY (`laboratoryId`) REFERENCES `Laboratory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VisitReport` ADD CONSTRAINT `VisitReport_pharmacyId_fkey` FOREIGN KEY (`pharmacyId`) REFERENCES `Pharmacy`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
