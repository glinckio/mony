-- DropIndex
DROP INDEX "DebtInstallment_debtId_status_idx";

-- CreateIndex
CREATE INDEX "DebtInstallment_debtId_status_dueDate_idx" ON "DebtInstallment"("debtId", "status", "dueDate");
