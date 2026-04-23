import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/** Local defaults when env is unset (non-production only); keep in sync with scripts/dev.ps1 and start-all.ps1. */
const DEV_WALLET_SERVICE_URL = "http://localhost:3002";
const DEV_INTERNAL_API_KEY = "dev-internal-key";

@Injectable()
export class WalletProvisionService {
  private readonly log = new Logger(WalletProvisionService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Ensures a wallet row exists for the new user. User-service must call wallet-service
   * directly because RabbitMQ publish is skipped when RABBITMQ_URL is unset.
   */
  async provisionForNewUser(userId: string): Promise<void> {
    const prod = this.config.get<string>("NODE_ENV") === "production";
    const base =
      this.config.get<string>("WALLET_SERVICE_URL")?.replace(/\/$/, "") ??
      (prod ? undefined : DEV_WALLET_SERVICE_URL);
    const key = this.config.get<string>("INTERNAL_API_KEY") ?? (prod ? undefined : DEV_INTERNAL_API_KEY);
    if (!base || !key) {
      throw new ServiceUnavailableException(
        "Wallet provisioning is not configured (set WALLET_SERVICE_URL and INTERNAL_API_KEY on user-service).",
      );
    }
    const url = `${base}/api/v1/wallets/internal/provision/${encodeURIComponent(userId)}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "x-internal-key": key },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        this.log.error(`Wallet provision failed HTTP ${res.status}: ${body}`);
        throw new ServiceUnavailableException("Could not initialize wallet. Please try again.");
      }
    } catch (e) {
      if (e instanceof ServiceUnavailableException) throw e;
      this.log.error(`Wallet provision request failed: ${String(e)}`);
      throw new ServiceUnavailableException("Could not initialize wallet. Please try again.");
    }
  }
}
