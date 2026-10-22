"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { cart, useCart } from "@/lib/cart";
import { formatMoney, fromMilli, toMilli } from "@/lib/format";
import type { MenuItem } from "@/lib/types";

const defaults = (item: MenuItem) => item.options.flatMap((o) => o.values.filter((v) => v.isDefault).map((v) => v.id));

/** Choices, quantity and add-to-bag for one item. Totals shown here are previews; checkout re-prices on the server. */
export function ItemCustomizer({ item, currency, acceptingOrders }: { item: MenuItem; currency: string; acceptingOrders: boolean }) {
  const router = useRouter();
  const editKey = useSearchParams().get("edit");
  const lines = useCart();
  const editing = editKey ? lines.find((l) => l.key === editKey && l.menuItemId === item.id) : undefined;

  // Seed state once from the line being edited (if any). The bag hydrates after first paint, hence the lazy key.
  const [chosen, setChosen] = useState<string[] | null>(null);
  const [qty, setQty] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "added">("idle");
  const [showErrors, setShowErrors] = useState(false);
  const selected = chosen ?? editing?.optionValueIds ?? defaults(item);
  const quantity = qty ?? editing?.quantity ?? 1;

  const toggle = (optionId: string, valueId: string) => {
    const option = item.options.find((o) => o.id === optionId)!;
    const inOption = new Set(option.values.map((v) => v.id));
    const current = selected.filter((id) => inOption.has(id));
    const others = selected.filter((id) => !inOption.has(id));
    let next: string[];
    if (option.maxSelect === 1) next = [valueId];
    else if (current.includes(valueId)) next = current.filter((id) => id !== valueId);
    else if (current.length < option.maxSelect) next = [...current, valueId];
    else return;
    setChosen([...others, ...next]);
    setStatus("idle");
  };

  const problems = item.options
    .map((o) => {
      const n = o.values.filter((v) => selected.includes(v.id)).length;
      return n < o.minSelect ? `Choose ${o.minSelect === 1 ? "one" : o.minSelect} for ${o.name.toLowerCase()}.` : null;
    })
    .filter(Boolean) as string[];

  const unitMilli =
    toMilli(item.basePrice) +
    item.options.flatMap((o) => o.values).reduce((sum, v) => (selected.includes(v.id) ? sum + toMilli(v.priceDelta) : sum), 0);

  const add = () => {
    if (problems.length) {
      setShowErrors(true);
      return;
    }
    const labels = item.options.flatMap((o) => o.values.filter((v) => selected.includes(v.id)).map((v) => v.name));
    cart.add(
      {
        menuItemId: item.id,
        slug: item.slug,
        name: item.name,
        optionValueIds: selected,
        optionLabels: labels,
        quantity,
        unitPrice: fromMilli(unitMilli),
        liquidColor: item.liquidColor,
        layerColor: item.layerColor,
        imageUrl: item.imageUrl,
      },
      editing?.key,
    );
    if (editing) router.push("/bag");
    else setStatus("added");
  };

  const canOrder = item.isAvailable && acceptingOrders;

  return (
    <div>
      {item.options.map((o) => {
        const rule = o.minSelect === 1 && o.maxSelect === 1 ? "Choose one" : o.minSelect === 0 ? `Optional, up to ${o.maxSelect}` : `Choose ${o.minSelect}–${o.maxSelect}`;
        return (
          <fieldset key={o.id} className="opt">
            <legend>{o.name}</legend>
            <p className="opt__rule">{rule}</p>
            <div className="opt__choices">
              {o.values.map((v) => (
                <label key={v.id} className="choice">
                  <input
                    type={o.maxSelect === 1 ? "radio" : "checkbox"}
                    name={o.id}
                    checked={selected.includes(v.id)}
                    onChange={() => toggle(o.id, v.id)}
                    disabled={!canOrder}
                  />
                  <span>
                    {v.name}
                    {Number(v.priceDelta) !== 0 && ` +${formatMoney(v.priceDelta, currency)}`}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}

      {showErrors && problems.length > 0 && (
        <p className="notice notice--error" role="alert" style={{ marginTop: 24 }}>
          {problems.join(" ")}
        </p>
      )}

      {canOrder ? (
        <div className="item__buy">
          <div className="qty" role="group" aria-label="Quantity">
            <button type="button" onClick={() => setQty(Math.max(1, quantity - 1))} aria-label="One fewer">
              −
            </button>
            <output aria-live="polite">{quantity}</output>
            <button type="button" onClick={() => setQty(Math.min(50, quantity + 1))} aria-label="One more">
              +
            </button>
          </div>
          <button type="button" className="btn btn--pink" onClick={add}>
            <span>{editing ? "Update bag" : "Add to bag"}</span>
            <span>{formatMoney(fromMilli(unitMilli * quantity), currency)}</span>
          </button>
        </div>
      ) : (
        <p className="notice" style={{ marginTop: 32 }}>
          {item.isAvailable ? "Online ordering is paused right now." : "Sold out right now. Check back later."}
        </p>
      )}

      {status === "added" && (
        <p className="notice notice--ok" role="status" style={{ marginTop: 16 }}>
          Added to your bag. <Link className="link" href="/bag">Go to bag</Link> or <Link className="link" href="/menu">keep browsing</Link>.
        </p>
      )}
    </div>
  );
}
