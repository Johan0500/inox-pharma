/*
  Warnings:

  - A unique constraint covering the columns `[delegateId,month,year]` on the table `DelegateObjective` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "DelegateObjective_delegateId_month_year_key" ON "DelegateObjective"("delegateId", "month", "year");
