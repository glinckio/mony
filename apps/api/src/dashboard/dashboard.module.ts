import { Module } from "@nestjs/common";

import { GoalsModule } from "../goals/goals.module";
import { TransactionsModule } from "../transactions/transactions.module";

import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
  imports: [TransactionsModule, GoalsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
