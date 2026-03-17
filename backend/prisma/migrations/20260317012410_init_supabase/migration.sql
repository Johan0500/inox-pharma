-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'DELEGATE');

-- CreateEnum
CREATE TYPE "DelegateStatus" AS ENUM ('EN_VISITE', 'EN_DEPLACEMENT', 'EN_PAUSE', 'INACTIF');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'DELEGATE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Laboratory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Laboratory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminLaboratory" (
    "userId" TEXT NOT NULL,
    "laboratoryId" TEXT NOT NULL,

    CONSTRAINT "AdminLaboratory_pkey" PRIMARY KEY ("userId","laboratoryId")
);

-- CreateTable
CREATE TABLE "Grossiste" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Grossiste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrossisteLaboratory" (
    "grossisteId" TEXT NOT NULL,
    "laboratoryId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "GrossisteLaboratory_pkey" PRIMARY KEY ("grossisteId","laboratoryId")
);

-- CreateTable
CREATE TABLE "GrossisteStock" (
    "id" TEXT NOT NULL,
    "grossisteId" TEXT NOT NULL,
    "laboratoryId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "month" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrossisteStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pharmacy" (
    "id" TEXT NOT NULL,
    "grossisteId" TEXT,
    "codeClient" TEXT,
    "nom" TEXT NOT NULL,
    "pharmacien" TEXT,
    "adresse" TEXT,
    "ville" TEXT,
    "region" TEXT,
    "province" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pharmacy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sector" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "delegateName" TEXT,
    "zoneResidence" TEXT NOT NULL,
    "peripherie" TEXT,
    "axesMission" TEXT,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delegate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "laboratoryId" TEXT NOT NULL,
    "sectorId" TEXT,
    "zone" TEXT NOT NULL,
    "phone" TEXT,
    "status" "DelegateStatus" NOT NULL DEFAULT 'INACTIF',
    "lastLat" DOUBLE PRECISION,
    "lastLng" DOUBLE PRECISION,
    "lastSeen" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Delegate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GPSLog" (
    "id" TEXT NOT NULL,
    "delegateId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "status" "DelegateStatus" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GPSLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyPlanning" (
    "id" TEXT NOT NULL,
    "delegateId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "zone" TEXT NOT NULL,
    "lundi" TEXT,
    "mardi" TEXT,
    "mercredi" TEXT,
    "jeudi" TEXT,
    "vendredi" TEXT,
    "month" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyPlanning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitReport" (
    "id" TEXT NOT NULL,
    "delegateId" TEXT NOT NULL,
    "laboratoryId" TEXT NOT NULL,
    "pharmacyId" TEXT,
    "doctorName" TEXT NOT NULL,
    "specialty" TEXT,
    "productsShown" TEXT,
    "notes" TEXT NOT NULL,
    "aiSummary" TEXT,
    "visitDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Laboratory_name_key" ON "Laboratory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Grossiste_name_key" ON "Grossiste"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Pharmacy_grossisteId_codeClient_key" ON "Pharmacy"("grossisteId", "codeClient");

-- CreateIndex
CREATE UNIQUE INDEX "Delegate_userId_key" ON "Delegate"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_name_key" ON "Product"("name");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminLaboratory" ADD CONSTRAINT "AdminLaboratory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminLaboratory" ADD CONSTRAINT "AdminLaboratory_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "Laboratory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrossisteLaboratory" ADD CONSTRAINT "GrossisteLaboratory_grossisteId_fkey" FOREIGN KEY ("grossisteId") REFERENCES "Grossiste"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrossisteLaboratory" ADD CONSTRAINT "GrossisteLaboratory_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "Laboratory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrossisteStock" ADD CONSTRAINT "GrossisteStock_grossisteId_laboratoryId_fkey" FOREIGN KEY ("grossisteId", "laboratoryId") REFERENCES "GrossisteLaboratory"("grossisteId", "laboratoryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pharmacy" ADD CONSTRAINT "Pharmacy_grossisteId_fkey" FOREIGN KEY ("grossisteId") REFERENCES "Grossiste"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delegate" ADD CONSTRAINT "Delegate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delegate" ADD CONSTRAINT "Delegate_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "Laboratory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delegate" ADD CONSTRAINT "Delegate_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GPSLog" ADD CONSTRAINT "GPSLog_delegateId_fkey" FOREIGN KEY ("delegateId") REFERENCES "Delegate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyPlanning" ADD CONSTRAINT "WeeklyPlanning_delegateId_fkey" FOREIGN KEY ("delegateId") REFERENCES "Delegate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitReport" ADD CONSTRAINT "VisitReport_delegateId_fkey" FOREIGN KEY ("delegateId") REFERENCES "Delegate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitReport" ADD CONSTRAINT "VisitReport_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "Laboratory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitReport" ADD CONSTRAINT "VisitReport_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
