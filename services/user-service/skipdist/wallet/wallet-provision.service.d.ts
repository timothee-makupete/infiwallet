import { ConfigService } from "@nestjs/config";
export declare class WalletProvisionService {
    private readonly config;
    private readonly log;
    constructor(config: ConfigService);
    provisionForNewUser(userId: string): Promise<void>;
}
