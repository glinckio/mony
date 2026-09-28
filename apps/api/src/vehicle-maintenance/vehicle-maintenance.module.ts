import { Module } from "@nestjs/common";

import { StorageModule } from "../common/storage/storage.module";

import { MaintenanceTypesController } from "./maintenance-types.controller";
import { MaintenanceTypesService } from "./maintenance-types.service";
import { VehicleMaintenanceController } from "./vehicle-maintenance.controller";
import { VehicleMaintenanceService } from "./vehicle-maintenance.service";

@Module({
  imports: [StorageModule],
  controllers: [MaintenanceTypesController, VehicleMaintenanceController],
  providers: [MaintenanceTypesService, VehicleMaintenanceService],
})
export class VehicleMaintenanceModule {}
