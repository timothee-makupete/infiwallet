import { AxiosError } from "axios";
import { apiClient } from "@/lib/api-client";

const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3018";

export function apiUrl(path: string): string {
  return `${base.replace(/\/$/, "")}/api/v1${path.startsWith("/") ? path : `/${path}`}`;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  try {
    const response = await apiClient.request<T>({
      url: path,
      method: options.method ?? "GET",
      data: options.body ? JSON.parse(String(options.body)) : undefined,
      headers: options.headers as Record<string, string> | undefined,
    });
    return response.data;
  } catch (error) {
    const e = error as AxiosError<{ message?: string }>;
    const message = e.response?.data?.message ?? e.message;
    throw new Error(message || "Request failed");
  }
}
