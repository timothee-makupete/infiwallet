const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3018";

export function apiUrl(path: string): string {
  return `${base.replace(/\/$/, "")}/api/v1${path.startsWith("/") ? path : `/${path}`}`;
}

export async function apiFetch<T>(path: string, options: RequestInit & { token?: string | null } = {}): Promise<T> {
  const { token, headers, ...rest } = options;
  const h = new Headers(headers);
  h.set("Content-Type", "application/json");
  if (token) h.set("Authorization", `Bearer ${token}`);
  const res = await fetch(apiUrl(path), { ...rest, headers: h });
  const data = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) {
    const msg = typeof data === "object" && data && "message" in data ? String(data.message) : res.statusText;
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return data as T;
}
