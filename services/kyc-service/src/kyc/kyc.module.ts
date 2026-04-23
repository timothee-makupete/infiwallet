import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { RolesGuard } from "../auth/roles.guard";
import { EventsModule } from "../events/events.module";
import { KycController } from "./kyc.controller";
import { KycService } from "./kyc.service";

@Module({
  imports: [AuthModule, EventsModule],
  controllers: [KycController],
  providers: [KycService, RolesGuard],
})
export class KycModule {}
