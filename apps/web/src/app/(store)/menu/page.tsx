import type { Metadata } from "next";
import { MenuBrowser } from "@/components/MenuBrowser";
import { getMenu, getSettings } from "@/lib/api";

export const metadata: Metadata = { title: "Menu", description: "Iced matcha, lattes, teas, shakes and desserts. Choose your drink and order ahead." };

export default async function MenuPage() {
  const [settings, categories] = await Promise.all([getSettings(), getMenu()]);
  return (
    <>
      <div className="wrap menu-intro" data-reveal>
        <h1>Menu</h1>
        <p>{settings.acceptingOrders ? "Pick a drink, make it yours and order ahead for pickup." : "Have a look around. Online ordering is paused for now."}</p>
      </div>
      <MenuBrowser categories={categories} currency={settings.currencyCode} />
    </>
  );
}
