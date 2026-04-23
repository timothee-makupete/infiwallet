import {
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createDomainEvent } from "@infiwallet/utils";
import { EVENT_TYPES } from "@infiwallet/types";
import type { UserRole } from "@infiwallet/types";
import * as bcrypt from "bcrypt";
import { createHash, randomBytes } from "crypto";
import type { Prisma } from "../../prisma/generated";
import { PrismaService } from "../prisma/prisma.service";
import { RabbitMqService } from "../events/rabbitmq.service";
import { WalletProvisionService } from "../wallet/wallet-provision.service";
import type { JwtPayload } from "../auth/jwt.strategy";

const BCRYPT_ROUNDS = 12;

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly rabbit: RabbitMqService,
    private readonly walletProvision: WalletProvisionService,
  ) {}

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private async signAccessToken(userId: string, email: string, role: string): Promise<string> {
    const payload: JwtPayload = {
      sub: userId,
      email,
      role: role as UserRole,
    };
    return this.jwt.signAsync(payload);
  }

  private mapPersistenceError(err: unknown): never {
    const msg = String(err);
    if (msg.includes("Environment variable not found: DATABASE_URL")) {
      throw new ServiceUnavailableException(
        "DATABASE_URL is missing in user-service environment",
      );
    }
    if (msg.includes("P1001")) {
      throw new ServiceUnavailableException(
        "Cannot connect to database. Check Postgres and DATABASE_URL.",
      );
    }
    if (msg.includes("P2021") || msg.toLowerCase().includes("table") && msg.toLowerCase().includes("does not exist")) {
      throw new InternalServerErrorException(
        "Database schema is not applied. Run prisma db push for user-service.",
      );
    }
    throw new InternalServerErrorException("Database operation failed");
  }

  async register(dto: RegisterDto): Promise<{ accessToken: string; user: Record<string, unknown> }> {
    let existing;
    try {
      existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    } catch (err) {
      this.mapPersistenceError(err);
    }
    if (existing) {
      throw new ConflictException("Email already registered");
    }
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const correlationId = randomBytes(8).toString("hex");
    let user;
    try {
      user = await this.prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: {
            email: dto.email,
            passwordHash,
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone,
            profile: { create: {} },
          },
        });
        const rawToken = randomBytes(32).toString("hex");
        await tx.emailVerificationToken.create({
          data: {
            userId: u.id,
            tokenHash: this.hashToken(rawToken),
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          },
        });
        return { u, emailVerificationToken: rawToken };
      });
    } catch (err) {
      this.mapPersistenceError(err);
    }
    try {
      await this.walletProvision.provisionForNewUser(user.u.id);
    } catch (err) {
      try {
        await this.prisma.emailVerificationToken.deleteMany({ where: { userId: user.u.id } });
        await this.prisma.user.delete({ where: { id: user.u.id } });
      } catch {
        /* best-effort rollback */
      }
      throw err;
    }
    const accessToken = await this.signAccessToken(user.u.id, user.u.email, user.u.role);
    const event = createDomainEvent(
      EVENT_TYPES.USER_CREATED,
      user.u.id,
      {
        userId: user.u.id,
        email: user.u.email,
        firstName: user.u.firstName,
        lastName: user.u.lastName,
      },
      { correlationId, userId: user.u.id, service: "user-service" },
    );
    await this.rabbit.publishEvent("user.created", event).catch(() => undefined);
    return {
      accessToken,
      user: this.sanitizeUser(user.u, user.emailVerificationToken),
    };
  }

  async login(dto: LoginDto): Promise<{ accessToken: string; user: Record<string, unknown> }> {
    let user;
    try {
      user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    } catch (err) {
      this.mapPersistenceError(err);
    }
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid credentials");
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException("Invalid credentials");
    }
    const accessToken = await this.signAccessToken(user.id, user.email, user.role);
    return { accessToken, user: this.sanitizeUser(user) };
  }

  sanitizeUser(
    user: { id: string; email: string; firstName: string; lastName: string; phone: string | null; role: string; emailVerified: boolean; isActive: boolean; createdAt: Date; updatedAt: Date },
    emailVerificationToken?: string,
  ): Record<string, unknown> {
    const base: Record<string, unknown> = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      emailVerified: user.emailVerified,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
    if (process.env.NODE_ENV !== "production" && emailVerificationToken) {
      base.emailVerificationToken = emailVerificationToken;
    }
    return base;
  }

  async listUsers(): Promise<Record<string, unknown>[]> {
    const rows = await this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return rows.map((u) => this.sanitizeUser(u));
  }

  async getUser(actor: JwtPayload, id: string): Promise<Record<string, unknown>> {
    if (actor.sub !== id && actor.role === "USER") {
      throw new ForbiddenException();
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("User not found");
    return this.sanitizeUser(user);
  }

  async updateUser(
    actor: JwtPayload,
    id: string,
    data: { firstName?: string; lastName?: string; phone?: string },
  ): Promise<Record<string, unknown>> {
    if (actor.sub !== id && !["ADMIN", "SUPER_ADMIN"].includes(actor.role)) {
      throw new ForbiddenException();
    }
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      },
    });
    const event = createDomainEvent(
      EVENT_TYPES.USER_UPDATED,
      user.id,
      { userId: user.id, changes: data },
      {
        correlationId: randomBytes(8).toString("hex"),
        userId: user.id,
        service: "user-service",
      },
    );
    await this.rabbit.publishEvent("user.updated", event).catch(() => undefined);
    return this.sanitizeUser(user);
  }

  async forgotPassword(email: string): Promise<{ message: string; resetToken?: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { message: "If the email exists, instructions were sent." };
    }
    await this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    const raw = randomBytes(32).toString("hex");
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(raw),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      },
    });
    const message = "If the email exists, instructions were sent.";
    if (process.env.NODE_ENV !== "production") {
      return { message, resetToken: raw };
    }
    return { message };
  }

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const hash = this.hashToken(token);
    const row = await this.prisma.passwordResetToken.findFirst({
      where: { tokenHash: hash, expiresAt: { gt: new Date() } },
    });
    if (!row) {
      throw new UnauthorizedException("Invalid or expired token");
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: row.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.delete({ where: { id: row.id } }),
    ]);
    return { message: "Password updated" };
  }

  async getProfile(actor: JwtPayload, userId: string): Promise<Record<string, unknown>> {
    if (actor.sub !== userId && actor.role === "USER") {
      throw new ForbiddenException();
    }
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      include: { user: true },
    });
    if (!profile) throw new NotFoundException();
    return {
      id: profile.id,
      userId: profile.userId,
      dateOfBirth: profile.dateOfBirth?.toISOString().slice(0, 10) ?? null,
      address: profile.address,
      city: profile.city,
      country: profile.country,
      metadata: profile.metadata,
      updatedAt: profile.updatedAt.toISOString(),
    };
  }

  async updateProfile(
    actor: JwtPayload,
    userId: string,
    data: {
      dateOfBirth?: string;
      address?: string;
      city?: string;
      country?: string;
      metadata?: Prisma.InputJsonValue;
    },
  ): Promise<Record<string, unknown>> {
    if (actor.sub !== userId && !["ADMIN", "SUPER_ADMIN"].includes(actor.role)) {
      throw new ForbiddenException();
    }
    const dob =
      data.dateOfBirth && data.dateOfBirth.length > 0 ? new Date(`${data.dateOfBirth}T00:00:00.000Z`) : undefined;
    const profile = await this.prisma.userProfile.update({
      where: { userId },
      data: {
        dateOfBirth: dob === undefined ? undefined : dob,
        address: data.address,
        city: data.city,
        country: data.country,
        metadata: data.metadata === undefined ? undefined : data.metadata,
      },
    });
    const event = createDomainEvent(
      EVENT_TYPES.USER_UPDATED,
      userId,
      { userId, profile: true },
      {
        correlationId: randomBytes(8).toString("hex"),
        userId,
        service: "user-service",
      },
    );
    await this.rabbit.publishEvent("user.updated", event).catch(() => undefined);
    return {
      id: profile.id,
      userId: profile.userId,
      dateOfBirth: profile.dateOfBirth?.toISOString().slice(0, 10) ?? null,
      address: profile.address,
      city: profile.city,
      country: profile.country,
      metadata: profile.metadata,
      updatedAt: profile.updatedAt.toISOString(),
    };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const hash = this.hashToken(token);
    const row = await this.prisma.emailVerificationToken.findFirst({
      where: { tokenHash: hash, expiresAt: { gt: new Date() } },
    });
    if (!row) {
      throw new UnauthorizedException("Invalid or expired token");
    }
    const user = await this.prisma.user.update({
      where: { id: row.userId },
      data: { emailVerified: true },
    });
    await this.prisma.emailVerificationToken.delete({ where: { id: row.id } });
    const event = createDomainEvent(
      EVENT_TYPES.USER_EMAIL_VERIFIED,
      user.id,
      { userId: user.id, email: user.email },
      {
        correlationId: randomBytes(8).toString("hex"),
        userId: user.id,
        service: "user-service",
      },
    );
    await this.rabbit.publishEvent("user.email_verified", event).catch(() => undefined);
    return { message: "Email verified" };
  }
}
