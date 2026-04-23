import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { depositSchema, withdrawalSchema } from "@infiwallet/validation";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { JwtPayload } from "../auth/jwt.strategy";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { WalletsService } from "./wallets.service";

@Controller("wallets")
@UseGuards(JwtAuthGuard)
export class WalletsController {
  constructor(private readonly wallets: WalletsService) {}

  @Get("admin/transactions")
  @UseGuards(RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN")
  adminTx(@Req() req: Request & { user: JwtPayload }, @Query("take") take?: string) {
    const n = take ? parseInt(take, 10) : 100;
    return this.wallets.listAllTransactions(req.user, Number.isFinite(n) ? n : 100);
  }

  @Get(":userId")
  getWallet(@Req() req: Request & { user: JwtPayload }, @Param("userId") userId: string) {
    return this.wallets.getWallet(req.user, userId);
  }

  @Get(":userId/balance")
  balance(@Req() req: Request & { user: JwtPayload }, @Param("userId") userId: string) {
    return this.wallets.getBalance(req.user, userId);
  }

  @Get(":userId/transactions")
  transactions(
    @Req() req: Request & { user: JwtPayload },
    @Param("userId") userId: string,
    @Query("take") take?: string,
  ) {
    const n = take ? parseInt(take, 10) : 50;
    return this.wallets.listTransactions(req.user, userId, Number.isFinite(n) ? n : 50);
  }

  @Post(":userId/deposits")
  deposit(
    @Req() req: Request & { user: JwtPayload },
    @Param("userId") userId: string,
    @Body(new ZodValidationPipe(depositSchema)) body: unknown,
  ) {
    return this.wallets.deposit(req.user, userId, body as { amount: number; description?: string; reference?: string });
  }

  @Post(":userId/withdrawals")
  withdraw(
    @Req() req: Request & { user: JwtPayload },
    @Param("userId") userId: string,
    @Body(new ZodValidationPipe(withdrawalSchema)) body: unknown,
  ) {
    return this.wallets.withdraw(req.user, userId, body as { amount: number; description?: string; reference?: string });
  }
}
