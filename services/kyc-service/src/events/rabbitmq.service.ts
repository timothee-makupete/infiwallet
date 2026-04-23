import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import * as amqp from "amqplib";
import type { DomainEvent } from "@infiwallet/types";

const EXCHANGE = "infiwallet.events";

@Injectable()
export class RabbitMqService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(RabbitMqService.name);
  private connection: { createConfirmChannel: () => Promise<amqp.ConfirmChannel>; close: () => Promise<void> } | null =
    null;
  private channel: amqp.ConfirmChannel | null = null;

  async onModuleInit(): Promise<void> {
    const url = process.env.RABBITMQ_URL;
    if (!url) return;
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
    if (!this.channel) return;
    const buf = Buffer.from(JSON.stringify(event));
    this.channel.publish(EXCHANGE, routingKey, buf, {
      persistent: true,
      contentType: "application/json",
    });
    await this.channel.waitForConfirms();
  }

  async consumeQueue(
    queueName: string,
    routingKeys: string[],
    handler: (event: DomainEvent) => Promise<void>,
  ): Promise<void> {
    const url = process.env.RABBITMQ_URL;
    if (!url) {
      this.log.warn("RABBITMQ_URL not set; skipping consumer");
      return;
    }
    const conn = await amqp.connect(url);
    const ch = await conn.createChannel();
    await ch.assertExchange(EXCHANGE, "topic", { durable: true });
    const { queue } = await ch.assertQueue(queueName, { durable: true });
    for (const key of routingKeys) {
      await ch.bindQueue(queue, EXCHANGE, key);
    }
    await ch.consume(queue, async (msg) => {
      if (!msg) return;
      try {
        const parsed = JSON.parse(msg.content.toString()) as DomainEvent;
        await handler(parsed);
        ch.ack(msg);
      } catch (e) {
        this.log.error(String(e));
        ch.nack(msg, false, false);
      }
    });
  }
}
