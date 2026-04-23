"use client";

import { Shell } from "@/components/Shell";

export default function SettingsPage() {
  return (
    <Shell>
      <h1 className="mb-6 text-3xl font-semibold">Settings</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass rounded-2xl p-5">
          <h2 className="font-semibold">Appearance</h2>
          <p className="mt-1 text-sm text-muted">Switch between light and dark themes from the top bar.</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <h2 className="font-semibold">Language</h2>
          <select className="mt-3 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm">
            <option>English</option>
            <option>Chichewa</option>
          </select>
        </div>
        <div className="glass rounded-2xl p-5">
          <h2 className="font-semibold">Currency preference</h2>
          <select className="mt-3 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm">
            <option>MWK</option>
            <option>USD</option>
            <option>EUR</option>
          </select>
        </div>
        <div className="glass rounded-2xl p-5">
          <h2 className="font-semibold">Privacy</h2>
          <label className="mt-3 flex items-center justify-between rounded-xl bg-surface-elevated px-3 py-2 text-sm">
            Hide wallet balance by default
            <input type="checkbox" className="accent-primary" />
          </label>
        </div>
      </div>
    </Shell>
  );
}
