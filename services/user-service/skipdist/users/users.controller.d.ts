import type { Request } from "express";
import type { JwtPayload } from "../auth/jwt.strategy";
import { UsersService } from "./users.service";
export declare class UsersController {
    private readonly users;
    constructor(users: UsersService);
    listAll(): Promise<Record<string, unknown>[]>;
    register(body: unknown): Promise<{
        accessToken: string;
        user: Record<string, unknown>;
    }>;
    login(body: unknown): Promise<{
        accessToken: string;
        user: Record<string, unknown>;
    }>;
    getOne(req: Request & {
        user: JwtPayload;
    }, id: string): Promise<Record<string, unknown>>;
    update(req: Request & {
        user: JwtPayload;
    }, id: string, body: unknown): Promise<Record<string, unknown>>;
    forgot(body: {
        email: string;
    }): Promise<{
        message: string;
        resetToken?: string;
    }>;
    reset(body: {
        token: string;
        password: string;
    }): Promise<{
        message: string;
    }>;
    verifyEmail(body: {
        token: string;
    }): Promise<{
        message: string;
    }> | {
        message: string;
    };
    getProfile(req: Request & {
        user: JwtPayload;
    }, userId: string): Promise<Record<string, unknown>>;
    updateProfile(req: Request & {
        user: JwtPayload;
    }, userId: string, body: unknown): Promise<Record<string, unknown>>;
}
