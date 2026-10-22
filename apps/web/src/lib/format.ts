// Display only. Authoritative amounts are computed by the API; client sums are previews.
const DECIMALS: Record<string, number> = { JOD: 3, KWD: 3, BHD: 3 };

export function formatMoney(amount: string | number, currency: string) {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    minimumFractionDigits: DECIMALS[currency] ?? 2,
    maximumFractionDigits: DECIMALS[currency] ?? 2,
  }).format(n);
}

/** Exact sum of fixed-point strings in thousandths, so previews don't drift like floats. */
export const toMilli = (v: string) => Math.round(Number(v) * 1000);
export const fromMilli = (m: number) => (m / 1000).toFixed(3);

export const STATUS_LABEL = {
  PENDING: "Received",
  CONFIRMED: "Confirmed",
  PREPARING: "Being made",
  READY: "Ready for pickup",
  COMPLETED: "Collected",
  CANCELLED: "Cancelled",
} as const;
