"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { useAdminAuth } from "@/lib/auth-store";

export default function AdminUsers() {
  const router = useRouter();
  const token = useAdminAuth((s) => s.token);

  useEffect(() => {
    if (!token) router.replace("/admin/login");
  }, [token, router]);

  const users = useQuery({
    queryKey: ["admin-users"],
    enabled: !!token,
    queryFn: () =>
      apiFetch<Array<{ id: string; email: string; role: string; createdAt: string }>>("/users", { token: token! }),
  });

  if (!token) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-semibold">Users</h1>
        <Link href="/admin/dashboard" className="text-amber-400 text-sm">
          Back
        </Link>
      </div>
      <div className="rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Role</th>
              <th className="text-left p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {users.data?.map((u) => (
              <tr key={u.id} className="border-t border-slate-800">
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.role}</td>
                <td className="p-3 text-slate-500">{new Date(u.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
