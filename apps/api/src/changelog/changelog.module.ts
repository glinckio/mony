import { Module } from "@nestjs/common";

import { AdminGuard } from "../auth/guards/admin.guard";

import { AdminChangelogController, ChangelogController } from "./changelog.controller";
import { ChangelogService } from "./changelog.service";

@Module({
  controllers: [ChangelogController, AdminChangelogController],
  providers: [ChangelogService, AdminGuard],
})
export class ChangelogModule {}
