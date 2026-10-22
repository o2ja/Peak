"use client";
import Link from "next/link";
import { useState } from "react";
import { StateBlock } from "@/components/admin/ui";
import { formatMoney, STATUS_LABEL } from "@/lib/format";
import { useApi } from "@/lib/useApi";
import type { OrderList, OrderStatus, Overview } from "@/lib/types";

const LANES: OrderStatus[] = ["PENDING", "CONFIRMED", "PREPARING", "READY"];
const POLL = 15_000;

function TrendChart({ trend, currency }: { trend: Overview["trend"]; currency: string }) {
  const max = Math.max(1, ...trend.map((t) => t.orders));
  const w = 100 / trend.length;
  const total = trend.reduce((n, t) => n + t.orders, 0);
  return (
    <figure style={{ margin: 0 }}>
      <svg className="chart" viewBox="0 0 100 50" preserveAspectRatio="none" role="img" aria-label={`${total} orders over the last ${trend.length} days`}>
        {[0.5, 1].map((g) => (
          <line key={g} x1="0" x2="100" y1={46 - 44 * g} y2={46 - 44 * g} stroke="#ece7e8" strokeWidth="0.3" vectorEffect="non-scaling-stroke" />
        ))}
        {trend.map((t, i) => {
          const h = (t.orders / max) * 44;
          const isToday = i === trend.length - 1;
          return (
            <rect key={t.day} x={i * w + w * 0.18} width={w * 0.64} y={46 - h} height={Math.max(h, t.orders ? 0.8 : 0.3)} fill={isToday ? "#F078A2" : "#111417"} opacity={t.orders ? 1 : 0.25}>
              <title>{`${t.day}: ${t.orders} orders, ${formatMoney(t.value, currency)}`}</title>
            </rect>
          );
        })}
      </svg>
      <figcaption className="adm-muted" style={{ display: "flex", justifyContent: "space-between" }}>
        <span>{trend[0]?.day}</span>
        <span>Peak day: {max} order{max === 1 ? "" : "s"} · today in pink</span>
        <span>{trend.at(-1)?.day}</span>
      </figcaption>
    </figure>
  );
}

export default function TodayPage() {
  const [days, setDays] = useState(14);
  const ov = useApi<Overview>(`/api/admin/overview?days=${days}`, { pollMs: POLL });
  const open = useApi<OrderList>("/api/admin/orders?status=OPEN", { pollMs: POLL });
  const d = ov.data;

  return (
    <>
      <div className="adm-head">
        <h1>Today at the counter</h1>
        <span className="adm-muted spacer" aria-live="polite">
          {ov.updatedAt ? `Refreshes every 15 s · last ${ov.updatedAt.toLocaleTimeString()}` : ""}
        </span>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => {
            ov.refetch();
            open.refetch();
          }}
        >
          Refresh now
        </button>
      </div>

      <StateBlock loading={ov.loading && !d} error={d ? null : ov.error} onRetry={ov.refetch}>
        {d && (
          <>
            <dl className="kpis">
              <div className="kpi">
                <dt>Orders today</dt>
                <dd>{d.today.orders}</dd>
              </div>
              <div className="kpi">
                <dt>Order value today</dt>
                <dd>{formatMoney(d.today.value, d.currencyCode)}</dd>
              </div>
              <div className={`kpi ${d.awaitingAction ? "kpi--alert" : ""}`}>
                <dt>Waiting on the counter</dt>
                <dd>{d.awaitingAction}</dd>
              </div>
              <div className="kpi">
                <dt>Sold out now</dt>
                <dd>{d.soldOut.length}</dd>
              </div>
            </dl>
            {!d.timezoneConfirmed && (
              <p className="adm-muted" style={{ marginTop: -8, marginBottom: 16 }}>
                “Today” is counted in UTC until the store timezone is set in Site &amp; ordering.
              </p>
            )}
          </>
        )}
      </StateBlock>

      <section aria-labelledby="rail-title">
        <h2 id="rail-title" className="visually-hidden">
          Open orders by stage
        </h2>
        <div className="rail">
          {LANES.map((lane) => {
            const orders = open.data?.orders.filter((o) => o.status === lane) ?? [];
            return (
              <div key={lane} className="rail__lane">
                <h2>
                  {STATUS_LABEL[lane]} <span className="adm-muted">{open.data ? orders.length : "–"}</span>
                </h2>
                {orders.map((o) => (
                  <Link key={o.id} className="rail__card" href={`/admin/orders/${o.id}`}>
                    <strong>{o.reference}</strong>
                    {o.customerName} · {o.itemCount} item{o.itemCount === 1 ? "" : "s"} · {new Date(o.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Link>
                ))}
                {open.data && orders.length === 0 && <p className="adm-muted">Nothing here.</p>}
              </div>
            );
          })}
        </div>
        {open.error && <p className="notice notice--error">{open.error.message}</p>}
      </section>

      {d && (
        <div className="adm-grid adm-grid--2">
          <section className="adm-panel" aria-labelledby="trend-title">
            <div className="adm-head" style={{ marginBottom: 8 }}>
              <h2 id="trend-title">Orders per day</h2>
              <div className="field spacer">
                <label htmlFor="days" className="visually-hidden">
                  Range
                </label>
                <select id="days" value={days} onChange={(e) => setDays(Number(e.target.value))}>
                  <option value={7}>Last 7 days</option>
                  <option value={14}>Last 14 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                </select>
              </div>
            </div>
            {d.trend.some((t) => t.orders > 0) ? <TrendChart trend={d.trend} currency={d.currencyCode} /> : <p className="adm-muted">No orders in this range yet. The chart fills in as orders arrive.</p>}
          </section>

          <section className="adm-panel" aria-labelledby="top-title">
            <h2 id="top-title">Most ordered ({days} days)</h2>
            {d.topItems.length === 0 ? (
              <p className="adm-muted">No orders yet.</p>
            ) : (
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="num">Cups</th>
                    <th className="num">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {d.topItems.map((t) => (
                    <tr key={t.name}>
                      <td>{t.name}</td>
                      <td className="num">{t.quantity}</td>
                      <td className="num">{formatMoney(t.value, d.currencyCode)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="adm-panel" aria-labelledby="recent-title">
            <h2 id="recent-title">Latest orders</h2>
            {d.recent.length === 0 ? (
              <p className="adm-muted">No orders yet. They&apos;ll appear here as soon as a customer checks out.</p>
            ) : (
              <table className="adm-table">
                <tbody>
                  {d.recent.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <Link href={`/admin/orders/${o.id}`}>{o.reference}</Link>
                      </td>
                      <td>{o.customerName}</td>
                      <td>
                        <span className="status" data-s={o.status}>
                          {STATUS_LABEL[o.status]}
                        </span>
                      </td>
                      <td className="num">{formatMoney(o.total, d.currencyCode)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="adm-panel" aria-labelledby="soldout-title">
            <h2 id="soldout-title">Sold out</h2>
            {d.soldOut.length === 0 ? (
              <p className="adm-muted">Everything on the menu is available.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {d.soldOut.map((s) => (
                  <li key={s.id}>
                    <Link href={`/admin/menu/${s.id}`}>{s.name}</Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </>
  );
}
