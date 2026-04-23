import { Body, Controller, HttpException, Logger, Post, Req, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { isAxiosError } from "axios";
import type { Request, Response } from "express";
import { RedisService } from "../redis/redis.service";

@Controller("auth")
export class AuthController {
  private readonly log = new Logger(AuthController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  private async forwardToUserRegisterLogin(
    path: "register" | "login",
    body: Record<string, unknown>,
  ): Promise<unknown> {
    try {
      const base = this.config.getOrThrow<string>("USER_SERVICE_URL").replace(/\/$/, "");
      const url = `${base}/api/v1/users/${path}`;
      const res = await axios.post(url, body, {
        timeout: 15000,
        validateStatus: () => true,
      });
      if (res.status >= 400) {
        throw new HttpException(res.data, res.status);
      }
      return res.data;
    } catch (err: unknown) {
      if (err instanceof HttpException) {
        throw err;
      }
      if (isAxiosError(err)) {
        // Recompute URL for logs even if config changed.
        const base = this.config.get<string>("USER_SERVICE_URL")?.replace(/\/$/, "") ?? "<missing USER_SERVICE_URL>";
        const url = `${base}/api/v1/users/${path}`;
        const code = err.code ?? "ERR";
        const msg = err.message;
        this.log.error(`User service request failed: ${path} ${url} code=${code} message=${msg}`);
        if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND") {
          throw new HttpException(
            {
              statusCode: 502,
              message: "User service unreachable. Is user-service running on USER_SERVICE_URL?",
              code,
            },
            502,
          );
        }
        if (err.code === "ECONNABORTED" || err.message.includes("timeout")) {
          throw new HttpException(
            { statusCode: 504, message: "User service request timed out", code },
            504,
          );
        }
        throw new HttpException(
          { statusCode: 502, message: `User service error: ${msg}`, code },
          502,
        );
      }
      const msg = String(err);
      this.log.error(`Unexpected auth error: ${msg}`);
      if (msg.includes("USER_SERVICE_URL")) {
        throw new HttpException(
          {
            statusCode: 500,
            message:
              "Gateway is missing USER_SERVICE_URL. Start api-gateway with USER_SERVICE_URL=http://localhost:3001",
          },
          500,
        );
      }
      throw new HttpException({ statusCode: 500, message: "Internal server error" }, 500);
    }
  }

  @Post("register")
  async register(@Body() body: Record<string, unknown>) {
    return this.forwardToUserRegisterLogin("register", body);
  }

  @Post("login")
  async login(@Body() body: Record<string, unknown>) {
    return this.forwardToUserRegisterLogin("login", body);
  }

  @Post("logout")
  async logout(@Req() req: Request, @Res({ passthrough: false }) res: Response): Promise<void> {
    const auth = req.headers.authorization;
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (token && this.redis.isEnabled()) {
      await this.redis.blacklistToken(token, 86400);
    }
    res.status(204).send();
  }
}
