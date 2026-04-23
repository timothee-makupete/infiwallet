"use client";

import { motion } from "framer-motion";
import { Eye, EyeOff, ShieldCheck, TrendingUp, Wallet2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Shell } from "@/components/Shell";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { useWebSocket } from "@/lib/hooks/use-websocket";

interface Tx {
  id: string;
  type: string;
  amount: number;
  createdAt: string;
  status: string;
  reference: string;
}

interface KycVerification {
  id: string;
  tier: number;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

interface TierLimits {
  tier: number;
  dailyLimit: number;
  monthlyLimit: number;
  singleTransactionLimit: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { token, userId, hydrated } = useAuthStore();
  const queryClient = useQueryClient();
  const [showBalance, setShowBalance] = useState(true);
  const [range, setRange] = useState<"7D" | "30D">("7D");

  useEffect(() => {
    if (!hydrated) return;
    if (!token || !userId) router.replace("/login");
  }, [hydrated, token, userId, router]);

  useWebSocket({
    onBalanceCredited: () => {
      void queryClient.invalidateQueries({ queryKey: ["balance", userId] });
      void queryClient.invalidateQueries({ queryKey: ["wallet", userId] });
    },
    onBalanceDebited: () => {
      void queryClient.invalidateQueries({ queryKey: ["balance", userId] });
      void queryClient.invalidateQueries({ queryKey: ["wallet", userId] });
    },
    onTransactionCreated: () => {
      void queryClient.invalidateQueries({ queryKey: ["tx", userId] });
    },
    onKycApproved: () => {
      void queryClient.invalidateQueries({ queryKey: ["kyc", userId] });
    },
    onKycRejected: () => {
      void queryClient.invalidateQueries({ queryKey: ["kyc", userId] });
    },
  });

  const balance = useQuery({
    queryKey: ["balance", userId],
    enabled: !!token && !!userId,
    queryFn: () =>
      apiFetch<{ balance: number; currency: string }>(`/wallets/${userId}/balance`, { token: token! }),
    refetchInterval: 10_000,
  });

  const txs = useQuery({
    queryKey: ["tx", userId],
    enabled: !!token && !!userId,
    queryFn: () => apiFetch<Array<Tx>>(`/wallets/${userId}/transactions?take=200`, { token: token! }),
    refetchInterval: 15_000,
  });

  const kycList = useQuery({
    queryKey: ["kyc", userId],
    enabled: !!token && !!userId,
    queryFn: () => apiFetch<Array<KycVerification>>(`/kyc/${userId}`, { token: token! }),
  });

  const activeTier = useMemo(() => {
    const rows = kycList.data ?? [];
    const approved = rows.filter((x) => x.status === "approved").sort((a, b) => b.tier - a.tier)[0];
    if (approved) return approved.tier;
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.tier ?? 1;
  }, [kycList.data]);

  const tierLimit = useQuery({
    queryKey: ["kyc-limit", activeTier],
    enabled: !!token && !!userId,
    queryFn: () => apiFetch<TierLimits>(`/kyc/limits/${activeTier}`, { token: token! }),
  });

  const completedTx = useMemo(
    () => (txs.data ?? []).filter((t) => t.status.toLowerCase() === "completed"),
    [txs.data],
  );

  const monthlyStats = useMemo(() => {
    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const monthRows = completedTx.filter((t) => new Date(t.createdAt).getTime() >= startMonth);
    const spent = monthRows
      .filter((t) => t.type === "WITHDRAWAL")
      .reduce((acc, t) => acc + t.amount, 0);
    const received = monthRows
      .filter((t) => t.type === "DEPOSIT")
      .reduce((acc, t) => acc + t.amount, 0);
    return { spent, received };
  }, [completedTx]);

  const chartData = useMemo(() => {
    const points = range === "7D" ? 7 : 30;
    const now = new Date();
    const map = new Map<string, number>();
    for (let i = points - 1; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      map.set(key, 0);
    }
    for (const tx of completedTx) {
      const key = new Date(tx.createdAt).toISOString().slice(0, 10);
      if (!map.has(key)) continue;
      const current = map.get(key) ?? 0;
      map.set(key, current + (tx.type === "DEPOSIT" ? tx.amount : -tx.amount));
    }
    let running = 0;
    const out = [...map.entries()].map(([k, delta]) => {
      running += delta;
      return {
        day: range === "7D" ? k.slice(5) : k.slice(8),
        value: running,
      };
    });
    return out;
  }, [completedTx, range]);

