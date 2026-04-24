import { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import type { DomainEvent } from "@infiwallet/types";
export declare class RabbitMqService implements OnModuleInit, OnModuleDestroy {
    private connection;
    private channel;
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    publishEvent(routingKey: string, event: DomainEvent): Promise<void>;
    isEnabled(): boolean;
}
