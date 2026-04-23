"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bell, LayoutDashboard, Menu, Repeat2, ShieldCheck, UserRound, WalletCards, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { clsx } from "clsx";
import { ThemeToggle } from "@/components/shared/theme-toggle";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/wallet", label: "Wallet", icon: WalletCards },
  { href: "/transactions", label: "Transactions", icon: Repeat2 },
  { href: "/kyc", label: "KYC", icon: ShieldCheck },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const clear = useAuthStore((s) => s.clear);
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background text-foreground md:grid md:grid-cols-[260px_minmax(0,1fr)] md:overflow-hidden">
      <aside className="hidden md:flex flex-col border-r border-border bg-surface/60 backdrop-blur-xl p-4 z-10">
        <Link href="/dashboard" className="text-2xl font-semibold tracking-tight text-primary px-2 py-4">
          InfiWallet
        </Link>
        <nav className="mt-4 space-y-1">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={clsx(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors duration-200",
                  pathname === l.href
                    ? "bg-primary/15 text-primary shadow-glow font-medium"
                    : "text-muted hover:text-foreground hover:bg-surface-elevated",
                )}
              >
                <Icon size={16} />
                {l.label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={() => clear()}
          className="mt-auto rounded-xl px-3 py-2 text-left text-sm text-muted hover:text-foreground hover:bg-surface-elevated"
        >
          Sign out
        </button>
      </aside>

      <div className="flex min-h-screen flex-col md:min-h-0 md:overflow-hidden">
        <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
            <div className="flex items-center gap-2 md:hidden">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="inline-flex items-center justify-center rounded-full border border-border bg-surface-elevated p-2 text-muted hover:text-foreground"
                aria-label="Open menu"
              >
                <Menu size={16} />
              </button>
              <Link href="/dashboard" className="text-xl font-semibold text-primary">
                InfiWallet
              </Link>
            </div>
            <div className="hidden md:block">
              <input
                placeholder="Search transactions, recipients..."
                className="w-full max-w-[380px] rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="relative inline-flex items-center justify-center rounded-full border border-border bg-surface-elevated p-2 text-muted hover:text-foreground"
                aria-label="Notifications"
              >
                <Bell size={16} />
                <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-primary" />
              </button>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <motion.main
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:py-8 overflow-x-hidden overflow-y-auto"
        >
          {children}
        </motion.main>
      </div>

      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setMobileOpen(false)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-y-0 left-0 z-50 w-[280px] border-r border-border bg-surface p-4 shadow-fintech md:hidden"
            >
              <div className="mb-6 flex items-center justify-between">
                <Link href="/dashboard" className="text-xl font-semibold text-primary" onClick={() => setMobileOpen(false)}>
                  InfiWallet
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center justify-center rounded-full border border-border bg-surface-elevated p-2 text-muted hover:text-foreground"
                  aria-label="Close menu"
                >
                  <X size={16} />
                </button>
              </div>
              <nav className="space-y-1">
                {links.map((l) => {
                  const Icon = l.icon;
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => setMobileOpen(false)}
                      className={clsx(
                        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors duration-200",
                        pathname === l.href
                          ? "bg-primary/15 text-primary shadow-glow font-medium"
                          : "text-muted hover:text-foreground hover:bg-surface-elevated",
                      )}
                    >
                      <Icon size={16} />
                      {l.label}
                    </Link>
                  );
                })}
              </nav>
              <button
                type="button"
                onClick={() => {
                  clear();
                  setMobileOpen(false);
                }}
                className="mt-6 w-full rounded-xl border border-border px-3 py-2 text-left text-sm text-muted hover:text-foreground hover:bg-surface-elevated"
              >
                Sign out
              </button>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
