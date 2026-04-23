"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

const schema = z.object({
  email: z.string().email(),
  phone: z.string().min(8, "Phone number is required"),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type Form = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [agreed, setAgreed] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const strength = useMemo(() => {
    const pwd = watch("password") ?? "";
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 1;
    if (score <= 1) return { label: "Weak", color: "bg-error" };
    if (score <= 3) return { label: "Medium", color: "bg-accent" };
    return { label: "Strong", color: "bg-success" };
  }, [watch("password")]);

  const onSubmit = async (data: Form) => {
    try {
      if (!agreed) {
        setError("root", { message: "You must agree to Terms and Conditions." });
        return;
      }
      const res = await apiFetch<{ accessToken: string; user: { id: string; email: string } }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
        }),
      });
      setSession(res.accessToken, res.user.id, res.user.email);
      router.push("/kyc");
    } catch (e) {
      setError("root", { message: e instanceof Error ? e.message : "Registration failed" });
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_20%,rgba(5,150,105,0.22),transparent_30%),radial-gradient(circle_at_90%_10%,rgba(59,130,246,0.22),transparent_28%)]" />
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass w-full max-w-lg rounded-2xl p-8">
        <h1 className="text-3xl font-semibold">Create your wallet</h1>
        <p className="mt-1 text-sm text-muted">Step {step} of 3</p>
        <div className="mt-3 h-2 rounded-full bg-surface-elevated">
          <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${(step / 3) * 100}%` }} />
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm text-muted">First name</label>
                  <input className="w-full rounded-xl border border-border bg-surface px-3 py-2.5" {...register("firstName")} />
                  {errors.firstName && <p className="mt-1 text-sm text-error">{errors.firstName.message}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted">Last name</label>
                  <input className="w-full rounded-xl border border-border bg-surface px-3 py-2.5" {...register("lastName")} />
                  {errors.lastName && <p className="mt-1 text-sm text-error">{errors.lastName.message}</p>}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted">Email</label>
                <input className="w-full rounded-xl border border-border bg-surface px-3 py-2.5" type="email" {...register("email")} />
                {errors.email && <p className="mt-1 text-sm text-error">{errors.email.message}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted">Phone</label>
                <input className="w-full rounded-xl border border-border bg-surface px-3 py-2.5" type="tel" {...register("phone")} />
                {errors.phone && <p className="mt-1 text-sm text-error">{errors.phone.message}</p>}
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (await trigger(["firstName", "lastName", "email", "phone"])) setStep(2);
                }}
                className="w-full rounded-xl bg-primary py-2.5 font-medium text-white"
              >
                Continue
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label className="mb-1 block text-sm text-muted">Password</label>
                <input
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2.5"
                  type="password"
                  {...register("password")}
                />
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-2 flex-1 rounded-full bg-surface-elevated">
                    <div className={`h-2 rounded-full ${strength.color}`} style={{ width: `${["Weak","Medium","Strong"].includes(strength.label) ? (strength.label==="Weak"?35:strength.label==="Medium"?70:100):0}%` }} />
                  </div>
                  <span className="text-xs text-muted">{strength.label}</span>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted">Confirm password</label>
                <input
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2.5"
                  type="password"
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword && <p className="mt-1 text-sm text-error">{errors.confirmPassword.message}</p>}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="flex-1 rounded-xl border border-border py-2.5">
                  Back
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (await trigger(["password", "confirmPassword"])) setStep(3);
                  }}
                  className="flex-1 rounded-xl bg-primary py-2.5 font-medium text-white"
                >
                  Continue
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <label className="mb-1 block text-sm text-muted">Email OTP (mock)</label>
                <input
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 tracking-[0.2em]"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                />
                <p className="mt-1 text-xs text-muted">Use any 6 digits for this mock verification step.</p>
              </div>
              <label className="inline-flex items-start gap-2 text-sm text-muted">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 accent-primary" />
                I agree to InfiWallet Terms and Conditions.
              </label>
              {errors.root && <p className="text-sm text-error">{errors.root.message}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(2)} className="flex-1 rounded-xl border border-border py-2.5">
                  Back
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-1 rounded-xl bg-primary py-2.5 font-medium text-white">
                  {isSubmitting ? "Creating..." : "Create account"}
                </button>
              </div>
            </>
          )}
        </form>
        <p className="mt-4 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
