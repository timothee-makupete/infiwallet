import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from "@nestjs/common";
import {
  forgotPasswordSchema,
  loginSchema,
  profileUpdateSchema,
  registerSchema,
  resetPasswordSchema,
  updateUserSchema,
} from "@infiwallet/validation";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { JwtPayload } from "../auth/jwt.strategy";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { UsersService } from "./users.service";
import type { Prisma } from "../../prisma/generated";

@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN")
  listAll() {
    return this.users.listUsers();
  }

  @Post("register")
  register(@Body(new ZodValidationPipe(registerSchema)) body: unknown) {
    return this.users.register(body as Parameters<UsersService["register"]>[0]);
  }

  @Post("login")
  login(@Body(new ZodValidationPipe(loginSchema)) body: unknown) {
    return this.users.login(body as Parameters<UsersService["login"]>[0]);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  getOne(@Req() req: Request & { user: JwtPayload }, @Param("id") id: string) {
    return this.users.getUser(req.user, id);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard)
  update(
    @Req() req: Request & { user: JwtPayload },
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) body: unknown,
  ) {
    return this.users.updateUser(req.user, id, body as Record<string, string | undefined>);
  }

  @Post("forgot-password")
  forgot(@Body(new ZodValidationPipe(forgotPasswordSchema)) body: { email: string }) {
    return this.users.forgotPassword(body.email);
  }

  @Post("reset-password")
  reset(@Body(new ZodValidationPipe(resetPasswordSchema)) body: { token: string; password: string }) {
    return this.users.resetPassword(body.token, body.password);
  }

  @Post("verify-email")
  verifyEmail(@Body() body: { token: string }) {
    if (!body?.token || typeof body.token !== "string") {
      return { message: "token required" };
    }
    return this.users.verifyEmail(body.token);
  }

  @Get(":id/profile")
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: Request & { user: JwtPayload }, @Param("id") userId: string) {
    return this.users.getProfile(req.user, userId);
  }

  @Put(":id/profile")
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @Req() req: Request & { user: JwtPayload },
    @Param("id") userId: string,
    @Body(new ZodValidationPipe(profileUpdateSchema)) body: unknown,
  ) {
    const b = body as Record<string, unknown>;
    return this.users.updateProfile(req.user, userId, {
      dateOfBirth: typeof b.dateOfBirth === "string" ? b.dateOfBirth : undefined,
      address: typeof b.address === "string" ? b.address : undefined,
      city: typeof b.city === "string" ? b.city : undefined,
      country: typeof b.country === "string" ? b.country : undefined,
      metadata: (b.metadata as Prisma.InputJsonValue | undefined) ?? undefined,
    });
  }
}
