"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const utils_1 = require("@infiwallet/utils");
const types_1 = require("@infiwallet/types");
const bcrypt = require("bcrypt");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
const rabbitmq_service_1 = require("../events/rabbitmq.service");
const wallet_provision_service_1 = require("../wallet/wallet-provision.service");
const BCRYPT_ROUNDS = 12;
let UsersService = class UsersService {
    prisma;
    jwt;
    rabbit;
    walletProvision;
    constructor(prisma, jwt, rabbit, walletProvision) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.rabbit = rabbit;
        this.walletProvision = walletProvision;
    }
    hashToken(token) {
        return (0, crypto_1.createHash)("sha256").update(token).digest("hex");
    }
    async signAccessToken(userId, email, role) {
        const payload = {
            sub: userId,
            email,
            role: role,
        };
        return this.jwt.signAsync(payload);
    }
    mapPersistenceError(err) {
        const msg = String(err);
        if (msg.includes("Environment variable not found: DATABASE_URL")) {
            throw new common_1.ServiceUnavailableException("DATABASE_URL is missing in user-service environment");
        }
        if (msg.includes("P1001")) {
            throw new common_1.ServiceUnavailableException("Cannot connect to database. Check Postgres and DATABASE_URL.");
        }
        if (msg.includes("P2021") || msg.toLowerCase().includes("table") && msg.toLowerCase().includes("does not exist")) {
            throw new common_1.InternalServerErrorException("Database schema is not applied. Run prisma db push for user-service.");
        }
        throw new common_1.InternalServerErrorException("Database operation failed");
    }
    async register(dto) {
        let existing;
        try {
            existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
        }
        catch (err) {
            this.mapPersistenceError(err);
        }
        if (existing) {
            throw new common_1.ConflictException("Email already registered");
        }
        const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
        const correlationId = (0, crypto_1.randomBytes)(8).toString("hex");
        let user;
        try {
            user = await this.prisma.$transaction(async (tx) => {
                const u = await tx.user.create({
                    data: {
                        email: dto.email,
                        passwordHash,
                        firstName: dto.firstName,
                        lastName: dto.lastName,
                        phone: dto.phone,
                        profile: { create: {} },
                    },
                });
                const rawToken = (0, crypto_1.randomBytes)(32).toString("hex");
                await tx.emailVerificationToken.create({
                    data: {
                        userId: u.id,
                        tokenHash: this.hashToken(rawToken),
                        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
                    },
                });
                return { u, emailVerificationToken: rawToken };
            });
        }
        catch (err) {
            this.mapPersistenceError(err);
        }
        try {
            await this.walletProvision.provisionForNewUser(user.u.id);
        }
        catch (err) {
            try {
                await this.prisma.emailVerificationToken.deleteMany({ where: { userId: user.u.id } });
                await this.prisma.user.delete({ where: { id: user.u.id } });
            }
            catch {
            }
            throw err;
        }
        const accessToken = await this.signAccessToken(user.u.id, user.u.email, user.u.role);
        const event = (0, utils_1.createDomainEvent)(types_1.EVENT_TYPES.USER_CREATED, user.u.id, {
            userId: user.u.id,
            email: user.u.email,
            firstName: user.u.firstName,
            lastName: user.u.lastName,
        }, { correlationId, userId: user.u.id, service: "user-service" });
        await this.rabbit.publishEvent("user.created", event).catch(() => undefined);
        return {
            accessToken,
            user: this.sanitizeUser(user.u, user.emailVerificationToken),
        };
    }
    async login(dto) {
        let user;
        try {
            user = await this.prisma.user.findUnique({ where: { email: dto.email } });
        }
        catch (err) {
            this.mapPersistenceError(err);
        }
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException("Invalid credentials");
        }
        const ok = await bcrypt.compare(dto.password, user.passwordHash);
        if (!ok) {
            throw new common_1.UnauthorizedException("Invalid credentials");
        }
        const accessToken = await this.signAccessToken(user.id, user.email, user.role);
        return { accessToken, user: this.sanitizeUser(user) };
    }
    sanitizeUser(user, emailVerificationToken) {
        const base = {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            role: user.role,
            emailVerified: user.emailVerified,
            isActive: user.isActive,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
        };
        if (process.env.NODE_ENV !== "production" && emailVerificationToken) {
            base.emailVerificationToken = emailVerificationToken;
        }
        return base;
    }
    async listUsers() {
        const rows = await this.prisma.user.findMany({
            orderBy: { createdAt: "desc" },
            take: 200,
        });
        return rows.map((u) => this.sanitizeUser(u));
    }
    async getUser(actor, id) {
        if (actor.sub !== id && actor.role === "USER") {
            throw new common_1.ForbiddenException();
        }
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException("User not found");
        return this.sanitizeUser(user);
    }
    async updateUser(actor, id, data) {
        if (actor.sub !== id && !["ADMIN", "SUPER_ADMIN"].includes(actor.role)) {
            throw new common_1.ForbiddenException();
        }
        const user = await this.prisma.user.update({
            where: { id },
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                phone: data.phone,
            },
        });
        const event = (0, utils_1.createDomainEvent)(types_1.EVENT_TYPES.USER_UPDATED, user.id, { userId: user.id, changes: data }, {
            correlationId: (0, crypto_1.randomBytes)(8).toString("hex"),
            userId: user.id,
            service: "user-service",
        });
        await this.rabbit.publishEvent("user.updated", event).catch(() => undefined);
        return this.sanitizeUser(user);
    }
    async forgotPassword(email) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) {
            return { message: "If the email exists, instructions were sent." };
        }
        await this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
        const raw = (0, crypto_1.randomBytes)(32).toString("hex");
        await this.prisma.passwordResetToken.create({
            data: {
                userId: user.id,
                tokenHash: this.hashToken(raw),
                expiresAt: new Date(Date.now() + 1000 * 60 * 60),
            },
        });
        const message = "If the email exists, instructions were sent.";
        if (process.env.NODE_ENV !== "production") {
            return { message, resetToken: raw };
        }
        return { message };
    }
    async resetPassword(token, password) {
        const hash = this.hashToken(token);
        const row = await this.prisma.passwordResetToken.findFirst({
            where: { tokenHash: hash, expiresAt: { gt: new Date() } },
        });
        if (!row) {
            throw new common_1.UnauthorizedException("Invalid or expired token");
        }
        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: row.userId },
                data: { passwordHash },
            }),
            this.prisma.passwordResetToken.delete({ where: { id: row.id } }),
        ]);
        return { message: "Password updated" };
    }
    async getProfile(actor, userId) {
        if (actor.sub !== userId && actor.role === "USER") {
            throw new common_1.ForbiddenException();
        }
        const profile = await this.prisma.userProfile.findUnique({
            where: { userId },
            include: { user: true },
        });
        if (!profile)
            throw new common_1.NotFoundException();
        return {
            id: profile.id,
            userId: profile.userId,
            dateOfBirth: profile.dateOfBirth?.toISOString().slice(0, 10) ?? null,
            address: profile.address,
            city: profile.city,
            country: profile.country,
            metadata: profile.metadata,
            updatedAt: profile.updatedAt.toISOString(),
        };
    }
    async updateProfile(actor, userId, data) {
        if (actor.sub !== userId && !["ADMIN", "SUPER_ADMIN"].includes(actor.role)) {
            throw new common_1.ForbiddenException();
        }
        const dob = data.dateOfBirth && data.dateOfBirth.length > 0 ? new Date(`${data.dateOfBirth}T00:00:00.000Z`) : undefined;
        const profile = await this.prisma.userProfile.update({
            where: { userId },
            data: {
                dateOfBirth: dob === undefined ? undefined : dob,
                address: data.address,
                city: data.city,
                country: data.country,
                metadata: data.metadata === undefined ? undefined : data.metadata,
            },
        });
        const event = (0, utils_1.createDomainEvent)(types_1.EVENT_TYPES.USER_UPDATED, userId, { userId, profile: true }, {
            correlationId: (0, crypto_1.randomBytes)(8).toString("hex"),
            userId,
            service: "user-service",
        });
        await this.rabbit.publishEvent("user.updated", event).catch(() => undefined);
        return {
            id: profile.id,
            userId: profile.userId,
            dateOfBirth: profile.dateOfBirth?.toISOString().slice(0, 10) ?? null,
            address: profile.address,
            city: profile.city,
            country: profile.country,
            metadata: profile.metadata,
            updatedAt: profile.updatedAt.toISOString(),
        };
    }
    async verifyEmail(token) {
        const hash = this.hashToken(token);
        const row = await this.prisma.emailVerificationToken.findFirst({
            where: { tokenHash: hash, expiresAt: { gt: new Date() } },
        });
        if (!row) {
            throw new common_1.UnauthorizedException("Invalid or expired token");
        }
        const user = await this.prisma.user.update({
            where: { id: row.userId },
            data: { emailVerified: true },
        });
        await this.prisma.emailVerificationToken.delete({ where: { id: row.id } });
        const event = (0, utils_1.createDomainEvent)(types_1.EVENT_TYPES.USER_EMAIL_VERIFIED, user.id, { userId: user.id, email: user.email }, {
            correlationId: (0, crypto_1.randomBytes)(8).toString("hex"),
            userId: user.id,
            service: "user-service",
        });
        await this.rabbit.publishEvent("user.email_verified", event).catch(() => undefined);
        return { message: "Email verified" };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        rabbitmq_service_1.RabbitMqService,
        wallet_provision_service_1.WalletProvisionService])
], UsersService);
//# sourceMappingURL=users.service.js.map