"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/lib/auth-store";
import { useNotificationStore } from "@/lib/stores/notification-store";

interface EventHandlers {
  onBalanceCredited?: (payload: unknown) => void;
  onBalanceDebited?: (payload: unknown) => void;
  onTransactionCreated?: (payload: unknown) => void;
  onKycApproved?: (payload: unknown) => void;
  onKycRejected?: (payload: unknown) => void;
}

export function useWebSocket(events: EventHandlers = {}) {
  const token = useAuthStore((s) => s.token);
  const push = useNotificationStore((s) => s.push);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }
    const wsBase = process.env.NEXT_PUBLIC_WS_URL ?? (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3018");
    const socket = io(wsBase, {
      transports: ["websocket", "polling"],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      push({ type: "info", title: "Live updates connected" });
    });
    socket.on("disconnect", () => {
      push({ type: "info", title: "Live updates disconnected" });
    });
    socket.on("wallet.balance.credited", (payload: unknown) => {
      push({ type: "success", title: "Deposit received", description: "Wallet balance updated." });
      events.onBalanceCredited?.(payload);
    });
    socket.on("wallet.balance.debited", (payload: unknown) => {
      push({ type: "info", title: "Withdrawal processed", description: "Wallet balance updated." });
      events.onBalanceDebited?.(payload);
    });
    socket.on("wallet.transaction.created", (payload: unknown) => {
      events.onTransactionCreated?.(payload);
    });
    socket.on("kyc.verification.approved", (payload: unknown) => {
      push({ type: "success", title: "KYC approved", description: "Your verification has been approved." });
      events.onKycApproved?.(payload);
    });
    socket.on("kyc.verification.rejected", (payload: unknown) => {
      push({ type: "error", title: "KYC rejected", description: "Please review and resubmit your documents." });
      events.onKycRejected?.(payload);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [
    token,
    push,
    events.onBalanceCredited,
    events.onBalanceDebited,
    events.onKycApproved,
    events.onKycRejected,
    events.onTransactionCreated,
  ]);
}
