"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatMoney, STATUS_LABEL } from "@/lib/format";
import type { OrderDetail, OrderStatus as Status } from "@/lib/types";

const FLOW: Status[] = ["PENDING", "CONFIRMED", "PREPARING", "READY", "COMPLETED"];
const POLL_MS = 15_000;

/** Reads the order with its private token. Refreshes every 15 s while the order is still open (polling, not live push). */
export function OrderStatus({ reference, token: tokenParam }: { reference: string; token: string | null }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  useEffect(() => {
    let token = tokenParam;
    try {
      token ??= localStorage.getItem(`peak.order.${reference}`);
    } catch {}
    if (!token) {
      // localStorage is only readable after mount, so this check has to live in the effect.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError("This link is missing its order code. Use the link from the device you ordered on.");
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    let live = true;
    const load = async () => {
      try {
        const o = await api<OrderDetail>(`/api/public/orders/${encodeURIComponent(reference)}?token=${encodeURIComponent(token!)}`);
        if (!live) return;
        setOrder(o);
        setError(null);
        setCheckedAt(new Date());
        if (o.status !== "COMPLETED" && o.status !== "CANCELLED") timer = setTimeout(load, POLL_MS);
      } catch (e) {
        if (!live) return;
        const err = e as ApiError;
        setError(err.status === 404 ? "We couldn't find that order." : err.message);
        if (err.status !== 404) timer = setTimeout(load, POLL_MS);
      }
    };
    load();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [reference, tokenParam]);

  if (error && !order) {
    return (
      <div className="empty" style={{ minHeight: "50svh" }}>
        <h1 style={{ fontSize: "var(--t-head)" }}>Order {reference}</h1>
        <p role="alert">{error}</p>
        <Link className="btn" href="/menu">
          Back to the menu
        </Link>
      </div>
    );
  }
  if (!order) return <p className="empty" aria-busy="true">Loading your order…</p>;

  const step = FLOW.indexOf(order.status);
  return (
    <div className="flow">
      <div>
        <p style={{ fontWeight: 800 }}>{order.status === "CANCELLED" ? "This order was cancelled" : "Order received. Thank you!"}</p>
        <h1 className="ref">{order.reference}</h1>
        <p style={{ fontSize: "var(--t-lead)", maxWidth: "36ch" }}>
          {order.status === "CANCELLED"
            ? "If this is unexpected, please contact PEAK with your order reference."
            : "Show this reference at the counter. You'll pay when you collect."}
        </p>
        {order.status !== "CANCELLED" && (
          <ol className="timeline" aria-label="Order progress">
            {FLOW.map((s, i) => (
              <li key={s} data-done={i <= step} data-current={i === step} aria-current={i === step ? "step" : undefined}>
                <span>{STATUS_LABEL[s]}</span>
                <span style={{ fontSize: "var(--t-small)" }}>
                  {order.events.find((e) => e.toStatus === s) && new Date(order.events.find((e) => e.toStatus === s)!.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ol>
        )}
        <p className="field__hint" style={{ marginTop: 16 }} aria-live="polite">
          {error ? `Couldn't refresh: ${error}` : checkedAt && order.status !== "COMPLETED" && order.status !== "CANCELLED" ? `Updates every 15 seconds. Last checked ${checkedAt.toLocaleTimeString()}.` : null}
        </p>
      </div>
      <aside className="summary">
        <h2>Your order</h2>
        <ul className="lines" style={{ gap: 12 }}>
          {order.items.map((i) => (
            <li key={i.id} style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <span>
                <strong>
                  {i.quantity} × {i.name}
                </strong>
                {i.options.length > 0 && <span className="line__opts"> — {i.options.map((o) => o.value).join(", ")}</span>}
              </span>
              <span>{formatMoney(i.lineTotal, order.currencyCode)}</span>
            </li>
          ))}
        </ul>
        <dl>
          <div className="summary__total">
            <dt>Total</dt>
            <dd>{formatMoney(order.total, order.currencyCode)}</dd>
          </div>
          <div>
            <dt>Payment</dt>
            <dd>{order.paymentStatus === "PAID" ? "Paid" : order.paymentStatus === "REFUNDED" ? "Refunded" : "Pay at pickup"}</dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}
