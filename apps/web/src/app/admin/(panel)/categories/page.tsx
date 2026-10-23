"use client";
import { useState, type FormEvent } from "react";
import { ConfirmButton, StateBlock, useToast } from "@/components/admin/ui";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import type { AdminCategory } from "@/lib/types";

type Draft = { name: string; slug: string; description: string; liquidColor: string; layerColor: string; isActive: boolean };
const empty: Draft = { name: "", slug: "", description: "", liquidColor: "", layerColor: "", isActive: true };
const toDraft = (c: AdminCategory): Draft => ({ name: c.name, slug: c.slug, description: c.description ?? "", liquidColor: c.liquidColor ?? "", layerColor: c.layerColor ?? "", isActive: c.isActive });
const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function CategoryForm({ initial, submitLabel, onSubmit, onCancel }: { initial: Draft; submitLabel: string; onSubmit: (d: Draft) => Promise<boolean>; onCancel?: () => void }) {
  const [d, setD] = useState(initial);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const ok = await onSubmit(d);
    setBusy(false);
    if (ok && !onCancel) setD(empty);
  };
  return (
    <form className="adm-form" onSubmit={submit} style={{ maxWidth: "none" }}>
      <div className="row3">
        <div className="field">
          <label htmlFor={`${submitLabel}-name`}>Name</label>
          <input
            id={`${submitLabel}-name`}
            value={d.name}
            required
            onChange={(e) => {
              set("name", e.target.value);
              if (initial === empty) set("slug", slugify(e.target.value));
            }}
          />
        </div>
        <div className="field">
          <label htmlFor={`${submitLabel}-slug`}>Web address</label>
          <input id={`${submitLabel}-slug`} value={d.slug} required onChange={(e) => set("slug", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor={`${submitLabel}-desc`}>Description</label>
          <input id={`${submitLabel}-desc`} value={d.description} maxLength={300} onChange={(e) => set("description", e.target.value)} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "end" }}>
        <label className="check">
          <input type="checkbox" checked={Boolean(d.liquidColor)} onChange={(e) => set("liquidColor", e.target.checked ? "#7fa650" : "")} /> Show in the hand-held cup selector
        </label>
        {d.liquidColor && (
          <>
            <div className="field">
              <label htmlFor={`${submitLabel}-liq`}>Cup colour</label>
              <input id={`${submitLabel}-liq`} type="color" value={d.liquidColor} onChange={(e) => set("liquidColor", e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor={`${submitLabel}-lay`}>Bottom layer</label>
              <input id={`${submitLabel}-lay`} type="color" value={d.layerColor || "#f3f0e6"} onChange={(e) => set("layerColor", e.target.value)} />
            </div>
          </>
        )}
        <label className="check">
          <input type="checkbox" checked={d.isActive} onChange={(e) => set("isActive", e.target.checked)} /> Visible on the site
        </label>
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default function CategoriesPage() {
  const { data, error, loading, refetch } = useApi<AdminCategory[]>("/api/admin/categories");
  const toast = useToast();
  const [editing, setEditing] = useState<string | null>(null);

  const save = async (d: Draft, id?: string) => {
    try {
      const body = { ...d, description: d.description || null, liquidColor: d.liquidColor || null, layerColor: d.liquidColor ? d.layerColor || null : null };
      await api(id ? `/api/admin/categories/${id}` : "/api/admin/categories", { method: id ? "PUT" : "POST", json: body });
      toast.show("ok", id ? "Category saved." : "Category created.");
      setEditing(null);
      refetch();
      return true;
    } catch (e) {
      const err = e as ApiError;
      toast.show("error", err.body.details?.[0] ? `${err.body.details[0].path}: ${err.body.details[0].message}` : err.message);
      return false;
    }
  };

  const move = async (idx: number, dir: -1 | 1) => {
    if (!data) return;
    const ids = data.map((c) => c.id);
    const j = idx + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    try {
      await api("/api/admin/categories/reorder", { method: "POST", json: { ids } });
      refetch();
    } catch (e) {
      toast.show("error", (e as ApiError).message);
    }
  };

  return (
    <>
      <div className="adm-head">
        <h1>Categories</h1>
      </div>
      <section className="adm-panel" aria-labelledby="new-title" style={{ marginBottom: 16 }}>
        <h2 id="new-title">New category</h2>
        <CategoryForm initial={empty} submitLabel="Create" onSubmit={(d) => save(d)} />
      </section>
      <StateBlock loading={loading && !data} error={data ? null : error} onRetry={refetch} empty={data?.length === 0 ? "No categories yet." : undefined}>
        <div className="table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Name</th>
                <th>Cup selector</th>
                <th className="num">Items</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {data?.map((c, i) =>
                editing === c.id ? (
                  <tr key={c.id}>
                    <td colSpan={6}>
                      <CategoryForm initial={toDraft(c)} submitLabel="Save" onSubmit={(d) => save(d, c.id)} onCancel={() => setEditing(null)} />
                    </td>
                  </tr>
                ) : (
                  <tr key={c.id}>
                    <td>
                      <button type="button" className="textbtn" aria-label={`Move ${c.name} up`} onClick={() => move(i, -1)} disabled={i === 0}>
                        ↑
                      </button>{" "}
                      <button type="button" className="textbtn" aria-label={`Move ${c.name} down`} onClick={() => move(i, 1)} disabled={i === data.length - 1}>
                        ↓
                      </button>
                    </td>
                    <td>
                      <strong>{c.name}</strong> <span className="adm-muted">/{c.slug}</span>
                    </td>
                    <td>
                      {c.liquidColor ? (
                        <span style={{ display: "inline-flex", gap: 4 }} aria-label="Shown in selector">
                          <span style={{ width: 16, height: 16, borderRadius: 4, background: c.liquidColor }} />
                          {c.layerColor && <span style={{ width: 16, height: 16, borderRadius: 4, background: c.layerColor, border: "1px solid #ddd" }} />}
                        </span>
                      ) : (
                        <span className="adm-muted">—</span>
                      )}
                    </td>
                    <td className="num">{c.itemCount}</td>
                    <td>
                      <span className="status" data-s={c.isActive ? "READY" : "CANCELLED"}>
                        {c.isActive ? "Visible" : "Archived"}
                      </span>
                    </td>
                    <td style={{ display: "flex", gap: 12 }}>
                      <button type="button" className="textbtn" onClick={() => setEditing(c.id)}>
                        Edit
                      </button>
                      {c.isActive ? (
                        <ConfirmButton
                          label="Archive"
                          className="textbtn"
                          title={`Archive ${c.name}?`}
                          body="The category and all its items disappear from the public menu until restored. Nothing is deleted."
                          confirmLabel="Archive"
                          danger
                          onConfirm={async () => {
                            await save({ ...toDraft(c), isActive: false }, c.id);
                          }}
                        />
                      ) : (
                        <button type="button" className="textbtn" onClick={() => save({ ...toDraft(c), isActive: true }, c.id)}>
                          Restore
                        </button>
                      )}
                      <ConfirmButton
                        label="Delete"
                        className="textbtn"
                        title={`Delete ${c.name}?`}
                        body={c.itemCount > 0 ? `It still holds ${c.itemCount} item(s). Move them to another category first, or archive instead.` : "This permanently removes the empty category."}
                        confirmLabel="Delete"
                        danger
                        disabled={c.itemCount > 0}
                        onConfirm={async () => {
                          try {
                            await api(`/api/admin/categories/${c.id}`, { method: "DELETE" });
                            toast.show("ok", "Category deleted.");
                            refetch();
                          } catch (e) {
                            toast.show("error", (e as ApiError).message);
                          }
                        }}
                      />
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </StateBlock>
      {toast.node}
    </>
  );
}
