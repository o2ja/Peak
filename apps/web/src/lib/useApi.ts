"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "./api";

/**
 * GET with loading/error state, manual refetch and optional polling.
 * Polling pauses while the tab is hidden and resumes (with an immediate refresh) when it returns.
 */
export function useApi<T>(path: string | null, { pollMs }: { pollMs?: number } = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const seq = useRef(0);
  const router = useRouter();

  const load = useCallback(async () => {
    if (!path) return;
    const mine = ++seq.current;
    setLoading(true);
    try {
      const d = await api<T>(path);
      if (mine !== seq.current) return; // a newer request won
      setData(d);
      setError(null);
      setUpdatedAt(new Date());
    } catch (e) {
      if (mine !== seq.current) return;
      const err = e as ApiError;
      if (err.status === 401) router.replace(`/admin/login?next=${encodeURIComponent(location.pathname)}`);
      setError(err);
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [path, router]);

  useEffect(() => {
    // Data loading on mount and on path change is exactly what this effect is for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    if (!pollMs) return;
    const tick = () => document.visibilityState === "visible" && load();
    const id = setInterval(tick, pollMs);
    const onVis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load, pollMs]);

  return { data, error, loading, updatedAt, refetch: load, setData };
}
