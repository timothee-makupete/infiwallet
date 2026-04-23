"use client";

import { Download, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

interface Tx {
  id: string;
  type: string;
  amount: number;
  createdAt: string;
  status: string;
  reference: string;
}

export default function TransactionsPage() {
  const router = useRouter();
  const { token, userId, hydrated } = useAuthStore();
  const [filter, setFilter] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedTx, setSelectedTx] = useState<Tx | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!token || !userId) router.replace("/login");
  }, [hydrated, token, userId, router]);

  const txs = useQuery({
    queryKey: ["tx", userId],
    enabled: !!token && !!userId,
    queryFn: () => apiFetch<Array<Tx>>(`/wallets/${userId}/transactions?take=200`, { token: token! }),
    refetchInterval: 20_000,
  });

  const rows = useMemo(() => {
    return (txs.data ?? []).filter((t) => {
      const byType = filter === "all" ? true : t.type === filter;
      const byStatus = status === "all" ? true : t.status.toLowerCase() === status;
      const byQuery =
        search.length === 0
          ? true
          : `${t.reference} ${t.type}`.toLowerCase().includes(search.toLowerCase());
      return byType && byStatus && byQuery;
    });
  }, [txs.data, filter, status, search]);

  const exportCsv = () => {
    const header = "Reference,Type,Status,Amount,Created At\n";
    const csv = `${header}${rows
      .map((t) => `${t.reference},${t.type},${t.status},${t.amount},${new Date(t.createdAt).toISOString()}`)
      .join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "transactions.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!hydrated) return null;
  if (!token || !userId) return null;

  return (
    <Shell>
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-3xl font-semibold">Transactions</h1>
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-elevated px-3 py-2 text-sm"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      <div className="glass mb-4 flex flex-wrap items-center gap-3 rounded-2xl p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by reference..."
            className="w-full rounded-xl border border-border bg-surface px-9 py-2 text-sm"
          />
        </div>
        <select
          className="rounded-xl border border-border bg-surface px-3 py-2 text-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="DEPOSIT">Deposits</option>
          <option value="WITHDRAWAL">Withdrawals</option>
        </select>
        <select
          className="rounded-xl border border-border bg-surface px-3 py-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">Any status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-elevated text-muted">
            <tr>
              <th className="text-left p-3">Reference</th>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Amount</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">When</th>
            </tr>
          </thead>
          <tbody>
            {txs.isLoading
              ? Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={`sk-${idx}`} className="border-t border-border">
                    <td className="p-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-20" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-16" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-16" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-32" /></td>
                  </tr>
                ))
              : null}
            {rows.map((t) => (
              <tr key={t.id} className="border-t border-border hover:bg-surface-elevated/60 cursor-pointer" onClick={() => setSelectedTx(t)}>
                <td className="p-3 font-[var(--font-mono)] text-xs text-muted">{t.reference}</td>
                <td className="p-3">{t.type}</td>
                <td className={`p-3 font-[var(--font-mono)] ${t.type === "DEPOSIT" ? "text-success" : ""}`}>
                  {t.amount.toLocaleString()}
                </td>
                <td className="p-3">
                  <span className="rounded-full bg-surface-elevated px-2 py-1 text-xs">
                    {t.status}
                  </span>
                </td>
                <td className="p-3 text-muted">{new Date(t.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && !txs.isLoading && (
          <p className="p-6 text-center text-muted">No transactions found.</p>
        )}
      </div>

      <Dialog open={!!selectedTx} onOpenChange={(open) => !open && setSelectedTx(null)}>
        <DialogTrigger asChild>
          <span />
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transaction details</DialogTitle>
            <DialogDescription>View full metadata and receipt info.</DialogDescription>
          </DialogHeader>
          {selectedTx ? (
            <div className="space-y-3 text-sm">
              <div className="rounded-xl bg-surface-elevated p-3">
                <p className="text-xs text-muted">Reference</p>
                <p className="font-[var(--font-mono)]">{selectedTx.reference}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-surface-elevated p-3">
                  <p className="text-xs text-muted">Type</p>
                  <p>{selectedTx.type}</p>
                </div>
                <div className="rounded-xl bg-surface-elevated p-3">
                  <p className="text-xs text-muted">Status</p>
                  <p>{selectedTx.status}</p>
                </div>
              </div>
              <div className="rounded-xl bg-surface-elevated p-3">
                <p className="text-xs text-muted">Amount</p>
                <p className="font-[var(--font-mono)]">{selectedTx.amount.toLocaleString()}</p>
              </div>
              <div className="rounded-xl bg-surface-elevated p-3">
                <p className="text-xs text-muted">Created</p>
                <p>{new Date(selectedTx.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setSelectedTx(null)}>
                  Close
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
