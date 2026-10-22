import { formatMoney } from "@/lib/format";
import type { QuoteState } from "@/lib/useQuote";

/** Server-priced totals. While a new quote loads, the previous one stays visible but marked as updating. */
export function OrderSummary({ state, children }: { state: QuoteState; children?: React.ReactNode }) {
  const q = state.quote;
  return (
    <aside className="summary" aria-labelledby="summary-title" aria-busy={state.status === "loading"}>
      <h2 id="summary-title">Summary</h2>
      {state.status === "error" && (
        <div className="notice notice--error" role="alert">
          <p>{state.error?.message}</p>
          {state.error?.body.details && (
            <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
              {state.error.body.details.map((d, i) => (
                <li key={i}>{d.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {q && (
        <dl style={{ opacity: state.status === "loading" ? 0.5 : 1 }}>
          <div>
            <dt>Subtotal</dt>
            <dd>{formatMoney(q.subtotal, q.currencyCode)}</dd>
          </div>
          {Number(q.deliveryFee) > 0 && (
            <div>
              <dt>Delivery</dt>
              <dd>{formatMoney(q.deliveryFee, q.currencyCode)}</dd>
            </div>
          )}
          {Number(q.discountTotal) > 0 && (
            <div>
              <dt>Discount</dt>
              <dd>−{formatMoney(q.discountTotal, q.currencyCode)}</dd>
            </div>
          )}
          <div className="summary__total">
            <dt>Total</dt>
            <dd>{formatMoney(q.total, q.currencyCode)}</dd>
          </div>
        </dl>
      )}
      {!q && state.status === "loading" && <p>Checking prices…</p>}
      {children}
    </aside>
  );
}
