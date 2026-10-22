import type { Metadata } from "next";
import { OrderStatus } from "./OrderStatus";

// The URL carries the private order token: never send it on as a referrer.
export const metadata: Metadata = { title: "Your order", robots: { index: false }, referrer: "no-referrer" };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ reference: string }>; searchParams: Promise<{ token?: string }> }) {
  const [{ reference }, { token }] = await Promise.all([params, searchParams]);
  return (
    <div className="wrap" style={{ paddingTop: 48 }}>
      <OrderStatus reference={reference} token={token ?? null} />
    </div>
  );
}
