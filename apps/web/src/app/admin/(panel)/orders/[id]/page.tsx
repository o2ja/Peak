"use client";
import Link from "next/link";
import { use, useState } from "react";
import { ConfirmButton, StateBlock, useToast } from "@/components/admin/ui";
import { api, ApiError } from "@/lib/api";
import { formatMoney, STATUS_LABEL } from "@/lib/format";
import { useApi } from "@/lib/useApi";
import type { OrderDetail, OrderStatus } from "@/lib/types";

// Mirrors the API's allowed transitions; the API enforces them regardless.
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};
const ACTION: Record<OrderStatus, string> = {
  PENDING: "",
  CONFIRMED: "Confirm order",
  PREPARING: "Start making",
  READY: "Mark ready",
  COMPLETED: "Mark collected",
  CANCELLED: "Cancel order",
};

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: order, error, loading, refetch, setData } = useApi<OrderDetail>(`/api/admin/orders/${id}`, { pollMs: 20_000 });
  const toast = useToast();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function move(to: OrderStatus) {
    setBusy(true);
    try {
      const updated = await api<OrderDetail>(`/api/admin/orders/${id}/status`, { method: "POST", json: { to, note: note || undefined } });
      setData(updated);
      setNote("");
      toast.show("ok", `Order is now “${STATUS_LABEL[to]}”.`);
    } catch (e) {
      toast.show("error", (e as ApiError).message);
      refetch();
    } finally {
      setBusy(false);
    }
  }

  async function pay(to: "PAID" | "REFUNDED") {
    try {
      setData(await api<OrderDetail>(`/api/admin/orders/${id}/payment`, { method: "POST", json: { to } }));
      toast.show("ok", to === "PAID" ? "Payment recorded." : "Refund recorded.");
    } catch (e) {
      toast.show("error", (e as ApiError).message);
      refetch();
    }
  }

  return (
    <>
      <p>
        <Link className="textbtn" href="/admin/orders">
          ← All orders
        </Link>
      </p>
      <StateBlock loading={loading && !order} error={order ? null : error} onRetry={refetch}>
        {order && (
          <>
            <div className="adm-head">
              <h1>{order.reference}</h1>
              <span className="status" data-s={order.status}>
                {STATUS_LABEL[order.status]}
              </span>
              <span className="status" data-s={order.paymentStatus}>
                {order.paymentStatus === "UNPAID" ? "Unpaid · pay at pickup" : order.paymentStatus === "PAID" ? "Paid" : "Refunded"}
              </span>
              <span className="adm-muted spacer">Placed {new Date(order.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span>
            </div>

            <div className="adm-grid adm-grid--2">
              <section className="adm-panel" aria-labelledby="items-title">
                <h2 id="items-title">What they ordered</h2>
                <div className="table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th className="num">Qty</th>
                        <th className="num">Each</th>
                        <th className="num">Line</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((i) => (
                        <tr key={i.id}>
                          <td>
                            <strong>{i.name}</strong>
                            {i.options.length > 0 && <div className="adm-muted">{i.options.map((o) => `${o.option}: ${o.value}`).join(" · ")}</div>}
                          </td>
                          <td className="num">{i.quantity}</td>
                          <td className="num">{formatMoney(i.unitPrice, order.currencyCode)}</td>
                          <td className="num">{formatMoney(i.lineTotal, order.currencyCode)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3}>Subtotal</td>
                        <td className="num">{formatMoney(order.subtotal, order.currencyCode)}</td>
                      </tr>
                      {Number(order.deliveryFee) > 0 && (
                        <tr>
                          <td colSpan={3}>Delivery</td>
                          <td className="num">{formatMoney(order.deliveryFee, order.currencyCode)}</td>
                        </tr>
                      )}
                      <tr>
                        <td colSpan={3}>
                          <strong>Total</strong>
                        </td>
                        <td className="num">
                          <strong>{formatMoney(order.total, order.currencyCode)}</strong>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {order.notes && (
                  <p style={{ marginTop: 16 }}>
                    <strong>Customer note:</strong> {order.notes}
                  </p>
                )}
              </section>

              <div className="adm-grid" style={{ alignContent: "start" }}>
                <section className="adm-panel" aria-labelledby="next-title">
                  <h2 id="next-title">Next step</h2>
                  {NEXT[order.status].length === 0 ? (
                    <p className="adm-muted">This order is {STATUS_LABEL[order.status].toLowerCase()}. No further steps.</p>
                  ) : (
                    <div style={{ display: "grid", gap: 12 }}>
                      <div className="field">
                        <label htmlFor="note">Internal note (optional, staff only)</label>
                        <input id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {NEXT[order.status]
                          .filter((s) => s !== "CANCELLED")
                          .map((s) => (
                            <button key={s} type="button" className="btn" disabled={busy} onClick={() => move(s)}>
                              {ACTION[s]}
                            </button>
                          ))}
                        <ConfirmButton
                          label="Cancel order"
                          title="Cancel this order?"
                          body={`${order.reference} will be marked cancelled. This can't be undone, and the customer will see it on their order page.`}
                          confirmLabel="Cancel order"
                          danger
                          disabled={busy}
                          onConfirm={() => move("CANCELLED")}
                        />
                      </div>
                    </div>
                  )}
                </section>

                <section className="adm-panel" aria-labelledby="pay-title">
                  <h2 id="pay-title">Payment</h2>
                  <p className="adm-muted" style={{ marginBottom: 12 }}>
                    Pay at pickup. No online payment provider is connected, so payment is recorded by staff.
                  </p>
                  {order.paymentStatus === "UNPAID" && (
                    <ConfirmButton label="Record payment" title="Record payment?" body={`Confirm you've taken ${formatMoney(order.total, order.currencyCode)} for ${order.reference}.`} confirmLabel="Record payment" onConfirm={() => pay("PAID")} className="btn" />
                  )}
                  {order.paymentStatus === "PAID" && (
                    <ConfirmButton label="Record refund" title="Record a refund?" body="Only do this after the money has actually been returned to the customer." confirmLabel="Record refund" danger onConfirm={() => pay("REFUNDED")} />
                  )}
                </section>

                <section className="adm-panel" aria-labelledby="cust-title">
                  <h2 id="cust-title">Customer</h2>
                  <p>
                    <strong>{order.customerName}</strong>
                  </p>
                  <p>
                    <a href={`tel:${order.customerPhone}`}>{order.customerPhone}</a>
                  </p>
                  {order.customerEmail && <p>{order.customerEmail}</p>}
                  <p>{order.fulfilment === "PICKUP" ? "Pickup" : `Delivery to ${order.deliveryAddress}`}</p>
                </section>

                <section className="adm-panel" aria-labelledby="hist-title">
                  <h2 id="hist-title">History</h2>
                  <ol className="events">
                    {order.events.map((e, i) => (
                      <li key={i}>
                        <span>
                          {e.fromStatus ? `${STATUS_LABEL[e.fromStatus]} → ` : ""}
                          <strong>{STATUS_LABEL[e.toStatus]}</strong>
                          {e.by && ` · ${e.by}`}
                        </span>
                        <time className="adm-muted" dateTime={e.createdAt}>
                          {new Date(e.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                        </time>
                        {e.note && <small>{e.note}</small>}
                      </li>
                    ))}
                  </ol>
                </section>
              </div>
            </div>
          </>
        )}
      </StateBlock>
      {toast.node}
    </>
  );
}