  if (!hydrated) return null;
  if (!token || !userId) return null;

  return (
    <Shell>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">Track balances, transactions, and verification status in real time.</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <motion.div layout className="glass rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted">Available balance</p>
              {balance.isLoading && <p className="mt-2 font-mono text-3xl">…</p>}
              {balance.data && (
                <p className="mt-2 font-[var(--font-mono)] text-4xl font-semibold text-primary">
                  {showBalance ? `${balance.data.balance.toLocaleString()} ${balance.data.currency}` : "••••••"}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowBalance((prev) => !prev)}
              className="rounded-full border border-border bg-surface-elevated p-2 text-muted hover:text-foreground"
            >
              {showBalance ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {["Deposit", "Withdraw", "Transfer", "Request"].map((action) => (
              <button
                key={action}
                type="button"
                className="rounded-xl border border-border bg-surface-elevated py-2 text-sm font-medium hover:bg-surface"
              >
                {action}
              </button>
            ))}
          </div>
          {balance.isError && <p className="mt-3 text-sm text-error">Wallet may still be provisioning…</p>}
        </motion.div>

        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">KYC status</p>
            <ShieldCheck size={16} className="text-secondary" />
          </div>
          <p className="mt-2 text-lg font-semibold">Tier {activeTier} - {(kycList.data?.[0]?.status ?? "pending").toUpperCase()}</p>
          <div className="mt-4 h-2 rounded-full bg-surface-elevated">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, (activeTier / 3) * 100)}%` }} />
          </div>
          <p className="mt-3 text-sm text-muted">
            Daily limit: {tierLimit.data ? `${tierLimit.data.dailyLimit.toLocaleString()} MWK` : "..."}
          </p>
          <button 
            type="button" 
            onClick={() => router.push("/kyc")}
            className="mt-4 w-full rounded-xl bg-secondary py-2.5 text-sm font-medium text-white"
          >
            Upgrade Now
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="glass rounded-2xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Balance trend</h2>
            <div className="flex gap-2">
              {(["7D", "30D"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs ${range === r ? "bg-primary text-white" : "bg-surface-elevated text-muted"}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="balanceFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fill: "hsl(var(--text-secondary))", fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "hsl(var(--text-secondary))", fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="url(#balanceFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h2 className="mb-3 text-lg font-semibold">Recent transactions</h2>
          <ul className="space-y-3 text-sm">
            {txs.data?.map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-xl bg-surface-elevated p-3">
                <div>
                  <p className="font-medium">{t.type}</p>
                  <p className="text-xs text-muted">{new Date(t.createdAt).toLocaleString()}</p>
                </div>
                <span className={`font-[var(--font-mono)] ${t.type === "DEPOSIT" ? "text-success" : "text-foreground"}`}>
                  {t.amount.toLocaleString()}
                </span>
              </li>
            ))}
            {!txs.data?.length && !txs.isLoading && <li className="text-muted">No transactions yet.</li>}
          </ul>
          <button type="button" className="mt-4 w-full rounded-xl border border-border py-2.5 text-sm">
            View all
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Monthly spend", value: `${monthlyStats.spent.toLocaleString()} MWK`, icon: Wallet2 },
          { label: "Incoming", value: `${monthlyStats.received.toLocaleString()} MWK`, icon: TrendingUp },
          {
            label: "Savings rate",
            value:
              monthlyStats.received > 0
                ? `${Math.max(0, Math.round(((monthlyStats.received - monthlyStats.spent) / monthlyStats.received) * 100))}%`
                : "0%",
            icon: TrendingUp,
          },
          {
            label: "Daily limit left",
            value: tierLimit.data
              ? `${Math.max(0, tierLimit.data.dailyLimit - completedTx
                  .filter((t) => new Date(t.createdAt).toDateString() === new Date().toDateString())
                  .reduce((acc, t) => acc + t.amount, 0)).toLocaleString()} MWK`
              : "...",
            icon: ShieldCheck,
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted">{stat.label}</p>
                <Icon size={14} className="text-primary" />
              </div>
              <p className="mt-2 font-[var(--font-mono)] text-lg font-semibold">{stat.value}</p>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}
