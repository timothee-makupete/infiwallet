import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "crypto";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis | null = null;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>("REDIS_URL");
    if (url) {
      this.client = new Redis(url, { maxRetriesPerRequest: 2, lazyConnect: true });
    }
  }

  isEnabled(): boolean {
    return this.client !== null;
  }

  async blacklistToken(token: string, ttlSeconds: number): Promise<void> {
    if (!this.client) return;
    const key = `bl:${createHash("sha256").update(token).digest("hex")}`;
    await this.client.set(key, "1", "EX", ttlSeconds);
  }

  async isBlacklisted(token: string): Promise<boolean> {
    if (!this.client) return false;
    const key = `bl:${createHash("sha256").update(token).digest("hex")}`;
    const v = await this.client.get(key);
    return v === "1";
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.quit().catch(() => undefined);
  }
}
