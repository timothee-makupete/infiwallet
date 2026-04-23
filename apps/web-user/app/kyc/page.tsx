"use client";

import { Medal, ShieldCheck, Upload } from "lucide-react";
import type { AxiosError } from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { apiFetch } from "@/lib/api";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { useNotificationStore } from "@/lib/stores/notification-store";

const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
type AllowedMime = (typeof ALLOWED_MIME)[number];

interface KycRow {
  id: string;
  tier: number;
  status: string;
  createdAt: string;
  documents?: unknown;
}

interface TierLimits {
  tier: number;
  dailyLimit: number;
  monthlyLimit: number;
  singleTransactionLimit: number;
}

interface DocSlot {
  type: string;
  label: string;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error("Read failed"));
    r.readAsDataURL(file);
  });
}

function normalizeMime(file: File): AllowedMime {
  const t = file.type;
  if (ALLOWED_MIME.includes(t as AllowedMime)) return t as AllowedMime;
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".jpeg") || lower.endsWith(".jpg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  throw new Error(`Unsupported type for "${file.name}". Use PDF, JPEG, PNG, or WebP.`);
}

function docSlotsForTier(tier: number): DocSlot[] {
  if (tier === 1) {
    return [{ type: "GOVERNMENT_ID", label: "Government-issued ID" }];
  }
  if (tier === 2) {
    return [
      { type: "GOVERNMENT_ID", label: "Government-issued ID" },
      { type: "PROOF_OF_ADDRESS", label: "Proof of address (utility bill or bank statement)" },
    ];
  }
  return [
    { type: "GOVERNMENT_ID", label: "Government-issued ID" },
    { type: "PROOF_OF_ADDRESS", label: "Proof of address" },
    { type: "PROOF_OF_INCOME", label: "Proof of income or employment" },
  ];
}

