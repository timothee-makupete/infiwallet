"use client";

import { create } from "zustand";

export interface NotificationItem {
  id: string;
  title: string;
  description?: string;
  type: "info" | "success" | "error";
}

interface NotificationStore {
  items: NotificationItem[];
  push: (item: Omit<NotificationItem, "id">) => void;
  remove: (id: string) => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  items: [],
  push: (item) =>
    set((state) => ({
      items: [...state.items, { ...item, id: crypto.randomUUID() }],
    })),
  remove: (id) =>
    set((state) => ({
      items: state.items.filter((x) => x.id !== id),
    })),
}));
