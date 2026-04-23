"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiFetch } from "@/lib/api";

const schema = z.object({
  email: z.string().email(),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
    setError,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      await apiFetch("/users/forgot-password", {
        method: "POST",
        body: JSON.stringify(values),
      });
    } catch (err) {
      setError("root", { message: err instanceof Error ? err.message : "Reset request failed" });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass w-full max-w-md rounded-2xl p-8"
      >
        <h1 className="text-2xl font-semibold">Forgot password</h1>
        <p className="mt-2 text-sm text-muted">We will send a reset token to your email address.</p>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <input
              type="email"
              placeholder="you@example.com"
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5"
              {...register("email")}
            />
            {errors.email && <p className="mt-1 text-sm text-error">{errors.email.message}</p>}
          </div>
          {errors.root && <p className="text-sm text-error">{errors.root.message}</p>}
          {isSubmitSuccessful && (
            <p className="rounded-lg bg-success/20 px-3 py-2 text-sm text-success">
              Reset request submitted. Check your email or API response token.
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-primary py-2.5 font-medium text-white disabled:opacity-50"
          >
            {isSubmitting ? "Sending..." : "Send reset link"}
          </button>
        </form>
        <p className="mt-4 text-sm text-muted">
          Back to{" "}
          <Link href="/login" className="text-primary hover:underline">
            login
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