export default function KycPage() {
  const router = useRouter();
  const { token, userId, hydrated } = useAuthStore();
  const qc = useQueryClient();
  const push = useNotificationStore((s) => s.push);
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<Array<File | null>>([]);

  useEffect(() => {
    if (!hydrated) return;
    if (!token || !userId) router.replace("/login");
  }, [hydrated, token, userId, router]);

  const list = useQuery({
    queryKey: ["kyc", userId],
    enabled: !!token && !!userId,
    queryFn: () =>
      apiFetch<Array<KycRow>>(`/kyc/${userId}`, {
        token: token!,
      }),
  });

  const limits = useQuery({
    queryKey: ["kyc-limits-all"],
    enabled: !!token && !!userId,
    queryFn: async () => {
      const [t1, t2, t3] = await Promise.all([
        apiFetch<TierLimits>("/kyc/limits/1", { token: token! }),
        apiFetch<TierLimits>("/kyc/limits/2", { token: token! }),
        apiFetch<TierLimits>("/kyc/limits/3", { token: token! }),
      ]);
      return [t1, t2, t3];
    },
  });

  const maxApprovedTier = useMemo(() => {
    const rows = list.data ?? [];
    return rows.filter((r) => r.status === "approved").reduce((m, r) => Math.max(m, r.tier), 0);
  }, [list.data]);

  const nextTier = maxApprovedTier >= 3 ? null : maxApprovedTier + 1;

  const pendingRow = useMemo(() => (list.data ?? []).find((r) => r.status === "pending"), [list.data]);

  const docSlots = useMemo(() => (nextTier == null ? [] : docSlotsForTier(nextTier)), [nextTier]);

  useEffect(() => {
    setFiles(docSlots.map(() => null));
  }, [docSlots]);

  const latestByTier = useMemo(() => {
    const map = new Map<number, KycRow>();
    for (const row of list.data ?? []) {
      if (!map.has(row.tier)) map.set(row.tier, row);
    }
    return map;
  }, [list.data]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!userId || nextTier == null) throw new Error("Nothing to submit");
      if (pendingRow) throw new Error("You already have a submission under review.");
      const documents = await Promise.all(
        docSlots.map(async (slot, idx) => {
          const file = files[idx];
          if (!file) throw new Error(`Please upload: ${slot.label}`);
          const mimeType = normalizeMime(file);
          const dataBase64 = await readFileAsDataUrl(file);
          return {
            type: slot.type,
            fileName: file.name,
            mimeType,
            dataBase64,
          };
        }),
      );
      await apiClient.post(`/kyc/${userId}/submit`, {
        tier: nextTier,
        notes: notes.trim() || undefined,
        documents,
      });
    },
    onSuccess: () => {
      if (nextTier != null) {
        push({ type: "success", title: `Tier ${nextTier} submitted for review` });
      }
      setNotes("");
      void qc.invalidateQueries({ queryKey: ["kyc", userId] });
    },
  });

  if (!hydrated) return null;
  if (!token || !userId) return null;

  const canSubmit =
    nextTier != null && !pendingRow && docSlots.length > 0 && files.length === docSlots.length && files.every((f) => f != null);

  return (
    <Shell>
      <h1 className="mb-6 text-3xl font-semibold">KYC verification</h1>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <div className="space-y-4">
          {(limits.data ?? []).map((item) => {
            const Icon = item.tier === 3 ? ShieldCheck : Medal;
            return (
              <div key={item.tier} className="glass rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon size={16} className="text-primary" />
                    <h2 className="font-semibold">
                      Tier {item.tier} - {item.tier === 1 ? "Bronze" : item.tier === 2 ? "Silver" : "Gold"}
                    </h2>
                  </div>
                  <span className="rounded-full bg-surface-elevated px-2 py-1 text-xs">
                    {item.dailyLimit.toLocaleString()} MWK/day
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted">
                  Monthly: {item.monthlyLimit.toLocaleString()} MWK · Single tx:{" "}
                  {item.singleTransactionLimit.toLocaleString()} MWK
                </p>
                <p className="mt-2 text-xs text-muted">
                  Status: {latestByTier.get(item.tier)?.status ?? "not-submitted"}
                </p>
              </div>
            );
          })}
        </div>

        <div className="glass rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">Upgrade tier</h2>
          {nextTier == null ? (
            <p className="text-sm text-muted">You are on the highest tier (Tier 3). No further verification is required.</p>
          ) : pendingRow ? (
            <p className="text-sm text-muted">
              Your Tier {pendingRow.tier} submission is <strong>pending review</strong>. You cannot submit another
              request until it is approved or rejected.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted">
                You are approved through <strong>Tier {maxApprovedTier}</strong>. Upload the required documents for{" "}
                <strong>Tier {nextTier}</strong> (one step at a time). Files are stored securely for admin review (max
                8MB each).
              </p>
              <div className="rounded-xl bg-surface-elevated px-3 py-2 text-sm">
                <span className="text-muted">Next target:</span>{" "}
                <span className="font-medium">Tier {nextTier}</span>
              </div>
              {docSlots.map((slot, idx) => (
                <div key={slot.type}>
                  <label className="mb-1 block text-sm text-muted">{slot.label}</label>
                  <div className="relative">
                    <Upload size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
                      className="w-full cursor-pointer rounded-xl border border-border bg-surface py-2 pl-9 pr-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary/15 file:px-3 file:py-1 file:text-xs file:font-medium"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        setFiles((prev) => {
                          const next = [...prev];
                          next[idx] = f;
                          return next;
                        });
                      }}
                    />
                  </div>
                  {files[idx] && <p className="mt-1 text-xs text-muted">Selected: {files[idx]!.name}</p>}
                </div>
              ))}
              <div>
                <label className="mb-1 block text-sm text-muted">Notes for reviewer (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2"
                  placeholder="Optional context for the reviewer…"
                />
              </div>
              <button
                type="button"
                onClick={() => submit.mutate()}
                disabled={!canSubmit || submit.isPending}
                className="w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {submit.isPending ? "Uploading…" : `Submit Tier ${nextTier} verification`}
              </button>
              {submit.isError && <p className="text-sm text-error">{(submit.error as Error).message}</p>}
            </>
          )}
        </div>
      </div>

      <div className="glass mt-6 rounded-2xl p-6">
        <h2 className="mb-2 text-lg font-semibold">Submission history</h2>
        <ul className="space-y-2 text-sm">
          {list.data?.map((v) => {
            const docCount = Array.isArray(v.documents) ? v.documents.length : 0;
            return (
              <li key={v.id} className="flex flex-col gap-1 rounded-xl bg-surface-elevated px-3 py-2 sm:flex-row sm:justify-between">
                <span>
                  Tier {v.tier} — {v.status}
                  {docCount > 0 ? (
                    <span className="ml-2 text-xs text-muted">({docCount} document{docCount === 1 ? "" : "s"})</span>
                  ) : null}
                </span>
                <span className="text-muted">{new Date(v.createdAt).toLocaleString()}</span>
              </li>
            );
          })}
          {!list.data?.length && !list.isLoading && <li className="text-muted">No submissions yet.</li>}
        </ul>
      </div>
    </Shell>
  );
}
