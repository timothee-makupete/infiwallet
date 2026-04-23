"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAdminAuth } from "@/lib/auth-store";
import { CheckCircle2, XCircle, Clock, User, Calendar, Filter } from "lucide-react";

export default function AdminKyc() {
  const token = useAdminAuth((s) => s.token);
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  const queue = useQuery({
    queryKey: ["kyc-queue"],
    enabled: !!token,
    queryFn: () =>
      apiFetch<Array<{ id: string; userId: string; tier: number; status: string; createdAt: string }>>(
        "/kyc/admin/queue",
        { token: token! }
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

  const filteredQueue = queue.data?.filter(
    (v) => filter === "all" || v.status.toLowerCase() === filter
  );

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "approved":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "rejected":
        return "bg-red-500/10 text-red-400 border-red-500/30";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/30";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return <CheckCircle2 size={16} />;
      case "rejected":
        return <XCircle size={16} />;
      case "pending":
        return <Clock size={16} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">KYC Verifications</h2>
        <p className="text-slate-400">Review and manage user KYC submissions</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {["all", "pending", "approved", "rejected"].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status as any)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
              filter === status
                ? "bg-amber-400 text-slate-900"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300"
            }`}
          >
            <Filter size={16} />
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* KYC Queue */}
      <div className="space-y-3">
        {filteredQueue?.map((v) => (
          <div
            key={v.id}
            className="bg-slate-900 border border-slate-800 rounded-lg p-6 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-sm font-bold text-white">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="font-mono text-xs text-slate-500">{v.id}</p>
                    <p className="font-semibold text-white">User {v.userId.slice(0, 8)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-slate-400 text-xs">KYC Tier</span>
                    <p className="font-semibold text-white text-base">{v.tier}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs">Status</span>
                    <p className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium mt-1 ${getStatusColor(
                      v.status
                    )}`}>
                      {getStatusIcon(v.status)}
                      {v.status.charAt(0).toUpperCase() + v.status.slice(1)}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs">Submitted</span>
                    <p className="font-semibold text-white text-sm flex items-center gap-1 mt-1">
                      <Calendar size={14} />
                      {new Date(v.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
              {v.status.toLowerCase() === "pending" && (
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    type="button"
                    disabled={review.isPending}
                    className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center gap-2"
                    onClick={() => review.mutate({ id: v.id, status: "approved" })}
                  >
                    <CheckCircle2 size={16} />
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={review.isPending}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center gap-2"
                    onClick={() => review.mutate({ id: v.id, status: "rejected" })}
                  >
                    <XCircle size={16} />
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {!filteredQueue?.length && !queue.isLoading && (
          <div className="text-center py-12 bg-slate-900 rounded-lg border border-slate-800">
            <p className="text-slate-400">No {filter === "all" ? "KYC" : filter} submissions found</p>
          </div>
        )}
      </div>
    </div>
  );
}
