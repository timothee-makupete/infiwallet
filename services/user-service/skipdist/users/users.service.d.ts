import { JwtService } from "@nestjs/jwt";
import type { Prisma } from "../../prisma/generated";
import { PrismaService } from "../prisma/prisma.service";
import { RabbitMqService } from "../events/rabbitmq.service";
import { WalletProvisionService } from "../wallet/wallet-provision.service";
import type { JwtPayload } from "../auth/jwt.strategy";
export interface RegisterDto {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
}
export interface LoginDto {
    email: string;
    password: string;
}
export declare class UsersService {
    private readonly prisma;
    private readonly jwt;
    private readonly rabbit;
    private readonly walletProvision;
    constructor(prisma: PrismaService, jwt: JwtService, rabbit: RabbitMqService, walletProvision: WalletProvisionService);
    private hashToken;
    private signAccessToken;
    private mapPersistenceError;
    register(dto: RegisterDto): Promise<{
        accessToken: string;
        user: Record<string, unknown>;
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        user: Record<string, unknown>;
    }>;
    sanitizeUser(user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        role: string;
        emailVerified: boolean;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }, emailVerificationToken?: string): Record<string, unknown>;
    listUsers(): Promise<Record<string, unknown>[]>;
    getUser(actor: JwtPayload, id: string): Promise<Record<string, unknown>>;
    updateUser(actor: JwtPayload, id: string, data: {
        firstName?: string;
        lastName?: string;
        phone?: string;
    }): Promise<Record<string, unknown>>;
    forgotPassword(email: string): Promise<{
        message: string;
        resetToken?: string;
    }>;
    resetPassword(token: string, password: string): Promise<{
        message: string;
    }>;
    getProfile(actor: JwtPayload, userId: string): Promise<Record<string, unknown>>;
    updateProfile(actor: JwtPayload, userId: string, data: {
        dateOfBirth?: string;
        address?: string;
        city?: string;
        country?: string;
        metadata?: Prisma.InputJsonValue;
    }): Promise<Record<string, unknown>>;
    verifyEmail(token: string): Promise<{
        message: string;
    }>;
}
