import type { Metadata } from "next";
import { CheckoutForm } from "@/components/CheckoutForm";
import { getSettings } from "@/lib/api";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  return (
    <div className="wrap">
      <CheckoutForm settings={await getSettings()} />
    </div>
  );
}
