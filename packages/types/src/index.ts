export type UserRole = "USER" | "ADMIN" | "SUPER_ADMIN";

export interface DomainEventMetadata {
  correlationId: string;
  causationId?: string;
  userId?: string;
  service: string;
}

export interface DomainEvent<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  eventId: string;
  eventType: string;
  timestamp: string;
  version: string;
  aggregateId: string;
  payload: TPayload;
  metadata: DomainEventMetadata;
}

export const EVENT_TYPES = {
  USER_CREATED: "user.created",
  USER_UPDATED: "user.updated",
  USER_EMAIL_VERIFIED: "user.email_verified",
  WALLET_CREATED: "wallet.created",
  WALLET_BALANCE_CREDITED: "wallet.balance.credited",
  WALLET_BALANCE_DEBITED: "wallet.balance.debited",
  WALLET_TRANSACTION_CREATED: "wallet.transaction.created",
  KYC_VERIFICATION_SUBMITTED: "kyc.verification.submitted",
  KYC_VERIFICATION_APPROVED: "kyc.verification.approved",
  KYC_VERIFICATION_REJECTED: "kyc.verification.rejected",
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];
