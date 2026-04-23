import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { KycClientService } from "./kyc-client.service";

@Module({
  imports: [HttpModule],
  providers: [KycClientService],
  exports: [KycClientService],
})
export class KycModule {}
