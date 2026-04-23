"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAdminAuth } from "@/lib/auth-store";
import { Search, ChevronLeft, ChevronRight, Mail, Shield, Calendar } from "lucide-react";

export default function AdminUsers() {
  const token = useAdminAuth((s) => s.token);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const users = useQuery({
    queryKey: ["admin-users", page],
    enabled: !!token,
    queryFn: () =>
      apiFetch<Array<{ id: string; email: string; role: string; createdAt: string }>>("/users", {
        token: token!,
      }),
  });

  const filteredUsers = users.data?.filter((u) =>
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedUsers = filteredUsers?.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = filteredUsers ? Math.ceil(filteredUsers.length / pageSize) : 0;

  const getRoleColor = (role: string) => {
    switch (role.toUpperCase()) {
      case "ADMIN":
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "SUPER_ADMIN":
        return "bg-red-500/10 text-red-400 border-red-500/30";
      default:
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Users</h2>
        <p className="text-slate-400">Manage and monitor user accounts</p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={20} className="absolute left-3 top-3 text-slate-400" />
        <input
          type="text"
          placeholder="Search users by email..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
          className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg focus:outline-none focus:border-amber-400 text-white placeholder-slate-500 transition-colors"
        />
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-800 border-b border-slate-700">
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Role</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Created</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers?.map((u, i) => (
                <tr
                  key={u.id}
                  className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-sm font-bold text-slate-900">
                        {u.email[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-white">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-medium ${getRoleColor(
                        u.role
                      )}`}
                    >
                      <Shield size={14} />
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <Calendar size={14} />
                      {new Date(u.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="px-3 py-1 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-800/50">
          <div className="text-sm text-slate-400">
            Showing <span className="font-semibold text-white">{(page - 1) * pageSize + 1}</span> to{" "}
            <span className="font-semibold text-white">
              {Math.min(page * pageSize, filteredUsers?.length || 0)}
            </span>{" "}
            of <span className="font-semibold text-white">{filteredUsers?.length || 0}</span> users
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }).map((_, i) => (
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

      {!paginatedUsers?.length && !users.isLoading && (
        <div className="text-center py-12">
          <p className="text-slate-400">No users found</p>
        </div>
      )}
    </div>
  );
}
