"use client";

import { motion } from "framer-motion";
import { ArrowDownToLine, ArrowUpFromLine, Copy, CreditCard, QrCode } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { useNotificationStore } from "@/lib/stores/notification-store";

interface KycVerification {
  id: string;
  tier: number;
  status: "pending" | "approved" | "rejected";
}

interface TierLimits {
  tier: number;
  dailyLimit: number;
  monthlyLimit: number;
  singleTransactionLimit: number;
}

interface Tx {
  id: string;
  amount: number;
  createdAt: string;
  status: string;
}

export default function WalletPage() {
  const router = useRouter();
  const { token, userId, hydrated } = useAuthStore();
  const qc = useQueryClient();
  const push = useNotificationStore((s) => s.push);
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (!hydrated) return;
    if (!token || !userId) router.replace("/login");
  }, [hydrated, token, userId, router]);

  const wallet = useQuery({
    queryKey: ["wallet", userId],
    enabled: !!token && !!userId,
    queryFn: () =>
      apiFetch<{ id: string; balance: number; currency: string; status: string }>(`/wallets/${userId}`, {
        token: token!,
      }),
  });

  const txs = useQuery({
    queryKey: ["tx", userId, "wallet-page"],
    enabled: !!token && !!userId,
    queryFn: () => apiFetch<Array<Tx>>(`/wallets/${userId}/transactions?take=300`, { token: token! }),
  });

  const kycList = useQuery({
    queryKey: ["kyc", userId],
    enabled: !!token && !!userId,
    queryFn: () => apiFetch<Array<KycVerification>>(`/kyc/${userId}`, { token: token! }),
  });

  const activeTier = useMemo(() => {
    const rows = kycList.data ?? [];
    const approved = rows.filter((x) => x.status === "approved").sort((a, b) => b.tier - a.tier)[0];
    return approved?.tier ?? rows[0]?.tier ?? 1;
  }, [kycList.data]);

  const limits = useQuery({
    queryKey: ["kyc-limits", activeTier],
    enabled: !!token && !!userId,
    queryFn: () => apiFetch<TierLimits>(`/kyc/limits/${activeTier}`, { token: token! }),
  });

  const used = useMemo(() => {
    const rows = (txs.data ?? []).filter((t) => t.status.toLowerCase() === "completed");
    const now = new Date();
    const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const daily = rows
      .filter((t) => new Date(t.createdAt).getTime() >= startDay)
      .reduce((acc, t) => acc + t.amount, 0);
    const monthly = rows
      .filter((t) => new Date(t.createdAt).getTime() >= startMonth)
      .reduce((acc, t) => acc + t.amount, 0);
    return { daily, monthly };
  }, [txs.data]);

  const deposit = useMutation({
    mutationFn: () =>
      apiFetch(`/wallets/${userId}/deposits`, {
        method: "POST",
        token: token!,
        body: JSON.stringify({ amount: parseFloat(amount) }),
      }),
    onSuccess: () => {
      push({ type: "success", title: "Deposit successful" });
      setAmount("");
      void qc.invalidateQueries({ queryKey: ["wallet", userId] });
      void qc.invalidateQueries({ queryKey: ["tx", userId] });
      void qc.invalidateQueries({ queryKey: ["balance", userId] });
    },
  });

  const withdraw = useMutation({
    mutationFn: () =>
      apiFetch(`/wallets/${userId}/withdrawals`, {
        method: "POST",
        token: token!,
        body: JSON.stringify({ amount: parseFloat(amount) }),
      }),
    onSuccess: () => {
      push({ type: "info", title: "Withdrawal successful" });
      setAmount("");
      void qc.invalidateQueries({ queryKey: ["wallet", userId] });
      void qc.invalidateQueries({ queryKey: ["tx", userId] });
      void qc.invalidateQueries({ queryKey: ["balance", userId] });
    },
  });

  if (!hydrated) return null;
  if (!token || !userId) return null;

  return (
    <Shell>
      <h1 className="mb-6 text-3xl font-semibold">Wallet</h1>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-gradient-to-br from-surface via-surface-elevated to-surface p-6 shadow-glow"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">Digital wallet card</p>
            <CreditCard size={16} className="text-primary" />
          </div>
          <p className="mt-4 text-xs tracking-[0.3em] text-muted">**** **** **** 1234</p>
          <p className="mt-6 font-[var(--font-mono)] text-4xl font-semibold text-primary">
            {wallet.data ? `${wallet.data.balance.toLocaleString()} ${wallet.data.currency}` : "..."}
          </p>
          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-elevated px-3 py-2 text-sm"
              onClick={() => {
                navigator.clipboard.writeText(wallet.data?.id ?? "");
                push({ type: "info", title: "Wallet ID copied" });
              }}
            >
              <Copy size={14} />
              Copy wallet ID
            </button>
            <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-elevated px-3 py-2 text-sm">
              <QrCode size={14} />
              Show QR
            </button>
          </div>
        </motion.div>

        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold">Quick actions</h2>
          <div className="mt-4">
            <label className="mb-1 block text-sm text-muted">Amount</label>
            <input
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 font-[var(--font-mono)]"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              min="0"
              step="0.01"
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-50"
              disabled={deposit.isPending || !amount}
              onClick={() => deposit.mutate()}
            >
              <ArrowDownToLine size={15} />
              Deposit
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-surface-elevated py-2.5 text-sm font-medium disabled:opacity-50"
              disabled={withdraw.isPending || !amount}
              onClick={() => withdraw.mutate()}
            >
              <ArrowUpFromLine size={15} />
              Withdraw
            </button>
          </div>
          {(deposit.isError || withdraw.isError) && (
            <p className="mt-3 text-sm text-error">
              {(deposit.error as Error)?.message || (withdraw.error as Error)?.message}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-muted">Daily limit used</p>
          <p className="mt-2 font-[var(--font-mono)] text-lg">
            {used.daily.toLocaleString()} / {(limits.data?.dailyLimit ?? 0).toLocaleString()} MWK
          </p>
          <div className="mt-2 h-2 rounded-full bg-surface-elevated">
            <div
              className="h-2 rounded-full bg-secondary"
              style={{
                width: `${limits.data?.dailyLimit ? Math.min(100, (used.daily / limits.data.dailyLimit) * 100) : 0}%`,
              }}
            />
          </div>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-muted">Monthly limit used</p>
          <p className="mt-2 font-[var(--font-mono)] text-lg">
            {used.monthly.toLocaleString()} / {(limits.data?.monthlyLimit ?? 0).toLocaleString()} MWK
          </p>
          <div className="mt-2 h-2 rounded-full bg-surface-elevated">
            <div
              className="h-2 rounded-full bg-accent"
              style={{
                width: `${limits.data?.monthlyLimit ? Math.min(100, (used.monthly / limits.data.monthlyLimit) * 100) : 0}%`,
              }}
            />
          </div>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-muted">Single transaction limit</p>
          <p className="mt-2 font-[var(--font-mono)] text-lg">{(limits.data?.singleTransactionLimit ?? 0).toLocaleString()} MWK</p>
          <button 
            type="button" 
            onClick={() => router.push("/kyc")}
            className="mt-3 rounded-xl bg-secondary px-3 py-2 text-sm text-white"
          >
            Upgrade KYC
          </button>
        </div>
      </div>
    </Shell>
  );
}