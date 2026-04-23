"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface State {
  token: string | null;
  setToken: (t: string | null) => void;
}

export const useAdminAuth = create<State>()(
  persist(
    (set) => ({
      token: null,
      setToken: (token) => set({ token }),
    }),
    { name: "infiwallet-admin" },
  ),
);
