"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAdminAuth } from "@/lib/auth-store";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  AlertCircle,
  Clock,
} from "lucide-react";

export default function AdminTransactions() {
  const token = useAdminAuth((s) => s.token);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<"all" | "deposit" | "withdrawal">("all");
  const pageSize = 15;

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
      >("/wallets/admin/transactions?take=1000", { token: token! }),
  });

  const filteredTxs = txs.data
    ?.filter((t) => {
      const matchesSearch =
        t.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "all" || t.type.toLowerCase() === typeFilter;
      return matchesSearch && matchesType;
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const paginatedTxs = filteredTxs?.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = filteredTxs ? Math.ceil(filteredTxs.length / pageSize) : 0;

  const getTransactionIcon = (type: string) => {
    return type.toLowerCase() === "deposit" ? (
      <ArrowDownLeft size={18} className="text-emerald-400" />
    ) : (
      <ArrowUpRight size={18} className="text-orange-400" />
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return {
          icon: <Check size={14} />,
          bg: "bg-emerald-500/10",
          text: "text-emerald-400",
          border: "border-emerald-500/30",
        };
      case "pending":
        return {
          icon: <Clock size={14} />,
          bg: "bg-amber-500/10",
          text: "text-amber-400",
          border: "border-amber-500/30",
        };
      case "failed":
        return {
          icon: <AlertCircle size={14} />,
          bg: "bg-red-500/10",
          text: "text-red-400",
          border: "border-red-500/30",
        };
      default:
        return {
          icon: null,
          bg: "bg-slate-500/10",
          text: "text-slate-400",
          border: "border-slate-500/30",
        };
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Transactions</h2>
        <p className="text-slate-400">Monitor all wallet transactions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={20} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by user ID or transaction ID..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg focus:outline-none focus:border-amber-400 text-white placeholder-slate-500 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {["all", "deposit", "withdrawal"].map((type) => (
            <button
              key={type}
              onClick={() => {
                setTypeFilter(type as any);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                typeFilter === type
                  ? "bg-amber-400 text-slate-900"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300"
              }`}
            >
              {type === "all" ? "All" : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-800 border-b border-slate-700">
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                  Transaction
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Type</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                  Amount
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                  User
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Date</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTxs?.map((t) => {
                const statusBadge = getStatusBadge(t.status);
                return (
                  <tr
                    key={t.id}
                    className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="font-mono text-sm text-slate-300">{t.id.slice(0, 8)}...</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getTransactionIcon(t.type)}
                        <span className="font-medium text-white">
                          {t.type.charAt(0).toUpperCase() + t.type.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono font-semibold text-white">
                        {t.amount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-mono text-sm text-slate-400">{t.userId.slice(0, 8)}...</p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-medium ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
                      >
                        {statusBadge.icon}
                        {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-800/50">
          <div className="text-sm text-slate-400">
            Showing <span className="font-semibold text-white">{(page - 1) * pageSize + 1}</span>{" "}
            to{" "}
            <span className="font-semibold text-white">
              {Math.min(page * pageSize, filteredTxs?.length || 0)}
            </span>{" "}
            of <span className="font-semibold text-white">{filteredTxs?.length || 0}</span> transactions
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setPage(i + 1)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    page === i + 1
                      ? "bg-amber-400 text-slate-900"
                      : "hover:bg-slate-700 text-slate-300"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {!paginatedTxs?.length && !txs.isLoading && (
        <div className="text-center py-12">
          <p className="text-slate-400">No transactions found</p>
        </div>
      )}
    </div>
  );
}
