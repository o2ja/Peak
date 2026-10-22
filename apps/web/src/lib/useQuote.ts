"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "./api";
import type { CartLine } from "./cart";
import type { Quote } from "./types";

export type QuoteState = { status: "idle" | "loading" | "ok" | "error"; quote?: Quote; error?: ApiError };

/** Asks the API to price the bag. The server's answer is what checkout shows and charges. */
export function useQuote(lines: CartLine[], fulfilment: "PICKUP" | "DELIVERY") {
  const [state, setState] = useState<QuoteState>({ status: "idle" });
  const body = JSON.stringify({ fulfilment, lines: lines.map(({ menuItemId, quantity, optionValueIds }) => ({ menuItemId, quantity, optionValueIds })) });

  useEffect(() => {
    if (lines.length === 0) return;
    let live = true;
    // Debounced so tapping + several times sends one request.
    const t = setTimeout(() => {
      setState((s) => ({ ...s, status: "loading" }));
      api<Quote>("/api/public/cart/quote", { method: "POST", body, headers: { "content-type": "application/json" } })
        .then((quote) => live && setState({ status: "ok", quote }))
        .catch((error: ApiError) => live && setState({ status: "error", error }));
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
    // body captures everything the request depends on
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body]);

  return lines.length === 0 ? { status: "idle" as const } : state;
}
