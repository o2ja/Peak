"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { OrderSummary } from "./OrderSummary";
import { api, ApiError } from "@/lib/api";
import { cart, useCart } from "@/lib/cart";
import { formatMoney } from "@/lib/format";
import { useQuote } from "@/lib/useQuote";
import type { PublicSettings } from "@/lib/types";

type Fulfilment = "PICKUP" | "DELIVERY";
type Errors = Partial<Record<"customerName" | "customerPhone" | "customerEmail" | "deliveryAddress" | "form", string>>;

export function CheckoutForm({ settings }: { settings: PublicSettings }) {
  const router = useRouter();
  const lines = useCart();
  const modes = [settings.pickupEnabled && "PICKUP", settings.deliveryEnabled && "DELIVERY"].filter(Boolean) as Fulfilment[];
  const [fulfilment, setFulfilment] = useState<Fulfilment>(modes[0] ?? "PICKUP");
  const quote = useQuote(lines, fulfilment);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  // One key per checkout attempt: retries after a network error reuse it, so the order can't be created twice.
  const idempotencyKey = useRef<string | null>(null);

  if (lines.length === 0 && !submitting) {
    return (
      <div className="empty" style={{ minHeight: "50svh" }}>
        <h1 style={{ fontSize: "var(--t-head)" }}>Nothing to check out</h1>
        <p>Your bag is empty.</p>
        <Link className="btn btn--pink" href="/menu">
          Browse the menu
        </Link>
      </div>
    );
  }

  const unavailable = !settings.acceptingOrders || modes.length === 0 || !settings.payAtPickupEnabled;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    const f = new FormData(e.currentTarget);
    const body = {
      idempotencyKey: (idempotencyKey.current ??= crypto.randomUUID()),
      fulfilment,
      customerName: String(f.get("customerName") ?? "").trim(),
      customerPhone: String(f.get("customerPhone") ?? "").trim(),
      customerEmail: String(f.get("customerEmail") ?? "").trim(),
      deliveryAddress: fulfilment === "DELIVERY" ? String(f.get("deliveryAddress") ?? "").trim() : undefined,
      notes: String(f.get("notes") ?? "").trim() || undefined,
      paymentMethod: "PAY_AT_PICKUP" as const,
      lines: lines.map(({ menuItemId, quantity, optionValueIds }) => ({ menuItemId, quantity, optionValueIds })),
    };

    const next: Errors = {};
    if (body.customerName.length < 2) next.customerName = "Tell us your name so we can call it out.";
    if (!/^\+?[0-9 ()-]{7,20}$/.test(body.customerPhone)) next.customerPhone = "Enter a phone number we can reach you on.";
    if (fulfilment === "DELIVERY" && (body.deliveryAddress?.length ?? 0) < 5) next.deliveryAddress = "Enter the delivery address.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      const res = await api<{ reference: string; accessToken: string }>("/api/public/orders", { method: "POST", json: body });
      try {
        localStorage.setItem(`peak.order.${res.reference}`, res.accessToken);
      } catch {}
      router.replace(`/order/${res.reference}?token=${encodeURIComponent(res.accessToken)}`);
      cart.clear();
    } catch (err) {
      const e = err as ApiError;
      // Validation and pricing errors mean the order was NOT created: allow a fresh attempt.
      if (e.status >= 400 && e.status < 500) idempotencyKey.current = null;
      const fieldErrors: Errors = {};
      e.body?.details?.forEach((d) => {
        if (d.path && d.path in { customerName: 1, customerPhone: 1, customerEmail: 1, deliveryAddress: 1 }) fieldErrors[d.path as keyof Errors] = d.message;
      });
      setErrors({ ...fieldErrors, form: e.body?.details?.some((d) => d.line !== undefined) ? `${e.message} ${e.body.details!.map((d) => d.message).join(" ")}` : e.message });
      setSubmitting(false);
    }
  }

  const field = (name: keyof Errors) => ({
    name,
    id: name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });
  const err = (name: keyof Errors) => errors[name] && <span id={`${name}-error`} className="field__error">{errors[name]}</span>;

  return (
    <div className="flow">
      <div>
        <h1>Checkout</h1>
        {unavailable ? (
          <p className="notice">Online ordering is paused right now, so orders can&apos;t be placed. Your bag is saved.</p>
        ) : (
          <form className="form" onSubmit={submit} noValidate>
            {modes.length > 1 && (
              <fieldset className="opt" style={{ marginTop: 0 }}>
                <legend>How do you want it?</legend>
                <div className="opt__choices">
                  {modes.map((m) => (
                    <label key={m} className="choice">
                      <input type="radio" name="fulfilment" checked={fulfilment === m} onChange={() => setFulfilment(m)} />
                      <span>{m === "PICKUP" ? "Pickup" : `Delivery (${formatMoney(settings.deliveryFee, settings.currencyCode)})`}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            {modes.length === 1 && <p className="notice">{fulfilment === "PICKUP" ? "This order is for pickup." : "This order is for delivery."}</p>}

            <div className="form__row">
              <div className="field">
                <label htmlFor="customerName">Name</label>
                <input {...field("customerName")} autoComplete="name" required maxLength={80} />
                {err("customerName")}
              </div>
              <div className="field">
                <label htmlFor="customerPhone">Phone</label>
                <input {...field("customerPhone")} type="tel" autoComplete="tel" inputMode="tel" required maxLength={20} />
                {err("customerPhone")}
              </div>
            </div>
            <div className="field">
              <label htmlFor="customerEmail">Email (optional)</label>
              <input {...field("customerEmail")} type="email" autoComplete="email" maxLength={120} />
              <span className="field__hint">Only used if we need to reach you about this order.</span>
              {err("customerEmail")}
            </div>
            {fulfilment === "DELIVERY" && (
              <div className="field">
                <label htmlFor="deliveryAddress">Delivery address</label>
                <textarea {...field("deliveryAddress")} autoComplete="street-address" maxLength={300} />
                {err("deliveryAddress")}
              </div>
            )}
            <div className="field">
              <label htmlFor="notes">Anything we should know? (optional)</label>
              <textarea id="notes" name="notes" maxLength={500} />
            </div>

            <div className="notice">
              <strong>Payment: pay when you collect.</strong> No card details are taken online. {settings.orderInstructions}
            </div>

            {errors.form && (
              <p className="notice notice--error" role="alert">
                {errors.form}
              </p>
            )}
            <button type="submit" className="btn btn--pink" disabled={submitting || quote.status !== "ok"} style={{ justifySelf: "start", minHeight: 60 }}>
              {submitting ? "Placing order…" : quote.quote ? `Place order · ${formatMoney(quote.quote.total, quote.quote.currencyCode)}` : "Place order"}
            </button>
          </form>
        )}
      </div>
      <OrderSummary state={quote}>
        <ul className="lines" style={{ gap: 12 }}>
          {lines.map((l) => (
            <li key={l.key}>
              <strong>
                {l.quantity} × {l.name}
              </strong>
              {l.optionLabels.length > 0 && <span className="line__opts"> — {l.optionLabels.join(", ")}</span>}
            </li>
          ))}
        </ul>
        <Link className="link" href="/bag">
          Edit bag
        </Link>
      </OrderSummary>
    </div>
  );
}
