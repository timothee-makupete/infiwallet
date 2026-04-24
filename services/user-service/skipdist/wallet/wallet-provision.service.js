"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var WalletProvisionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletProvisionService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const DEV_WALLET_SERVICE_URL = "http://localhost:3002";
const DEV_INTERNAL_API_KEY = "dev-internal-key";
let WalletProvisionService = WalletProvisionService_1 = class WalletProvisionService {
    config;
    log = new common_1.Logger(WalletProvisionService_1.name);
    constructor(config) {
        this.config = config;
    }
    async provisionForNewUser(userId) {
        const prod = this.config.get("NODE_ENV") === "production";
        const base = this.config.get("WALLET_SERVICE_URL")?.replace(/\/$/, "") ??
            (prod ? undefined : DEV_WALLET_SERVICE_URL);
        const key = this.config.get("INTERNAL_API_KEY") ?? (prod ? undefined : DEV_INTERNAL_API_KEY);
        if (!base || !key) {
            throw new common_1.ServiceUnavailableException("Wallet provisioning is not configured (set WALLET_SERVICE_URL and INTERNAL_API_KEY on user-service).");
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
                throw new common_1.ServiceUnavailableException("Could not initialize wallet. Please try again.");
            }
        }
        catch (e) {
            if (e instanceof common_1.ServiceUnavailableException)
                throw e;
            this.log.error(`Wallet provision request failed: ${String(e)}`);
            throw new common_1.ServiceUnavailableException("Could not initialize wallet. Please try again.");
        }
    }
};
exports.WalletProvisionService = WalletProvisionService;
exports.WalletProvisionService = WalletProvisionService = WalletProvisionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], WalletProvisionService);
//# sourceMappingURL=wallet-provision.service.js.map