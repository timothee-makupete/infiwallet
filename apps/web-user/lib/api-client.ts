"use client";

import axios, { AxiosError } from "axios";
import { useAuthStore } from "@/lib/auth-store";

const baseURL = `${(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3018").replace(/\/$/, "")}/api/v1`;

export const apiClient = axios.create({
  baseURL,
  timeout: 120_000,
  maxBodyLength: 14 * 1024 * 1024,
  maxContentLength: 14 * 1024 * 1024,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clear();
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);
