import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import * as amqp from "amqplib";
import type { DomainEvent } from "@infiwallet/types";

const EXCHANGE = "infiwallet.events";

@Injectable()
export class RabbitMqService implements OnModuleInit, OnModuleDestroy {
  /**
   * amqplib typings differ across versions (Connection vs ChannelModel).
   * We store only the small surface we need.
   */
  private connection: { createConfirmChannel: () => Promise<amqp.ConfirmChannel>; close: () => Promise<void> } | null =
    null;
  private channel: amqp.ConfirmChannel | null = null;

  async onModuleInit(): Promise<void> {
    const url = process.env.RABBITMQ_URL;
    if (!url) {
      return;
    }
    const conn = (await amqp.connect(url)) as unknown as {
      createConfirmChannel: () => Promise<amqp.ConfirmChannel>;
      close: () => Promise<void>;
    };
    this.connection = conn;
    const ch = await conn.createConfirmChannel();
    await ch.assertExchange(EXCHANGE, "topic", { durable: true });
    this.channel = ch;
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
  }

  async publishEvent(routingKey: string, event: DomainEvent): Promise<void> {
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

  isEnabled(): boolean {
    return this.channel !== null;
  }
}
