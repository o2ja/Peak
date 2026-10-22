"use client";
import Link from "next/link";
import { DrinkPicture } from "@/components/DrinkPicture";
import { OrderSummary } from "@/components/OrderSummary";
import { cart, useCart } from "@/lib/cart";
import { useQuote } from "@/lib/useQuote";
import { formatMoney } from "@/lib/format";

export default function BagPage() {
  const lines = useCart();
  const quote = useQuote(lines, "PICKUP");
  const priced = (key: string) => {
    const i = lines.findIndex((l) => l.key === key);
    return quote.quote?.lines[i];
  };

  if (lines.length === 0) {
    return (
      <div className="wrap empty" style={{ minHeight: "60svh" }}>
        <h1 style={{ fontSize: "var(--t-head)" }}>Your bag is empty</h1>
        <p>Start with a matcha, or anything that catches your eye.</p>
        <Link className="btn btn--pink" href="/menu">
          Browse the menu
        </Link>
      </div>
    );
  }

  return (
    <div className="wrap flow">
      <div>
        <h1>Your bag</h1>
        <ul className="lines">
          {lines.map((l) => {
            const p = priced(l.key);
            return (
              <li key={l.key} className="line">
                <span className="tile">
                  <DrinkPicture imageUrl={l.imageUrl} liquid={l.liquidColor} layer={l.layerColor} />
                </span>
                <div>
                  <p className="line__name">{l.name}</p>
                  {l.optionLabels.length > 0 && <p className="line__opts">{l.optionLabels.join(" · ")}</p>}
                  <div className="line__actions">
                    <div className="qty" role="group" aria-label={`Quantity of ${l.name}`}>
                      <button type="button" onClick={() => cart.setQuantity(l.key, l.quantity - 1)} aria-label={l.quantity === 1 ? `Remove ${l.name}` : "One fewer"}>
                        −
                      </button>
                      <output aria-live="polite">{l.quantity}</output>
                      <button type="button" onClick={() => cart.setQuantity(l.key, l.quantity + 1)} aria-label="One more" disabled={l.quantity >= 50}>
                        +
                      </button>
                    </div>
                    <Link className="textbtn" href={`/menu/${l.slug}?edit=${l.key}`}>
                      Change
                    </Link>
                    <button type="button" className="textbtn" onClick={() => cart.remove(l.key)}>
                      Remove
                    </button>
                  </div>
                </div>
                <p className="line__total">{p && quote.quote ? formatMoney(p.lineTotal, quote.quote.currencyCode) : "—"}</p>
              </li>
            );
          })}
        </ul>
      </div>
      <OrderSummary state={quote}>
        {quote.status === "ok" ? (
          <Link className="btn btn--pink" href="/checkout">
            Checkout
          </Link>
        ) : (
          <span className="btn btn--pink" aria-disabled="true">
            Checkout
          </span>
        )}
      </OrderSummary>
    </div>
  );
}
