import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Motion } from "@/components/Motion";
import { getSettings } from "@/lib/api";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const s = await getSettings();
    return {
      title: { default: s.seoTitle, template: `%s · ${s.brandName}` },
      description: s.seoDescription,
      openGraph: { title: s.seoTitle, description: s.seoDescription, siteName: s.brandName, type: "website", images: ["/images/photos/pink-table.jpg"] },
      twitter: { card: "summary_large_image" },
    };
  } catch {
    return { title: "PEAK" };
  }
}

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  let settings;
  try {
    settings = await getSettings();
  } catch {
    // The layout sits above (store)/error.tsx, so an API outage is handled here.
    return (
      <main className="wrap empty" style={{ minHeight: "80svh" }}>
        <h1 style={{ fontSize: "var(--t-head)" }}>We&apos;ll be right back</h1>
        <p>PEAK&apos;s menu service isn&apos;t answering right now. Please refresh in a minute.</p>
      </main>
    );
  }
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {settings.announcement && <p className="announce">{settings.announcement}</p>}
      <Nav brandName={settings.brandName} />
      <main id="main">{children}</main>
      <Footer settings={settings} />
      <Motion />
    </>
  );
}
