"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { useAdminAuth } from "@/lib/auth-store";

export default function AdminDashboard() {
  const router = useRouter();
  const token = useAdminAuth((s) => s.token);

  useEffect(() => {
    if (!token) router.replace("/admin/login");
  }, [token, router]);

  const health = useQuery({
    queryKey: ["health"],
    queryFn: () => apiFetch<{ status: string }>("/health", {}),
    enabled: !!token,
    refetchInterval: 30_000,
  });

  if (!token) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Admin overview</h1>
        <nav className="flex gap-3 text-sm">
          <Link className="text-amber-400 hover:underline" href="/admin/users">
            Users
          </Link>
          <Link className="text-amber-400 hover:underline" href="/admin/kyc">
            KYC queue
          </Link>
          <Link className="text-amber-400 hover:underline" href="/admin/transactions">
            Transactions
          </Link>
        </nav>
      </div>
      <div className="rounded-2xl border border-slate-800 p-6 bg-slate-900/40">
        <p className="text-slate-400 text-sm">API Gateway health</p>
        <p className="text-xl font-mono mt-2">{health.data?.status ?? (health.isLoading ? "…" : "unknown")}</p>
      </div>
    </div>
  );
}
