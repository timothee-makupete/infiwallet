"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { useAdminAuth } from "@/lib/auth-store";

export default function AdminTransactions() {
  const router = useRouter();
  const token = useAdminAuth((s) => s.token);

  useEffect(() => {
    if (!token) router.replace("/admin/login");
  }, [token, router]);

  const txs = useQuery({
    queryKey: ["admin-txs"],
    enabled: !!token,
    queryFn: () =>
      apiFetch<
        Array<{
          id: string;
          type: string;
          amount: number;
          userId: string;
          createdAt: string;
          status: string;
        }>
      >("/wallets/admin/transactions?take=100", { token: token! }),
  });

  if (!token) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-semibold">Transactions</h1>
        <Link href="/admin/dashboard" className="text-amber-400 text-sm">
          Back
        </Link>
      </div>
      <div className="rounded-2xl border border-slate-800 overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="text-left p-3">User</th>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Amount</th>
              <th className="text-left p-3">When</th>
            </tr>
          </thead>
          <tbody>
            {txs.data?.map((t) => (
              <tr key={t.id} className="border-t border-slate-800">
                <td className="p-3 font-mono text-xs">{t.userId}</td>
                <td className="p-3">{t.type}</td>
                <td className="p-3 font-mono">{t.amount.toLocaleString()}</td>
                <td className="p-3 text-slate-500">{new Date(t.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
