"use client";
import { useState, type FormEvent } from "react";
import { StateBlock, useToast } from "@/components/admin/ui";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import type { AdminSettings } from "@/lib/types";

type TextKey = {
  [K in keyof AdminSettings]: AdminSettings[K] extends string | null ? K : never;
}[keyof AdminSettings];

const SECTIONS: { title: string; hint?: string; fields: { key: TextKey; label: string; long?: boolean; hint?: string }[] }[] = [
  {
    title: "Home page",
    fields: [
      { key: "heroHeading", label: "Headline", hint: "Two short lines read best, around 20 characters." },
      { key: "heroSubheading", label: "Line under the headline", long: true },
      { key: "heroCtaLabel", label: "Button label" },
      { key: "heroCtaHref", label: "Button link", hint: "A path like /menu or a full https:// link." },
      { key: "announcement", label: "Announcement bar", hint: "Leave empty to hide it." },
      { key: "storyHeading", label: "Story heading", hint: "Leave empty to hide the story section." },
      { key: "storyBody", label: "Story text", long: true, hint: "Blank lines start a new paragraph." },
    ],
  },
  {
    title: "Business details",
    hint: "Leave anything PEAK hasn't confirmed empty. Empty fields are hidden on the site.",
    fields: [
      { key: "brandName", label: "Brand name" },
      { key: "address", label: "Address" },
      { key: "mapUrl", label: "Map link" },
      { key: "openingHours", label: "Opening hours", long: true },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "instagramUrl", label: "Instagram link" },
      { key: "timezone", label: "Store timezone", hint: "IANA name, e.g. Asia/Amman. Used for “today” in the dashboard." },
    ],
  },
  {
    title: "Ordering",
    fields: [
      { key: "currencyCode", label: "Currency (ISO code)" },
      { key: "deliveryFee", label: "Delivery fee" },
      { key: "orderInstructions", label: "Instructions shown at checkout", long: true },
      { key: "policyText", label: "Order policy", long: true },
    ],
  },
  {
    title: "Search & sharing",
    fields: [
      { key: "seoTitle", label: "Page title" },
      { key: "seoDescription", label: "Description", long: true },
    ],
  },
];

const FLAGS: { key: "acceptingOrders" | "pickupEnabled" | "deliveryEnabled" | "payAtPickupEnabled"; label: string }[] = [
  { key: "acceptingOrders", label: "Accepting online orders" },
  { key: "pickupEnabled", label: "Pickup" },
  { key: "deliveryEnabled", label: "Delivery (only once PEAK confirms zones and fees)" },
  { key: "payAtPickupEnabled", label: "Pay at pickup" },
];

function SettingsForm({ initial }: { initial: AdminSettings }) {
  const [s, setS] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      setS(await api<AdminSettings>("/api/admin/settings", { method: "PUT", json: s }));
      toast.show("ok", "Saved. The site uses these settings now.");
    } catch (err) {
      const e = err as ApiError;
      const fe: Record<string, string> = {};
      e.body.details?.forEach((d) => d.path && (fe[d.path] = d.message));
      setErrors(fe);
      toast.show("error", Object.keys(fe).length ? "Some fields need fixing." : e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="adm-form" onSubmit={save} noValidate>
      {SECTIONS.map((sec) => (
        <section key={sec.title} className="adm-panel" aria-labelledby={sec.title}>
          <h2 id={sec.title}>{sec.title}</h2>
          {sec.hint && <p className="adm-muted" style={{ marginBottom: 12 }}>{sec.hint}</p>}
          <div className="adm-grid">
            {sec.fields.map((f) => {
              const Tag = f.long ? "textarea" : "input";
              return (
                <div key={f.key} className="field">
                  <label htmlFor={f.key}>{f.label}</label>
                  <Tag id={f.key} value={(s[f.key] as string | null) ?? ""} aria-invalid={!!errors[f.key]} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setS({ ...s, [f.key]: e.target.value })} />
                  {f.hint && <span className="field__hint">{f.hint}</span>}
                  {errors[f.key] && <span className="field__error">{errors[f.key]}</span>}
                </div>
              );
            })}
          </div>
          {sec.title === "Ordering" && (
            <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
              {FLAGS.map((f) => (
                <label key={f.key} className="check">
                  <input type="checkbox" checked={s[f.key]} onChange={(e) => setS({ ...s, [f.key]: e.target.checked })} /> {f.label}
                </label>
              ))}
              <p className="adm-muted">Online card payment is not connected. It needs a payment provider account and credentials first.</p>
            </div>
          )}
        </section>
      ))}
      <button className="btn" type="submit" disabled={saving} style={{ justifySelf: "start" }}>
        {saving ? "Saving…" : "Save settings"}
      </button>
      {toast.node}
    </form>
  );
}

export default function SettingsPage() {
  const { data, error, loading, refetch } = useApi<AdminSettings>("/api/admin/settings");
  return (
    <>
      <div className="adm-head">
        <h1>Site &amp; ordering</h1>
      </div>
      <StateBlock loading={loading && !data} error={data ? null : error} onRetry={refetch}>
        {data && <SettingsForm initial={data} />}
      </StateBlock>
    </>
  );
}
