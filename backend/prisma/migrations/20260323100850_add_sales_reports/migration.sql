-- CreateEnum
CREATE TYPE "SalesReportStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- CreateTable
CREATE TABLE "SalesReport" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "laboratoryId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "SalesReportStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesReportLine" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "itemNumber" INTEGER NOT NULL,
    "designation" TEXT NOT NULL,
    "pght" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "copharmedStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "copharmedVente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "copharmedS" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "copharmedV" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "laborexStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "laborexVente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "laborexS" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "laborexV" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tedisStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tedisVente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tedisS" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tedisV" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dpciStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dpciVente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dpciS" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dpciV" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "SalesReportLine_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SalesReport" ADD CONSTRAINT "SalesReport_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReport" ADD CONSTRAINT "SalesReport_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "Laboratory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReportLine" ADD CONSTRAINT "SalesReportLine_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "SalesReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
