import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from "@nestjs/common";
import type { z } from "zod";
import { kycReviewSchema, kycSubmitSchema } from "@infiwallet/validation";
import type { Request } from "express";
import { InternalKeyGuard } from "../auth/internal-key.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { JwtPayload } from "../auth/jwt.strategy";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { KycService } from "./kyc.service";

@Controller("kyc")
export class KycController {
  constructor(private readonly kyc: KycService) {}

  @Get("internal/:userId/tier")
  @UseGuards(InternalKeyGuard)
  internalTier(@Param("userId") userId: string) {
    return this.kyc.getInternalTier(userId);
  }

  @Get("limits/:tier")
  getLimits(@Param("tier") tier: string) {
    return this.kyc.getLimitsByTier(parseInt(tier, 10));
  }

  @Get("admin/queue")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN")
  queue(@Req() req: Request & { user: JwtPayload }) {
    return this.kyc.listPending(req.user);
  }

  @Get(":userId")
  @UseGuards(JwtAuthGuard)
  list(@Req() req: Request & { user: JwtPayload }, @Param("userId") userId: string) {
    return this.kyc.getForUser(req.user, userId);
  }

  @Post(":userId/submit")
  @UseGuards(JwtAuthGuard)
  submit(
    @Req() req: Request & { user: JwtPayload },
    @Param("userId") userId: string,
    @Body(new ZodValidationPipe(kycSubmitSchema)) body: z.infer<typeof kycSubmitSchema>,
  ) {
    return this.kyc.submit(req.user, userId, body);
  }

  @Put(":id/review")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN")
  review(
    @Req() req: Request & { user: JwtPayload },
    @Param("id") id: string,
    @Body(new ZodValidationPipe(kycReviewSchema)) body: unknown,
  ) {
    return this.kyc.review(req.user, id, body as { status: "approved" | "rejected"; notes?: string });
  }
}
