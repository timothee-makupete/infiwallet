import { randomUUID } from "crypto";
import type { DomainEvent, DomainEventMetadata } from "@infiwallet/types";

export function createDomainEvent<T extends Record<string, unknown>>(
  eventType: string,
  aggregateId: string,
  payload: T,
  metadata: Omit<DomainEventMetadata, "service"> & { service: string },
  version = "1.0",
): DomainEvent<T> {
  return {
    eventId: randomUUID(),
    eventType,
    timestamp: new Date().toISOString(),
    version,
    aggregateId,
    payload,
    metadata: {
      correlationId: metadata.correlationId,
      causationId: metadata.causationId,
      userId: metadata.userId,
      service: metadata.service,
    },
  };
}

export function parseMoney(amount: string | number): number {
  if (typeof amount === "number") return Math.round(amount * 100) / 100;
  return Math.round(parseFloat(String(amount)) * 100) / 100;
}
