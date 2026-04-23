import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { json, urlencoded } from "express";
import { AppModule } from "./app.module";
import { createLogger } from "./common/logger";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const http = app.getHttpAdapter().getInstance();
  http.use(json({ limit: "14mb" }));
  http.use(urlencoded({ extended: true, limit: "14mb" }));
  app.useLogger(createLogger("kyc-service"));
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.enableCors({ origin: true, credentials: true });
  const port = process.env.PORT ?? 3003;
  await app.listen(port);
}

bootstrap().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
