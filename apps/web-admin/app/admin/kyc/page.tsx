"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { useAdminAuth } from "@/lib/auth-store";

export default function AdminKyc() {
  const router = useRouter();
  const token = useAdminAuth((s) => s.token);
  const qc = useQueryClient();

  useEffect(() => {
    if (!token) router.replace("/admin/login");
  }, [token, router]);

  const queue = useQuery({
    queryKey: ["kyc-queue"],
    enabled: !!token,
    queryFn: () =>
      apiFetch<Array<{ id: string; userId: string; tier: number; status: string; createdAt: string }>>(
        "/kyc/admin/queue",
        { token: token! },
      ),
  });

  const review = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "approved" | "rejected" }) =>
      apiFetch(`/kyc/${id}/review`, {
        method: "PUT",
        token: token!,
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["kyc-queue"] }),
  });

  if (!token) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-semibold">KYC queue</h1>
        <Link href="/admin/dashboard" className="text-amber-400 text-sm">
          Back
        </Link>
      </div>
      <ul className="space-y-3">
        {queue.data?.map((v) => (
          <li key={v.id} className="rounded-xl border border-slate-800 p-4 flex flex-wrap justify-between gap-3">
            <div>
              <p className="font-mono text-xs text-slate-500">{v.id}</p>
              <p>
                User {v.userId} — Tier {v.tier}
              </p>
              <p className="text-slate-500 text-sm">{new Date(v.createdAt).toLocaleString()}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-sm"
                onClick={() => review.mutate({ id: v.id, status: "approved" })}
              >
                Approve
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg bg-red-900/80 hover:bg-red-800 text-sm"
                onClick={() => review.mutate({ id: v.id, status: "rejected" })}
              >
                Reject
              </button>
            </div>
          </li>
        ))}
        {!queue.data?.length && !queue.isLoading && <p className="text-slate-500">No pending items.</p>}
      </ul>
    </div>
  );
}
