"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { useEffect } from "react";
import { useNotificationStore } from "@/lib/stores/notification-store";

const iconByType = {
  info: Info,
  success: CircleCheck,
  error: CircleAlert,
} as const;

export function ToastStack() {
  const items = useNotificationStore((s) => s.items);
  const remove = useNotificationStore((s) => s.remove);

  useEffect(() => {
    const timers = items.map((item) =>
      setTimeout(() => {
        remove(item.id);
      }, 4500),
    );
    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [items, remove]);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2">
      <AnimatePresence>
        {items.map((item) => {
          const Icon = iconByType[item.type];
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              className="pointer-events-auto rounded-xl border border-border bg-surface p-3 shadow-fintech"
            >
              <div className="flex items-start gap-3">
                <Icon
                  size={16}
                  className={
                    item.type === "error"
                      ? "text-error"
                      : item.type === "success"
                        ? "text-success"
                        : "text-secondary"
                  }
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.title}</p>
                  {item.description ? <p className="mt-0.5 text-xs text-muted">{item.description}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="text-muted hover:text-foreground"
                  aria-label="Dismiss notification"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
