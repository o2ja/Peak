import { cache } from "react";
import type { ApiErrorBody, MenuCategory, MenuItem, PublicSettings } from "./types";

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: ApiErrorBody,
  ) {
    super(body.error);
  }
}

/** Browser-side calls go to our own origin; next.config.ts proxies /api to the Express service. */
export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(path, {
      ...rest,
      credentials: "same-origin",
      headers: json !== undefined ? { "content-type": "application/json", ...headers } : headers,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    throw new ApiError(0, { error: "Can't reach PEAK right now. Check your connection and try again." });
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({ error: `Unexpected response (${res.status})` }));
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}

// ---- server-side (Server Components) ----

const API_URL = process.env.API_URL ?? "http://localhost:4000";

/** Never cached: menu, prices and availability must reflect the latest dashboard save. */
async function serverGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => ({ error: res.statusText })));
  return res.json();
}

// cache() dedupes the layout's and the page's calls within one request only.
export const getSettings = cache(() => serverGet<PublicSettings>("/api/public/settings"));
export const getMenu = cache(() => serverGet<{ categories: MenuCategory[] }>("/api/public/menu").then((r) => r.categories));
export const getItem = (slug: string) => serverGet<MenuItem>(`/api/public/menu/items/${encodeURIComponent(slug)}`);
