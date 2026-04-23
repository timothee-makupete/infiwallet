import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { RolesGuard } from "../auth/roles.guard";
import { WalletProvisionService } from "../wallet/wallet-provision.service";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [UsersService, WalletProvisionService, RolesGuard],
  exports: [UsersService],
})
export class UsersModule {}
