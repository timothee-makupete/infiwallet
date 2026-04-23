"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  token: string | null;
  userId: string | null;
  email: string | null;
  remember: boolean;
  hydrated: boolean;
  setSession: (token: string, userId: string, email: string, remember?: boolean) => void;
  setRemember: (remember: boolean) => void;
  setHydrated: (hydrated: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      userId: null,
      email: null,
      remember: true,
      hydrated: false,
      setSession: (token, userId, email, remember = true) => set({ token, userId, email, remember }),
      setRemember: (remember) => set({ remember }),
      setHydrated: (hydrated) => set({ hydrated }),
      clear: () => set({ token: null, userId: null, email: null }),
    }),
    {
      name: "infiwallet-auth",
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
