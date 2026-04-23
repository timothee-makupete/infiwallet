import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { createDomainEvent } from "@infiwallet/utils";
import { EVENT_TYPES } from "@infiwallet/types";
import type { z } from "zod";
import { kycSubmitSchema } from "@infiwallet/validation";
import { Prisma } from "../../prisma/generated";
import { randomBytes } from "crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join, posix } from "node:path";
import { PrismaService } from "../prisma/prisma.service";
import { RabbitMqService } from "../events/rabbitmq.service";
import type { JwtPayload } from "../auth/jwt.strategy";

type KycSubmitInput = z.infer<typeof kycSubmitSchema>;

const MAX_KYC_FILE_BYTES = 8 * 1024 * 1024;

@Injectable()
export class KycService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbit: RabbitMqService,
  ) {}

  async getForUser(actor: JwtPayload, userId: string) {
    if (actor.sub !== userId && actor.role === "USER") {
      throw new ForbiddenException();
    }
    const rows = await this.prisma.verification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.serialize(r));
  }

  async listPending(actor: JwtPayload) {
    if (!["ADMIN", "SUPER_ADMIN"].includes(actor.role)) {
      throw new ForbiddenException();
    }
    const rows = await this.prisma.verification.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
    return rows.map((r) => this.serialize(r));
  }

  async getLimitsByTier(tier: number) {
    const row = await this.prisma.tierLimit.findUnique({ where: { tier } });
    if (!row) throw new NotFoundException("Unknown tier");
    return {
      tier: row.tier,
      dailyLimit: Number(row.dailyLimit),
      monthlyLimit: Number(row.monthlyLimit),
      singleTransactionLimit: Number(row.singleTransactionLimit),
    };
  }

  async getInternalTier(userId: string) {
    const approvedAgg = await this.prisma.verification.aggregate({
      where: { userId, status: "approved" },
      _max: { tier: true },
    });
    const maxApprovedTier = approvedAgg._max.tier ?? 0;
    /** Limits follow the highest approved tier only; pending higher tier must not raise limits yet. */
    const limitsTier = Math.max(1, maxApprovedTier);
    const latest = await this.prisma.verification.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
    const status =
      latest?.status === "pending"
        ? "pending"
        : maxApprovedTier > 0
          ? "approved"
          : (latest?.status ?? "pending");
    const limits = await this.prisma.tierLimit.findUnique({ where: { tier: limitsTier } });
    if (!limits) throw new NotFoundException("Tier limits missing — run seed");
    return {
      tier: limitsTier,
      status,
      dailyLimit: Number(limits.dailyLimit),
      monthlyLimit: Number(limits.monthlyLimit),
      singleTransactionLimit: Number(limits.singleTransactionLimit),
    };
  }

  async submit(actor: JwtPayload, userId: string, body: KycSubmitInput) {
    if (actor.sub !== userId) {
      throw new ForbiddenException();
    }
    const maxApproved = await this.getMaxApprovedTier(userId);
    const nextTier = maxApproved + 1;
    if (body.tier !== nextTier) {
      throw new BadRequestException(
        maxApproved === 0
          ? "Your first KYC submission must be for Tier 1."
          : `Your next verification must be for Tier ${nextTier} only.`,
      );
    }
    const pending = await this.prisma.verification.findFirst({
      where: { userId, status: "pending" },
    });
    if (pending) {
      throw new BadRequestException(
        "You already have a verification awaiting review. Wait for a decision before submitting again.",
      );
    }
    const correlationId = randomBytes(8).toString("hex");
    const docs = await this.persistDocuments(userId, body.documents);
    const v = await this.prisma.verification.create({
      data: {
        userId,
        tier: body.tier,
        status: "pending",
        documents: docs,
        notes: body.notes,
      },
    });
    const ev = createDomainEvent(
      EVENT_TYPES.KYC_VERIFICATION_SUBMITTED,
      v.id,
      { verificationId: v.id, userId, tier: body.tier },
      { correlationId, userId, service: "kyc-service" },
    );
    await this.rabbit.publishEvent("kyc.verification.submitted", ev).catch(() => undefined);
    return this.serialize(v);
  }

  async review(
    reviewer: JwtPayload,
    id: string,
    body: { status: "approved" | "rejected"; notes?: string },
  ) {
    const row = await this.prisma.verification.findUnique({ where: { id } });
    if (!row) throw new NotFoundException();
    const correlationId = randomBytes(8).toString("hex");
    const updated = await this.prisma.verification.update({
      where: { id },
      data: {
        status: body.status,
        notes: body.notes ?? row.notes,
        reviewedBy: reviewer.sub,
        reviewedAt: new Date(),
      },
    });
    const eventType =
      body.status === "approved"
        ? EVENT_TYPES.KYC_VERIFICATION_APPROVED
        : EVENT_TYPES.KYC_VERIFICATION_REJECTED;
    const ev = createDomainEvent(
      eventType,
      updated.id,
      {
        verificationId: updated.id,
        userId: row.userId,
        tier: row.tier,
        status: body.status,
      },
      { correlationId, userId: row.userId, service: "kyc-service" },
    );
    await this.rabbit
      .publishEvent(body.status === "approved" ? "kyc.verification.approved" : "kyc.verification.rejected", ev)
      .catch(() => undefined);
    return this.serialize(updated);
  }

  private async getMaxApprovedTier(userId: string): Promise<number> {
    const agg = await this.prisma.verification.aggregate({
      where: { userId, status: "approved" },
      _max: { tier: true },
    });
    return agg._max.tier ?? 0;
  }

  private decodeBase64File(dataBase64: string): Buffer {
    const trimmed = dataBase64.trim();
    const dataUrl = trimmed.match(/^data:([^;]+);base64,(.+)$/is);
    const b64 = dataUrl?.[2] ?? trimmed;
    try {
      return Buffer.from(b64, "base64");
    } catch {
      throw new BadRequestException("Invalid document encoding");
    }
  }

  private extFromMime(mime: string): string {
    const map: Record<string, string> = {
      "application/pdf": ".pdf",
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
    };
    return map[mime] ?? ".bin";
  }

  private safeBasename(name: string): string {
    const base = name.split(/[/\\]/).pop() ?? "file";
    const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
    return cleaned.length > 0 ? cleaned : "file";
  }

  private async persistDocuments(
    userId: string,
    docs: KycSubmitInput["documents"],
  ): Promise<Prisma.InputJsonValue> {
    const baseDir = process.env.KYC_UPLOAD_DIR ?? join(process.cwd(), "data", "kyc-uploads");
    const userDir = join(baseDir, userId);
    await mkdir(userDir, { recursive: true });
    const stored: Record<string, unknown>[] = [];
    for (const d of docs) {
      if (d.storageKey) {
        stored.push({
          type: d.type,
          fileName: d.fileName,
          mimeType: d.mimeType,
          storageKey: d.storageKey,
        });
        continue;
      }
      const buf = this.decodeBase64File(d.dataBase64!);
      if (buf.length === 0) {
        throw new BadRequestException(`Document "${d.fileName}" is empty`);
      }
      if (buf.length > MAX_KYC_FILE_BYTES) {
        throw new BadRequestException(`Document "${d.fileName}" exceeds maximum size (8MB)`);
      }
      const id = randomBytes(16).toString("hex");
      const ext = this.extFromMime(d.mimeType);
      const diskName = `${id}${ext}`;
      const absPath = join(userDir, diskName);
      await writeFile(absPath, buf);
      const relKey = posix.join(userId, diskName);
      stored.push({
        type: d.type,
        fileName: d.fileName,
        mimeType: d.mimeType,
        storageKey: relKey,
        sizeBytes: buf.length,
        uploadedAt: new Date().toISOString(),
      });
    }
    return stored as unknown as Prisma.InputJsonValue;
  }

  private serialize(r: {
    id: string;
    userId: string;
    tier: number;
    status: string;
    documents: Prisma.JsonValue | null;
    notes: string | null;
    reviewedBy: string | null;
    reviewedAt: Date | null;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: r.id,
      userId: r.userId,
      tier: r.tier,
      status: r.status,
      documents: r.documents,
      notes: r.notes,
      reviewedBy: r.reviewedBy,
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
      expiresAt: r.expiresAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
