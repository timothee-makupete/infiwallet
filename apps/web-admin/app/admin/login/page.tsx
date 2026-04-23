"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAdminAuth } from "@/lib/auth-store";
import { Lock, Mail, AlertCircle, Loader } from "lucide-react";

export default function AdminLogin() {
  const router = useRouter();
  const setToken = useAdminAuth((s) => s.setToken);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const res = await apiFetch<{ accessToken: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(res.accessToken);
      router.push("/admin/dashboard");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 mb-4 shadow-lg shadow-amber-500/30">
            <span className="text-2xl font-bold text-slate-900">IW</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">InfiWallet Admin</h1>
          <p className="text-slate-400">Enter your credentials to access the dashboard</p>
        </div>

        {/* Login Form */}
        <form onSubmit={submit} className="space-y-4">
          {/* Error Message */}
          {err && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400">
              <AlertCircle size={18} className="flex-shrink-0" />
              <span className="text-sm font-medium">{err}</span>
            </div>
          )}

          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
            <div className="relative">
              <Mail
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500"
              />
              <input
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-900 border border-slate-800 focus:border-amber-400 focus:outline-none text-white placeholder-slate-500 transition-colors"
                placeholder="admin@infiwallet.local"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErr(null);
                }}
                type="email"
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500"
              />
              <input
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-900 border border-slate-800 focus:border-amber-400 focus:outline-none text-white placeholder-slate-500 transition-colors"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErr(null);
                }}
                type="password"
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30"
          >
            {loading ? (
              <>
                <Loader size={18} className="animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <p className="text-center text-xs text-slate-500">
            Default credentials: <span className="text-slate-400 font-mono">admin@infiwallet.local</span>
          </p>
        </div>
      </div>
    </div>
  );
}
