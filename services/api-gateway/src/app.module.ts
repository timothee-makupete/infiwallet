import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { HealthController } from "./health/health.controller";
import { RedisModule } from "./redis/redis.module";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), RedisModule, AuthModule],
  controllers: [HealthController],
})
export class AppModule {}
