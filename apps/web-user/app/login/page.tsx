"use client";

import { motion } from "framer-motion";
import { Apple, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const setRemember = useAuthStore((s) => s.setRemember);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    try {
      const res = await apiFetch<{ accessToken: string; user: { id: string; email: string } }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setRemember(rememberMe);
      setSession(res.accessToken, res.user.id, res.user.email, rememberMe);
      router.push("/dashboard");
    } catch (e) {
      setError("root", { message: e instanceof Error ? e.message : "Login failed" });
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(5,150,105,0.25),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.25),transparent_25%)]" />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="glass w-full max-w-md space-y-6 rounded-2xl p-8"
      >
        <div className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Digital wallet platform</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label className="mb-1 block text-sm text-muted">Email</label>
            <input
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary/40"
              type="email"
              {...register("email")}
            />
            {errors.email && <p className="mt-1 text-sm text-error">{errors.email.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted">Password</label>
            <div className="relative">
              <input
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 pr-10 outline-none focus:ring-2 focus:ring-primary/40"
                type={showPassword ? "text" : "password"}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-sm text-error">{errors.password.message}</p>}
          </div>
          <div className="flex items-center justify-between text-sm">
            <label className="inline-flex items-center gap-2 text-muted">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="accent-primary"
              />
              Remember me
            </label>
            <Link href="/forgot-password" className="text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          {errors.root && <p className="text-sm text-error">{errors.root.message}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-primary py-2.5 font-medium text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
         
        </form>
        <p className="text-center text-sm text-muted">
          No account?{" "}
          <Link href="/register" className="text-primary hover:underline">
            Register
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
