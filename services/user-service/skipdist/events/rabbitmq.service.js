"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RabbitMqService = void 0;
const common_1 = require("@nestjs/common");
const amqp = require("amqplib");
const EXCHANGE = "infiwallet.events";
let RabbitMqService = class RabbitMqService {
    connection = null;
    channel = null;
    async onModuleInit() {
        const url = process.env.RABBITMQ_URL;
        if (!url) {
            return;
        }
        const conn = (await amqp.connect(url));
        this.connection = conn;
        const ch = await conn.createConfirmChannel();
        await ch.assertExchange(EXCHANGE, "topic", { durable: true });
        this.channel = ch;
    }
    async onModuleDestroy() {
        await this.channel?.close().catch(() => undefined);
        await this.connection?.close().catch(() => undefined);
    }
    async publishEvent(routingKey, event) {
        if (!this.channel) {
            return;
        }
        const buf = Buffer.from(JSON.stringify(event));
        this.channel.publish(EXCHANGE, routingKey, buf, {
            persistent: true,
            contentType: "application/json",
        });
        await this.channel.waitForConfirms();
    }
    isEnabled() {
        return this.channel !== null;
    }
};
exports.RabbitMqService = RabbitMqService;
exports.RabbitMqService = RabbitMqService = __decorate([
    (0, common_1.Injectable)()
], RabbitMqService);
//# sourceMappingURL=rabbitmq.service.js.map