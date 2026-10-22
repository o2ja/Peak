"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState, type FormEvent } from "react";
import { StateBlock, useToast } from "@/components/admin/ui";
import { DrinkPicture } from "@/components/DrinkPicture";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import type { AdminCategory, MenuItem } from "@/lib/types";

type OptionDraft = { name: string; minSelect: number; maxSelect: number; values: { name: string; priceDelta: string; isDefault: boolean; isAvailable: boolean }[] };
type FieldErrors = Record<string, string>;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

const toDraft = (item: MenuItem | null): OptionDraft[] =>
  item?.options.map((o) => ({
    name: o.name,
    minSelect: o.minSelect,
    maxSelect: o.maxSelect,
    values: o.values.map((v) => ({ name: v.name, priceDelta: v.priceDelta, isDefault: v.isDefault, isAvailable: v.isAvailable ?? true })),
  })) ?? [];

function OptionsEditor({ value, onChange }: { value: OptionDraft[]; onChange: (v: OptionDraft[]) => void }) {
  const set = (i: number, o: Partial<OptionDraft>) => onChange(value.map((x, j) => (j === i ? { ...x, ...o } : x)));
  const setVal = (i: number, k: number, v: Partial<OptionDraft["values"][number]>) => set(i, { values: value[i].values.map((x, j) => (j === k ? { ...x, ...v } : x)) });
  return (
    <div className="adm-grid">
      {value.length === 0 && <p className="adm-muted">No choices. Add one only if PEAK really offers it (size, milk, extras…).</p>}
      {value.map((o, i) => (
        <fieldset key={i} className="opt-editor">
          <legend className="visually-hidden">Choice group {i + 1}</legend>
          <div className="row3" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 8, alignItems: "end" }}>
            <div className="field">
              <label htmlFor={`o${i}`}>Group name</label>
              <input id={`o${i}`} value={o.name} onChange={(e) => set(i, { name: e.target.value })} placeholder="Size" required />
            </div>
            <div className="field">
              <label htmlFor={`o${i}min`}>Must pick at least</label>
              <input id={`o${i}min`} type="number" min={0} max={10} value={o.minSelect} onChange={(e) => set(i, { minSelect: Number(e.target.value) })} />
            </div>
            <div className="field">
              <label htmlFor={`o${i}max`}>At most</label>
              <input id={`o${i}max`} type="number" min={1} max={10} value={o.maxSelect} onChange={(e) => set(i, { maxSelect: Number(e.target.value) })} />
            </div>
            <button type="button" className="textbtn" onClick={() => onChange(value.filter((_, j) => j !== i))}>
              Remove group
            </button>
          </div>
          <div className="vals">
            {o.values.map((v, k) => (
              <div key={k} className="val">
                <div className="field">
                  <label htmlFor={`o${i}v${k}`} className={k ? "visually-hidden" : undefined}>
                    Choice
                  </label>
                  <input id={`o${i}v${k}`} value={v.name} onChange={(e) => setVal(i, k, { name: e.target.value })} placeholder="Large" required />
                </div>
                <div className="field">
                  <label htmlFor={`o${i}p${k}`} className={k ? "visually-hidden" : undefined}>
                    Price change
                  </label>
                  <input id={`o${i}p${k}`} inputMode="decimal" value={v.priceDelta} onChange={(e) => setVal(i, k, { priceDelta: e.target.value })} placeholder="0.000" />
                </div>
                <label className="check">
                  <input type="checkbox" checked={v.isDefault} onChange={(e) => setVal(i, k, { isDefault: e.target.checked })} /> Default
                </label>
                <label className="check">
                  <input type="checkbox" checked={v.isAvailable} onChange={(e) => setVal(i, k, { isAvailable: e.target.checked })} /> Available
                </label>
                <button type="button" className="textbtn" aria-label={`Remove ${v.name || "choice"}`} onClick={() => set(i, { values: o.values.filter((_, j) => j !== k) })}>
                  Remove
                </button>
              </div>
            ))}
            <button type="button" className="textbtn" style={{ justifySelf: "start" }} onClick={() => set(i, { values: [...o.values, { name: "", priceDelta: "0", isDefault: false, isAvailable: true }] })}>
              + Add choice
            </button>
          </div>
        </fieldset>
      ))}
      <button
        type="button"
        className="btn btn--ghost"
        style={{ justifySelf: "start" }}
        onClick={() => onChange([...value, { name: "", minSelect: 1, maxSelect: 1, values: [{ name: "", priceDelta: "0", isDefault: true, isAvailable: true }] }])}
      >
        Add a choice group
      </button>
    </div>
  );
}

