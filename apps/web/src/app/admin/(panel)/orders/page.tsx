"use client";
import Link from "next/link";
import { useState } from "react";
import { StateBlock } from "@/components/admin/ui";
import { formatMoney, STATUS_LABEL } from "@/lib/format";
import { useApi } from "@/lib/useApi";
import type { OrderList } from "@/lib/types";

export default function OrdersPage() {
  const [filters, setFilters] = useState({ q: "", status: "", fulfilment: "", from: "", to: "", page: 1 });
  const qs = new URLSearchParams(
    Object.entries({
      ...filters,
      page: String(filters.page),
      // date inputs are local days; send the whole day
      from: filters.from ? new Date(`${filters.from}T00:00:00`).toISOString() : "",
      to: filters.to ? new Date(`${filters.to}T23:59:59.999`).toISOString() : "",
    }).filter(([, v]) => v),
  );
  const { data, error, loading, refetch, updatedAt } = useApi<OrderList>(`/api/admin/orders?${qs}`, { pollMs: 20_000 });
  const set = (k: keyof typeof filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFilters((f) => ({ ...f, [k]: e.target.value, page: 1 }));
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <div className="adm-head">
        <h1>Orders</h1>
        <span className="adm-muted spacer">{updatedAt && `Refreshes every 20 s · last ${updatedAt.toLocaleTimeString()}`}</span>
        <button type="button" className="btn btn--ghost" onClick={refetch}>
          Refresh now
        </button>
      </div>

      <form className="filters" role="search" onSubmit={(e) => e.preventDefault()}>
        <div className="field">
          <label htmlFor="q">Reference, name or phone</label>
          <input id="q" type="search" value={filters.q} onChange={set("q")} placeholder="PK-…" />
        </div>
        <div className="field">
          <label htmlFor="status">Stage</label>
          <select id="status" value={filters.status} onChange={set("status")}>
            <option value="">All</option>
            <option value="OPEN">Still open</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="fulfilment">Fulfilment</label>
          <select id="fulfilment" value={filters.fulfilment} onChange={set("fulfilment")}>
            <option value="">All</option>
            <option value="PICKUP">Pickup</option>
            <option value="DELIVERY">Delivery</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="from">From</label>
          <input id="from" type="date" value={filters.from} onChange={set("from")} />
        </div>
        <div className="field">
          <label htmlFor="to">To</label>
          <input id="to" type="date" value={filters.to} onChange={set("to")} />
        </div>
      </form>

      <StateBlock
        loading={loading && !data}
        error={data ? null : error}
        onRetry={refetch}
        empty={data?.orders.length === 0 ? (filters.q || filters.status || filters.from || filters.to || filters.fulfilment ? "No orders match these filters." : "No orders yet. They appear here the moment a customer checks out.") : undefined}
      >
        {data && (
          <div className="table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Placed</th>
                  <th>Customer</th>
                  <th>Fulfilment</th>
                  <th>Stage</th>
                  <th>Payment</th>
                  <th className="num">Items</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/admin/orders/${o.id}`}>{o.reference}</Link>
                    </td>
                    <td>{new Date(o.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td>{o.customerName}</td>
                    <td>{o.fulfilment === "PICKUP" ? "Pickup" : "Delivery"}</td>
                    <td>
                      <span className="status" data-s={o.status}>
                        {STATUS_LABEL[o.status]}
                      </span>
                    </td>
                    <td>
                      <span className="status" data-s={o.paymentStatus}>
                        {o.paymentStatus === "UNPAID" ? "Unpaid" : o.paymentStatus === "PAID" ? "Paid" : "Refunded"}
                      </span>
                    </td>
                    <td className="num">{o.itemCount}</td>
                    <td className="num">{formatMoney(o.total, o.currencyCode)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </StateBlock>

      {data && pages > 1 && (
        <nav aria-label="Pages" className="adm-head" style={{ marginTop: 16 }}>
          <button type="button" className="btn btn--ghost" disabled={filters.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>
            Newer
          </button>
          <span className="adm-muted">
            Page {data.page} of {pages} · {data.total} orders
          </span>
          <button type="button" className="btn btn--ghost" disabled={filters.page >= pages} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>
            Older
          </button>
        </nav>
      )}
    </>
  );
}
