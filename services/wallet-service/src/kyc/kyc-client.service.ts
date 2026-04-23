import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";

/** Tier limits from KYC service (usage computed locally in wallet). */
export interface TierLimitInfo {
  tier: number;
  status: string;
  dailyLimit: number;
  monthlyLimit: number;
  singleTransactionLimit: number;
}

@Injectable()
export class KycClientService {
  private readonly log = new Logger(KycClientService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async getTierLimits(userId: string): Promise<TierLimitInfo | null> {
    const base = this.config.get<string>("KYC_SERVICE_URL");
    const key = this.config.get<string>("INTERNAL_API_KEY");
    if (!base) {
      this.log.warn("KYC_SERVICE_URL not set; skipping limit checks");
      return null;
    }
    try {
      const url = `${base.replace(/\/$/, "")}/api/v1/kyc/internal/${userId}/tier`;
      const res = await firstValueFrom(
        this.http.get<TierLimitInfo>(url, {
          headers: key ? { "x-internal-key": key } : {},
          timeout: 5000,
        }),
      );
      return res.data;
    } catch (e) {
      this.log.warn(`KYC tier fetch failed: ${String(e)}`);
      return null;
    }
  }
}
