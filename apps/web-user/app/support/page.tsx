"use client";

import { Shell } from "@/components/Shell";

export default function SupportPage() {
  return (
    <Shell>
      <h1 className="text-3xl font-semibold">Support Center</h1>
      <p className="mt-2 text-muted">
        Need help? Reach our support team at <span className="text-primary">support@infiwallet.local</span> or call
        +265 999 000 000.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="glass rounded-2xl p-5">
          <h2 className="font-medium">Live Chat</h2>
          <p className="mt-1 text-sm text-muted">Average response time: 3 minutes.</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <h2 className="font-medium">KYC Escalations</h2>
          <p className="mt-1 text-sm text-muted">Priority queue for verification issues.</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <h2 className="font-medium">Security Incident</h2>
          <p className="mt-1 text-sm text-muted">Report suspicious account behavior instantly.</p>
        </div>
      </div>
    </Shell>
  );
}
