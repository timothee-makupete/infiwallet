"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiFetch } from "@/lib/api";

const schema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: z.string().min(8, "Minimum 8 characters"),
    confirmPassword: z.string().min(8),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
    setError,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      await apiFetch("/users/reset-password", {
        method: "POST",
        body: JSON.stringify({ token: values.token, password: values.password }),
      });
    } catch (err) {
      setError("root", { message: err instanceof Error ? err.message : "Reset failed" });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass w-full max-w-md rounded-2xl p-8">
        <h1 className="text-2xl font-semibold">Reset password</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <input
              placeholder="Reset token"
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5"
              {...register("token")}
            />
            {errors.token ? <p className="mt-1 text-sm text-error">{errors.token.message}</p> : null}
          </div>
          <div>
            <input
              type="password"
              placeholder="New password"
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5"
              {...register("password")}
            />
            {errors.password ? <p className="mt-1 text-sm text-error">{errors.password.message}</p> : null}
          </div>
          <div>
            <input
              type="password"
              placeholder="Confirm password"
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword ? <p className="mt-1 text-sm text-error">{errors.confirmPassword.message}</p> : null}
          </div>
          {errors.root ? <p className="text-sm text-error">{errors.root.message}</p> : null}
          {isSubmitSuccessful ? (
            <p className="rounded-xl bg-success/15 px-3 py-2 text-sm text-success">
              Password reset successful. You can now sign in.
            </p>
          ) : null}
          <button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-white">
            {isSubmitting ? "Resetting..." : "Reset password"}
          </button>
        </form>
        <p className="mt-4 text-sm text-muted">
          Back to{" "}
          <Link href="/login" className="text-primary hover:underline">
            login
          </Link>
        </p>
      </div>
    </div>
  );
}
