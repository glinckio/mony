-- DropForeignKey
ALTER TABLE "VehicleMaintenance" DROP CONSTRAINT "VehicleMaintenance_maintenanceTypeId_fkey";

-- AddForeignKey
ALTER TABLE "VehicleMaintenance" ADD CONSTRAINT "VehicleMaintenance_maintenanceTypeId_fkey" FOREIGN KEY ("maintenanceTypeId") REFERENCES "MaintenanceType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
