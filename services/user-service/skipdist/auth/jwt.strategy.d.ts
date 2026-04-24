import { ConfigService } from "@nestjs/config";
import type { UserRole } from "@infiwallet/types";
import { Strategy } from "passport-jwt";
export interface JwtPayload {
    sub: string;
    email: string;
    role: UserRole;
}
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    constructor(config: ConfigService);
    validate(payload: JwtPayload): JwtPayload;
}
export {};
