import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { createDomainEvent } from "@infiwallet/utils";
import { EVENT_TYPES } from "@infiwallet/types";
import { Prisma } from "../../prisma/generated";
import { randomBytes, randomUUID } from "crypto";
import { KycClientService } from "../kyc/kyc-client.service";
import { PrismaService } from "../prisma/prisma.service";
import { RabbitMqService } from "../events/rabbitmq.service";
import type { JwtPayload } from "../auth/jwt.strategy";

@Injectable()
export class WalletsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbit: RabbitMqService,
    private readonly kyc: KycClientService,
  ) {}

  private assertAccess(actor: JwtPayload, userId: string): void {
    if (actor.sub !== userId && actor.role === "USER") {
      throw new ForbiddenException();
    }
  }

  /**
   * Idempotent: creates a wallet for the user if missing (signup + messaging consumer).
   */
  async ensureWalletForUser(
    userId: string,
    opts?: { correlationId?: string; causationId?: string },
  ): Promise<{
    created: boolean;
    wallet: {
      id: string;
      userId: string;
      walletNumber: string;
      balance: number;
      currency: string;
      status: string;
      updatedAt: string;
    };
  }> {
    const existing = await this.prisma.wallet.findUnique({ where: { userId } });
    if (existing) {
      return { created: false, wallet: this.serializeWallet(existing) };
    }
    const walletNumber = await this.allocateWalletNumber();
    const w = await this.prisma.wallet.create({
      data: { userId, walletNumber },
    });
    const correlationId = opts?.correlationId ?? randomBytes(8).toString("hex");
    const out = createDomainEvent(
      EVENT_TYPES.WALLET_CREATED,
      w.id,
      { walletId: w.id, userId },
      {
        correlationId,
        causationId: opts?.causationId,
        userId,
        service: "wallet-service",
      },
    );
    await this.rabbit.publishEvent("wallet.created", out).catch(() => undefined);
    return { created: true, wallet: this.serializeWallet(w) };
  }

  /** Human-readable unique reference; DB enforces NOT NULL + unique on `wallet_number`. */
  private async allocateWalletNumber(): Promise<string> {
    for (let attempt = 0; attempt < 12; attempt++) {
      const candidate = randomUUID().replace(/-/g, "").slice(0, 20).toUpperCase();
      const clash = await this.prisma.wallet.findUnique({ where: { walletNumber: candidate } });
      if (!clash) return candidate;
    }
    throw new InternalServerErrorException("Could not allocate wallet number");
  }

  async getWallet(actor: JwtPayload, userId: string) {
    this.assertAccess(actor, userId);
    const w = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!w) throw new NotFoundException("Wallet not found");
    return this.serializeWallet(w);
  }

  async getBalance(actor: JwtPayload, userId: string) {
    this.assertAccess(actor, userId);
    const w = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!w) throw new NotFoundException("Wallet not found");
    return { balance: Number(w.balance), currency: w.currency };
  }

  async listTransactions(actor: JwtPayload, userId: string, take = 50) {
    this.assertAccess(actor, userId);
    const w = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!w) throw new NotFoundException("Wallet not found");
    const rows = await this.prisma.transaction.findMany({
      where: { walletId: w.id },
      orderBy: { createdAt: "desc" },
      take: Math.min(take, 200),
    });
    return rows.map((t) => this.serializeTx(t));
  }

  private async assertWithinKycLimits(
    userId: string,
    walletId: string,
    amount: number,
  ): Promise<void> {
    const tier = await this.kyc.getTierLimits(userId);
    if (!tier) {
      return;
    }
    if (amount > tier.singleTransactionLimit) {
      throw new BadRequestException("Amount exceeds single transaction limit for your KYC tier");
    }
    const { daily, monthly } = await this.sumVolume(walletId);
    if (amount + daily > tier.dailyLimit) {
      throw new BadRequestException("Would exceed daily limit for your KYC tier");
    }
    if (amount + monthly > tier.monthlyLimit) {
      throw new BadRequestException("Would exceed monthly limit for your KYC tier");
    }
  }

  private async sumVolume(walletId: string): Promise<{ daily: number; monthly: number }> {
    const now = new Date();
    const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [dayRows, monthRows] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { walletId, status: "completed", createdAt: { gte: startDay } },
      }),
      this.prisma.transaction.findMany({
        where: { walletId, status: "completed", createdAt: { gte: startMonth } },
      }),
    ]);
    const sum = (rows: { amount: Prisma.Decimal }[]) =>
      rows.reduce((acc, r) => acc + Number(r.amount), 0);
    return { daily: sum(dayRows), monthly: sum(monthRows) };
  }

  async deposit(
    actor: JwtPayload,
    userId: string,
    body: { amount: number; description?: string; reference?: string },
  ) {
    this.assertAccess(actor, userId);
    const w0 = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!w0) throw new NotFoundException("Wallet not found");
    await this.assertWithinKycLimits(userId, w0.id, body.amount);
    const reference = body.reference?.trim() || `dep-${randomUUID()}`;
    const correlationId = randomBytes(8).toString("hex");
    const result = await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new NotFoundException("Wallet not found");
      if (wallet.status !== "active") throw new BadRequestException("Wallet inactive");
      const before = new Prisma.Decimal(wallet.balance);
      const amt = new Prisma.Decimal(body.amount);
      const after = before.plus(amt);
      const t = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: "DEPOSIT",
          amount: amt,
          balanceBefore: before,
          balanceAfter: after,
          status: "completed",
          reference,
          description: body.description,
        },
      });
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: after },
      });
      return { walletId: wallet.id, userId, t, before: Number(before), after: Number(after) };
    });
    const creditEvent = createDomainEvent(
      EVENT_TYPES.WALLET_BALANCE_CREDITED,
      result.t.id,
      {
        transactionId: result.t.id,
        walletId: result.walletId,
        userId,
        amount: body.amount,
        balanceAfter: result.after,
      },
      { correlationId, userId, service: "wallet-service" },
    );
    await this.rabbit.publishEvent("wallet.balance.credited", creditEvent).catch(() => undefined);
    const txEvent = createDomainEvent(
      EVENT_TYPES.WALLET_TRANSACTION_CREATED,
      result.t.id,
      {
        transactionId: result.t.id,
        walletId: result.walletId,
        userId,
        type: "DEPOSIT",
        amount: body.amount,
      },
      { correlationId, userId, service: "wallet-service" },
    );
    await this.rabbit.publishEvent("wallet.transaction.created", txEvent).catch(() => undefined);
    return this.serializeTx(result.t);
  }

  async withdraw(
    actor: JwtPayload,
    userId: string,
    body: { amount: number; description?: string; reference?: string },
  ) {
    this.assertAccess(actor, userId);
    const w0 = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!w0) throw new NotFoundException("Wallet not found");
    await this.assertWithinKycLimits(userId, w0.id, body.amount);
    const reference = body.reference?.trim() || `wdr-${randomUUID()}`;
    const correlationId = randomBytes(8).toString("hex");
    const result = await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new NotFoundException("Wallet not found");
      if (wallet.status !== "active") throw new BadRequestException("Wallet inactive");
      const before = new Prisma.Decimal(wallet.balance);
      const amt = new Prisma.Decimal(body.amount);
      if (before.lessThan(amt)) {
        throw new BadRequestException("Insufficient balance");
      }
      const after = before.minus(amt);
      const t = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: "WITHDRAWAL",
          amount: amt,
          balanceBefore: before,
          balanceAfter: after,
          status: "completed",
          reference,
          description: body.description,
        },
      });
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: after },
      });
      return { walletId: wallet.id, userId, t, after: Number(after) };
    });
    const debitEvent = createDomainEvent(
      EVENT_TYPES.WALLET_BALANCE_DEBITED,
      result.t.id,
      {
        transactionId: result.t.id,
        walletId: result.walletId,
        userId,
        amount: body.amount,
        balanceAfter: result.after,
      },
      { correlationId, userId, service: "wallet-service" },
    );
    await this.rabbit.publishEvent("wallet.balance.debited", debitEvent).catch(() => undefined);
    const txEvent = createDomainEvent(
      EVENT_TYPES.WALLET_TRANSACTION_CREATED,
      result.t.id,
      {
        transactionId: result.t.id,
        walletId: result.walletId,
        userId,
        type: "WITHDRAWAL",
        amount: body.amount,
      },
      { correlationId, userId, service: "wallet-service" },
    );
    await this.rabbit.publishEvent("wallet.transaction.created", txEvent).catch(() => undefined);
    return this.serializeTx(result.t);
  }

  private serializeWallet(w: {
    id: string;
    userId: string;
    walletNumber: string;
    balance: Prisma.Decimal;
    currency: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: w.id,
      userId: w.userId,
      walletNumber: w.walletNumber,
      balance: Number(w.balance),
      currency: w.currency,
      status: w.status,
      updatedAt: w.updatedAt.toISOString(),
    };
  }

  async listAllTransactions(actor: JwtPayload, take = 100) {
    if (!["ADMIN", "SUPER_ADMIN"].includes(actor.role)) {
      throw new ForbiddenException();
    }
    const rows = await this.prisma.transaction.findMany({
      orderBy: { createdAt: "desc" },
      take: Math.min(take, 500),
      include: { wallet: true },
    });
    return rows.map((t) => ({
      ...this.serializeTx(t),
      userId: t.wallet.userId,
    }));
  }

  private serializeTx(t: {
    id: string;
    walletId: string;
    type: string;
    amount: Prisma.Decimal;
    balanceBefore: Prisma.Decimal;
    balanceAfter: Prisma.Decimal;
    status: string;
    reference: string;
    description: string | null;
    createdAt: Date;
  }) {
    return {
      id: t.id,
      walletId: t.walletId,
      type: t.type,
      amount: Number(t.amount),
      balanceBefore: Number(t.balanceBefore),
      balanceAfter: Number(t.balanceAfter),
      status: t.status,
      reference: t.reference,
      description: t.description,
      createdAt: t.createdAt.toISOString(),
    };
  }
}
