import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { EventsModule } from "../events/events.module";
import { KycModule } from "../kyc/kyc.module";
import { RolesGuard } from "../auth/roles.guard";
import { UserCreatedConsumer } from "../events/user-created.consumer";
import { InternalWalletsController } from "./internal-wallets.controller";
import { WalletsController } from "./wallets.controller";
import { WalletsService } from "./wallets.service";

@Module({
  imports: [AuthModule, EventsModule, KycModule],
  controllers: [WalletsController, InternalWalletsController],
  providers: [WalletsService, UserCreatedConsumer, RolesGuard],
})
export class WalletsModule {}