function ItemForm({ item, categories }: { item: MenuItem | null; categories: AdminCategory[] }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({
    name: item?.name ?? "",
    slug: item?.slug ?? "",
    categoryId: item?.categoryId ?? categories[0]?.id ?? "",
    shortDescription: item?.shortDescription ?? "",
    description: item?.description ?? "",
    basePrice: item?.basePrice ?? "",
    imageUrl: item?.imageUrl ?? null,
    liquidColor: item?.liquidColor ?? "",
    layerColor: item?.layerColor ?? "",
    isActive: item?.isActive ?? true,
    isAvailable: item?.isAvailable ?? true,
    isFeatured: item?.isFeatured ?? false,
    isSeasonal: item?.isSeasonal ?? false,
  });
  const [options, setOptions] = useState<OptionDraft[]>(toDraft(item));
  const [slugTouched, setSlugTouched] = useState(Boolean(item));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function upload(file: File) {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return toast.show("error", "Use a PNG, JPEG or WebP image.");
    if (file.size > 3 * 1024 * 1024) return toast.show("error", "Images must be 3 MB or smaller.");
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    const body = new FormData();
    body.append("file", file);
    try {
      const { url } = await api<{ url: string }>("/api/admin/uploads", { method: "POST", body });
      set("imageUrl", url);
      toast.show("ok", "Image uploaded. Save the item to use it.");
    } catch (e) {
      setPreview(null);
      toast.show("error", (e as ApiError).message);
    } finally {
      setUploading(false);
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    const payload = { ...form, liquidColor: form.liquidColor || null, layerColor: form.layerColor || null };
    try {
      const saved = item
        ? await api<MenuItem>(`/api/admin/items/${item.id}`, { method: "PATCH", json: payload })
        : await api<MenuItem>("/api/admin/items", { method: "POST", json: payload });
      // Replacing choices gives them new ids (and invalidates bags holding the old ones), so only send real changes.
      try {
        if (JSON.stringify(options) !== JSON.stringify(toDraft(item))) await api(`/api/admin/items/${saved.id}/options`, { method: "PUT", json: options });
      } catch (err) {
        const e = err as ApiError;
        toast.show("error", `Item saved, but its choices were not: ${e.body.details?.[0]?.message ?? e.message}`);
        if (!item) router.replace(`/admin/menu/${saved.id}`);
        return;
      }
      toast.show("ok", "Saved. The public menu shows it now.");
      if (!item) router.replace(`/admin/menu/${saved.id}`);
    } catch (err) {
      const e = err as ApiError;
      const fe: FieldErrors = {};
      e.body.details?.forEach((d) => d.path && (fe[d.path] = d.message));
      setErrors(fe);
      toast.show("error", e.message);
    } finally {
      setSaving(false);
    }
  }

  const err = (k: string) => errors[k] && <span className="field__error">{errors[k]}</span>;
  const shownImage = preview ?? form.imageUrl;

  return (
    <form className="adm-form" onSubmit={save} noValidate>
      <div className="row">
        <div className="field">
          <label htmlFor="name">Name</label>
          <input
            id="name"
            value={form.name}
            required
            maxLength={80}
            aria-invalid={!!errors.name}
            onChange={(e) => {
              set("name", e.target.value);
              if (!slugTouched) set("slug", slugify(e.target.value));
            }}
          />
          {err("name")}
        </div>
        <div className="field">
          <label htmlFor="slug">Web address</label>
          <input
            id="slug"
            value={form.slug}
            required
            aria-invalid={!!errors.slug}
            onChange={(e) => {
              setSlugTouched(true);
              set("slug", e.target.value);
            }}
          />
          <span className="field__hint">/menu/{form.slug || "…"}</span>
          {err("slug")}
        </div>
      </div>
      <div className="row">
        <div className="field">
          <label htmlFor="cat">Category</label>
          <select id="cat" value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.isActive ? "" : " (archived)"}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="price">Base price</label>
          <input id="price" inputMode="decimal" value={form.basePrice} placeholder="3.250" required aria-invalid={!!errors.basePrice} onChange={(e) => set("basePrice", e.target.value)} />
          {err("basePrice")}
        </div>
      </div>
      <div className="field">
        <label htmlFor="short">Short description</label>
        <input id="short" value={form.shortDescription} maxLength={140} onChange={(e) => set("shortDescription", e.target.value)} />
        <span className="field__hint">Shown on the menu. Only state ingredients and allergens PEAK has confirmed.</span>
      </div>
      <div className="field">
        <label htmlFor="desc">Full description</label>
        <textarea id="desc" value={form.description} maxLength={1000} onChange={(e) => set("description", e.target.value)} />
      </div>

      <fieldset className="opt-editor">
        <legend style={{ fontWeight: 800 }}>Picture</legend>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div className="thumb" style={{ width: 96, height: 96 }}>
            <DrinkPicture imageUrl={shownImage} liquid={form.liquidColor || null} layer={form.layerColor || null} alt="Preview" />
          </div>
          <div className="field">
            <label htmlFor="file">Upload a photo (PNG, JPEG or WebP, up to 3 MB). A cut-out PNG or WebP with a transparent background also appears in the hand on the home page.</label>
            <input id="file" type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            {uploading && <span className="field__hint">Uploading…</span>}
          </div>
          {form.imageUrl && (
            <button
              type="button"
              className="textbtn"
              onClick={() => {
                set("imageUrl", null);
                setPreview(null);
              }}
            >
              Remove picture
            </button>
          )}
        </div>
        <div className="row">
          <div className="field">
            <label htmlFor="liquid">Drink colour (shown when there is no photo)</label>
            <input id="liquid" type="color" value={form.liquidColor || "#7fa650"} onChange={(e) => set("liquidColor", e.target.value)} />
            <button type="button" className="textbtn" style={{ justifySelf: "start" }} onClick={() => set("liquidColor", "")}>
              No colour (shows the P mark)
            </button>
          </div>
          <div className="field">
            <label htmlFor="layer">Bottom layer colour (milk, purée…)</label>
            <input id="layer" type="color" value={form.layerColor || "#f3f0e6"} onChange={(e) => set("layerColor", e.target.value)} />
            <button type="button" className="textbtn" style={{ justifySelf: "start" }} onClick={() => set("layerColor", "")}>
              No layer
            </button>
          </div>
        </div>
      </fieldset>

      <fieldset className="opt-editor">
        <legend style={{ fontWeight: 800 }}>Visibility</legend>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <label className="check">
            <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} /> On the public menu
          </label>
          <label className="check">
            <input type="checkbox" checked={form.isAvailable} onChange={(e) => set("isAvailable", e.target.checked)} /> Available (untick = sold out)
          </label>
          <label className="check">
            <input type="checkbox" checked={form.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} /> Featured on home
          </label>
          <label className="check">
            <input type="checkbox" checked={form.isSeasonal} onChange={(e) => set("isSeasonal", e.target.checked)} /> Seasonal
          </label>
        </div>
      </fieldset>

      <section aria-labelledby="opts-title">
        <h2 id="opts-title" style={{ marginBottom: 8 }}>
          Choices
        </h2>
        <OptionsEditor value={options} onChange={setOptions} />
      </section>

      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" type="submit" disabled={saving || uploading}>
          {saving ? "Saving…" : item ? "Save changes" : "Create item"}
        </button>
        {item && (
          <Link className="btn btn--ghost" href={`/menu/${item.slug}`} target="_blank">
            View on site
          </Link>
        )}
      </div>
      {toast.node}
    </form>
  );
}

export default function ItemEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const isNew = id === "new";
  const item = useApi<MenuItem>(isNew ? null : `/api/admin/items/${id}`);
  const cats = useApi<AdminCategory[]>("/api/admin/categories");
  const ready = cats.data && (isNew || item.data);

  return (
    <>
      <p>
        <Link className="textbtn" href="/admin/menu">
          ← Menu items
        </Link>
      </p>
      <div className="adm-head">
        <h1>{isNew ? "New item" : (item.data?.name ?? "Edit item")}</h1>
      </div>
      <StateBlock loading={!ready && !cats.error && !item.error} error={cats.error ?? (isNew ? null : item.error)} onRetry={() => (cats.refetch(), item.refetch())}>
        {ready && (cats.data!.length === 0 ? <p>Create a category first.</p> : <ItemForm key={item.data?.updatedAt ?? "new"} item={isNew ? null : item.data} categories={cats.data!} />)}
      </StateBlock>
    </>
  );
}
