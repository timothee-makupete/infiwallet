import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";

@Injectable()
export class InternalKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>("INTERNAL_API_KEY");
    if (!expected) {
      throw new UnauthorizedException("Internal API not configured");
    }
    const req = context.switchToHttp().getRequest<Request>();
    const key = req.header("x-internal-key");
    if (key !== expected) {
      throw new UnauthorizedException();
    }
    return true;
  }
}
