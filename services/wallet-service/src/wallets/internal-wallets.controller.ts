import { Controller, Param, Post, UseGuards } from "@nestjs/common";
import { InternalKeyGuard } from "../auth/internal-key.guard";
import { WalletsService } from "./wallets.service";

@Controller("wallets")
export class InternalWalletsController {
  constructor(private readonly wallets: WalletsService) {}

  @Post("internal/provision/:userId")
  @UseGuards(InternalKeyGuard)
  provision(@Param("userId") userId: string) {
    return this.wallets.ensureWalletForUser(userId);
  }
}
