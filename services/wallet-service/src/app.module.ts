import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { EventsModule } from "./events/events.module";
import { KycModule } from "./kyc/kyc.module";
import { PrismaModule } from "./prisma/prisma.module";
import { WalletsModule } from "./wallets/wallets.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    EventsModule,
    KycModule,
    AuthModule,
    WalletsModule,
  ],
})
export class AppModule {}
