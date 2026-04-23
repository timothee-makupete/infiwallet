"use client";

import { Lock, UserRound } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { useNotificationStore } from "@/lib/stores/notification-store";

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
});

type Form = z.infer<typeof schema>;

export default function ProfilePage() {
  const router = useRouter();
  const { token, userId, hydrated } = useAuthStore();
  const qc = useQueryClient();
  const push = useNotificationStore((s) => s.push);

  const user = useQuery({
    queryKey: ["user", userId],
    enabled: !!token && !!userId,
    queryFn: () =>
      apiFetch<{ firstName: string; lastName: string; phone: string | null; email: string }>(`/users/${userId}`, {
        token: token!,
      }),
  });

  const profile = useQuery({
    queryKey: ["profile", userId],
    enabled: !!token && !!userId,
    queryFn: () =>
      apiFetch<{ address: string | null; city: string | null; country: string | null }>(`/users/${userId}/profile`, {
        token: token!,
      }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!hydrated) return;
    if (!token || !userId) router.replace("/login");
  }, [hydrated, token, userId, router]);

  useEffect(() => {
    if (user.data) {
      reset({
        firstName: user.data.firstName,
        lastName: user.data.lastName,
        phone: user.data.phone ?? "",
      });
    }
  }, [user.data, reset]);

  const update = useMutation({
    mutationFn: (data: Form) =>
      apiFetch(`/users/${userId}`, { method: "PUT", token: token!, body: JSON.stringify(data) }),
    onSuccess: () => {
      push({ type: "success", title: "Profile updated" });
      void qc.invalidateQueries({ queryKey: ["user", userId] });
    },
  });

  if (!hydrated) return null;
  if (!token || !userId) return null;

  return (
    <Shell>
      <h1 className="mb-6 text-3xl font-semibold">Profile & Settings</h1>
      <Tabs defaultValue="personal">
        <TabsList className="mb-5 flex h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
        <div className="grid gap-8 md:grid-cols-2">
          <form
            onSubmit={handleSubmit((d) => update.mutate(d))}
            className="glass rounded-2xl p-6 space-y-4"
          >
            <h2 className="inline-flex items-center gap-2 font-medium">
              <UserRound size={15} />
              Personal information
            </h2>
            <p className="text-sm text-muted">{user.data?.email}</p>
            <div>
              <label className="text-sm text-muted">First name</label>
              <Input className="mt-1" {...register("firstName")} />
            </div>
            <div>
              <label className="text-sm text-muted">Last name</label>
              <Input className="mt-1" {...register("lastName")} />
            </div>
            <div>
              <label className="text-sm text-muted">Phone</label>
              <Input className="mt-1" {...register("phone")} />
            </div>
            <Button
              type="submit"
              disabled={isSubmitting || update.isPending}
            >
              Save changes
            </Button>
          </form>
          <div className="glass rounded-2xl p-6 space-y-2 text-sm">
            <h2 className="font-medium">Address</h2>
            <p className="text-muted">City: {profile.data?.city ?? "—"}</p>
            <p className="text-muted">Country: {profile.data?.country ?? "—"}</p>
            <p className="text-muted">Address: {profile.data?.address ?? "—"}</p>
          </div>
        </div>
        </TabsContent>

        <TabsContent value="security">
        <div className="glass rounded-2xl p-6 space-y-4">
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold">
            <Lock size={16} />
            Security
          </h2>
          <p className="text-sm text-muted">
            Password resets are supported using reset tokens from the backend.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <Link href="/forgot-password" className="rounded-xl border border-border px-3 py-2 text-sm hover:bg-surface-elevated">
              Request password reset
            </Link>
            <Link href="/reset-password" className="rounded-xl border border-border px-3 py-2 text-sm hover:bg-surface-elevated">
              Apply reset token
            </Link>
          </div>
        </div>
        </TabsContent>
      </Tabs>
    </Shell>
  );
}
