import { Module } from "@nestjs/common";

import { StorageModule } from "../common/storage/storage.module";

import { VehiclesController } from "./vehicles.controller";
import { VehiclesService } from "./vehicles.service";

@Module({
  imports: [StorageModule],
  controllers: [VehiclesController],
  providers: [VehiclesService],
})
export class VehiclesModule {}
