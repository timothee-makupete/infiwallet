import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import type { DomainEvent } from "@infiwallet/types";
import { WalletsService } from "../wallets/wallets.service";
import { RabbitMqService } from "./rabbitmq.service";

@Injectable()
export class UserCreatedConsumer implements OnModuleInit {
  private readonly log = new Logger(UserCreatedConsumer.name);

  constructor(
    private readonly wallets: WalletsService,
    private readonly rabbit: RabbitMqService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbit.consumeQueue("wallet.user.created", ["user.created"], (ev) =>
      this.handle(ev),
    );
  }

  private async handle(event: DomainEvent): Promise<void> {
    const userId = String((event.payload as { userId?: string }).userId ?? event.aggregateId);
    const { created } = await this.wallets.ensureWalletForUser(userId, {
      correlationId: event.metadata.correlationId,
      causationId: event.eventId,
    });
    if (created) {
      this.log.log(`Wallet created for user ${userId}`);
    }
  }
}
