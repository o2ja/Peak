"use client";
import Link from "next/link";
import { useState } from "react";
import { ConfirmButton, StateBlock, Thumb, useToast } from "@/components/admin/ui";
import { api, ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { useApi } from "@/lib/useApi";
import type { AdminCategory, MenuItem } from "@/lib/types";

export default function MenuItemsPage() {
  const items = useApi<MenuItem[]>("/api/admin/items");
  const cats = useApi<AdminCategory[]>("/api/admin/categories");
  const settings = useApi<{ currencyCode: string }>("/api/admin/settings");
  const toast = useToast();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const currency = settings.data?.currencyCode ?? "JOD";

  const list = (items.data ?? []).filter(
    (i) => (showArchived ? !i.isActive : i.isActive) && (!cat || i.categoryId === cat) && (!q || i.name.toLowerCase().includes(q.toLowerCase())),
  );

  async function patch(item: MenuItem, data: Partial<MenuItem>, done: string) {
    setPending(item.id);
    try {
      const updated = await api<MenuItem>(`/api/admin/items/${item.id}`, { method: "PATCH", json: data });
      items.setData((all) => all?.map((i) => (i.id === item.id ? updated : i)) ?? null);
      toast.show("ok", done);
    } catch (e) {
      toast.show("error", (e as ApiError).message);
    } finally {
      setPending(null);
    }
  }

  // Swap with the neighbour in the same category, then persist that category's full order.
  async function move(item: MenuItem, dir: -1 | 1) {
    const siblings = (items.data ?? []).filter((i) => i.categoryId === item.categoryId).sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = siblings.findIndex((i) => i.id === item.id);
    const j = idx + dir;
    if (j < 0 || j >= siblings.length) return;
    [siblings[idx], siblings[j]] = [siblings[j], siblings[idx]];
    setPending(item.id);
    try {
      await api("/api/admin/items/reorder", { method: "POST", json: { ids: siblings.map((s) => s.id) } });
      await items.refetch();
    } catch (e) {
      toast.show("error", (e as ApiError).message);
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      <div className="adm-head">
        <h1>Menu items</h1>
        <Link className="btn spacer" href="/admin/menu/new">
          New item
        </Link>
      </div>
      <div className="filters">
        <div className="field">
          <label htmlFor="q">Search</label>
          <input id="q" type="search" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="cat">Category</label>
          <select id="cat" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">All</option>
            {cats.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <label className="check">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Show archived only
        </label>
      </div>

      <StateBlock
        loading={items.loading && !items.data}
        error={items.data ? null : items.error}
        onRetry={items.refetch}
        empty={items.data && list.length === 0 ? (showArchived ? "No archived items." : "No items match. Create one with “New item”.") : undefined}
      >
        <div className="table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th aria-label="Picture" />
                <th>Item</th>
                <th>Category</th>
                <th className="num">Price</th>
                <th>On the menu</th>
                <th>Order</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {list.map((i) => (
                <tr key={i.id} aria-busy={pending === i.id}>
                  <td>
                    <Thumb imageUrl={i.imageUrl} liquid={i.liquidColor} layer={i.layerColor} />
                  </td>
                  <td>
                    <Link href={`/admin/menu/${i.id}`}>{i.name}</Link>
                    {i.isSeasonal && <span className="adm-muted"> · seasonal</span>}
                  </td>
                  <td>{i.categoryName}</td>
                  <td className="num">{formatMoney(i.basePrice, currency)}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="toggle"
                        aria-pressed={i.isAvailable}
                        disabled={pending === i.id || !i.isActive}
                        onClick={() => patch(i, { isAvailable: !i.isAvailable }, i.isAvailable ? `${i.name} marked sold out.` : `${i.name} is available again.`)}
                      >
                        {i.isAvailable ? "Available" : "Sold out"}
                      </button>
                      <button
                        type="button"
                        className="toggle"
                        aria-pressed={i.isFeatured}
                        disabled={pending === i.id || !i.isActive}
                        onClick={() => patch(i, { isFeatured: !i.isFeatured }, i.isFeatured ? "Removed from featured." : "Added to featured.")}
                      >
                        Featured
                      </button>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button type="button" className="textbtn" aria-label={`Move ${i.name} up`} disabled={pending !== null} onClick={() => move(i, -1)}>
                        ↑
                      </button>
                      <button type="button" className="textbtn" aria-label={`Move ${i.name} down`} disabled={pending !== null} onClick={() => move(i, 1)}>
                        ↓
                      </button>
                    </div>
                  </td>
                  <td>
                    {i.isActive ? (
                      <ConfirmButton
                        label="Archive"
                        className="textbtn"
                        title={`Archive ${i.name}?`}
                        body="It disappears from the public menu. Past orders keep their record, and you can restore it any time."
                        confirmLabel="Archive"
                        danger
                        onConfirm={() => patch(i, { isActive: false }, `${i.name} archived.`)}
                      />
                    ) : (
                      <button type="button" className="textbtn" onClick={() => patch(i, { isActive: true }, `${i.name} restored to the menu.`)}>
                        Restore
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </StateBlock>
      {toast.node}
    </>
  );
}
