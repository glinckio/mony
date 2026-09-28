-- CreateEnum
CREATE TYPE "MaintenanceSystem" AS ENUM ('ENGINE', 'BRAKES', 'SUSPENSION', 'TRANSMISSION', 'ELECTRICAL', 'COOLING', 'FUEL', 'LUBRICATION', 'STEERING', 'WHEELS_TIRES', 'CLIMATE', 'BODY', 'OTHER');

-- CreateTable
CREATE TABLE "MaintenanceType" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "system" "MaintenanceSystem",
    "kmInterval" INTEGER NOT NULL,
    "monthsInterval" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceAlert" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "maintenanceTypeId" TEXT NOT NULL,
    "mileageAlert" INTEGER NOT NULL,

    CONSTRAINT "MaintenanceAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleMaintenance" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "maintenanceTypeId" TEXT NOT NULL,
    "mileage" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "cost" DECIMAL(12,2),
    "location" VARCHAR(100),
    "notes" VARCHAR(500),
    "receiptKey" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleMaintenance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaintenanceType_userId_system_name_idx" ON "MaintenanceType"("userId", "system", "name");

-- CreateIndex
CREATE INDEX "MaintenanceAlert_maintenanceTypeId_idx" ON "MaintenanceAlert"("maintenanceTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceAlert_vehicleId_maintenanceTypeId_key" ON "MaintenanceAlert"("vehicleId", "maintenanceTypeId");

-- CreateIndex
CREATE INDEX "VehicleMaintenance_vehicleId_date_idx" ON "VehicleMaintenance"("vehicleId", "date");

-- CreateIndex
CREATE INDEX "VehicleMaintenance_vehicleId_maintenanceTypeId_mileage_idx" ON "VehicleMaintenance"("vehicleId", "maintenanceTypeId", "mileage");

-- CreateIndex
CREATE INDEX "VehicleMaintenance_maintenanceTypeId_idx" ON "VehicleMaintenance"("maintenanceTypeId");

-- AddForeignKey
ALTER TABLE "MaintenanceType" ADD CONSTRAINT "MaintenanceType_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceAlert" ADD CONSTRAINT "MaintenanceAlert_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceAlert" ADD CONSTRAINT "MaintenanceAlert_maintenanceTypeId_fkey" FOREIGN KEY ("maintenanceTypeId") REFERENCES "MaintenanceType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleMaintenance" ADD CONSTRAINT "VehicleMaintenance_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleMaintenance" ADD CONSTRAINT "VehicleMaintenance_maintenanceTypeId_fkey" FOREIGN KEY ("maintenanceTypeId") REFERENCES "MaintenanceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
