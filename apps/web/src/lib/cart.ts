"use client";
import { useSyncExternalStore } from "react";

export type CartLine = {
  key: string;
  menuItemId: string;
  slug: string;
  name: string;
  optionValueIds: string[];
  optionLabels: string[];
  quantity: number;
  /** Preview only; the server recomputes at checkout. */
  unitPrice: string;
  liquidColor: string | null;
  layerColor: string | null;
  imageUrl: string | null;
};

const KEY = "peak.bag.v1";
const EMPTY: CartLine[] = [];
let lines: CartLine[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    lines = Array.isArray(parsed) ? parsed : EMPTY;
  } catch {
    lines = EMPTY;
  }
  // Keep tabs in sync.
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    loaded = false;
    load();
    listeners.forEach((l) => l());
  });
}

function set(next: CartLine[]) {
  lines = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // private mode: the bag still works for this page view
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  load();
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useCart() {
  return useSyncExternalStore(
    subscribe,
    () => (load(), lines),
    () => EMPTY,
  );
}

const sameChoice = (a: CartLine, b: Omit<CartLine, "key" | "quantity">) =>
  a.menuItemId === b.menuItemId && [...a.optionValueIds].sort().join() === [...b.optionValueIds].sort().join();

export const cart = {
  /** Adds a line, merging with an identical one. With replaceKey, swaps that line (editing choices). */
  add(line: Omit<CartLine, "key">, replaceKey?: string) {
    const rest = replaceKey ? lines.filter((l) => l.key !== replaceKey) : lines;
    const twin = rest.find((l) => sameChoice(l, line));
    if (twin) {
      set(rest.map((l) => (l === twin ? { ...l, ...line, key: l.key, quantity: Math.min(50, l.quantity + line.quantity) } : l)));
    } else {
      set([...rest, { ...line, key: crypto.randomUUID() }]);
    }
  },
  setQuantity(key: string, quantity: number) {
    set(quantity < 1 ? lines.filter((l) => l.key !== key) : lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(50, quantity) } : l)));
  },
  remove(key: string) {
    set(lines.filter((l) => l.key !== key));
  },
  clear() {
    set(EMPTY);
  },
};
