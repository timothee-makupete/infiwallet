import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { createHash } from "crypto";
import { createProxyMiddleware } from "http-proxy-middleware";
import rateLimit from "express-rate-limit";
import type { Request, Response, NextFunction } from "express";
import { AppModule } from "./app.module";
import { createLogger } from "./common/logger";
import { RedisService } from "./redis/redis.service";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(createLogger("api-gateway"));
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: true, credentials: true });

  const config = app.get(ConfigService);
  const redis = app.get(RedisService);
  const server = app.getHttpAdapter().getInstance() as {
    use: (path: string | ((req: Request, res: Response, next: NextFunction) => void), handler?: unknown) => void;
  };

  const limiter = rateLimit({
    windowMs: 60_000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request): string => {
      const auth = req.headers.authorization;
      if (typeof auth === "string" && auth.length > 0) {
        return createHash("sha256").update(auth).digest("hex");
      }
      return req.ip ?? "unknown";
    },
    skip: (req: Request) => req.path.includes("/health"),
  });

  server.use("/api/v1", limiter);

  server.use(async (req: Request, res: Response, next: NextFunction) => {
    const p = req.path;
    if (!p.startsWith("/api/v1/users") && !p.startsWith("/api/v1/wallets") && !p.startsWith("/api/v1/kyc")) {
      next();
      return;
    }
    const auth = req.headers.authorization;
    if (auth?.startsWith("Bearer ")) {
      const token = auth.slice(7);
      if (await redis.isBlacklisted(token)) {
        res.status(401).json({ statusCode: 401, message: "Token revoked" });
        return;
      }
    }
    next();
  });

  const userUrl = config.getOrThrow<string>("USER_SERVICE_URL").replace(/\/$/, "");
  const walletUrl = config.getOrThrow<string>("WALLET_SERVICE_URL").replace(/\/$/, "");
  const kycUrl = config.getOrThrow<string>("KYC_SERVICE_URL").replace(/\/$/, "");

  /** Express strips the mount path from `req.url`; backends expect full `/api/v1/...` paths. */
  const restoreGlobalPath =
    (servicePrefix: string) =>
    (path: string): string => {
      if (!path || path === "/") return servicePrefix;
      return `${servicePrefix}${path.startsWith("/") ? path : `/${path}`}`;
    };

  server.use(
    "/api/v1/users",
    createProxyMiddleware({
      target: userUrl,
      changeOrigin: true,
      pathRewrite: restoreGlobalPath("/api/v1/users"),
    }),
  );
  server.use(
    "/api/v1/wallets",
    createProxyMiddleware({
      target: walletUrl,
      changeOrigin: true,
      pathRewrite: restoreGlobalPath("/api/v1/wallets"),
    }),
  );
  server.use(
    "/api/v1/kyc",
    createProxyMiddleware({
      target: kycUrl,
      changeOrigin: true,
      pathRewrite: restoreGlobalPath("/api/v1/kyc"),
    }),
  );

  const port = process.env.PORT ?? 3018;
  await app.listen(port);
}

bootstrap().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
