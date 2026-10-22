import Link from "next/link";
import type { PublicSettings } from "@/lib/types";

/** The page closes on baby pink: one line and the order button, three short lists, then the name at full width. */
export function Footer({ settings }: { settings: PublicSettings }) {
  const contact = [
    settings.address && { label: settings.address, href: settings.mapUrl },
    settings.phone && { label: settings.phone, href: `tel:${settings.phone.replace(/[^+\d]/g, "")}` },
    settings.email && { label: settings.email, href: `mailto:${settings.email}` },
  ].filter(Boolean) as { label: string; href: string | null }[];
  const handle = settings.instagramUrl?.match(/instagram\.com\/([^/?#]+)/)?.[1];

  return (
    <footer className="footer">
      <div className="wrap footer__top">
        <p className="footer__lead">{settings.seoDescription}</p>
        <Link className="btn btn--pink" href="/menu">
          Order ahead
        </Link>
      </div>

      <div className="wrap footer__cols">
        <nav aria-label="Footer">
          <h2>Explore</h2>
          <ul>
            <li>
              <Link href="/menu">Menu</Link>
            </li>
            <li>
              <Link href="/#pour">How it&apos;s made</Link>
            </li>
            <li>
              <Link href="/#story">Story</Link>
            </li>
            <li>
              <Link href="/bag">Your bag</Link>
            </li>
          </ul>
        </nav>
        <div>
          <h2>Find us</h2>
          <ul>
            {contact.length === 0 && <li>Address and hours coming soon.</li>}
            {contact.map((c) => (
              <li key={c.label}>{c.href ? <a href={c.href}>{c.label}</a> : c.label}</li>
            ))}
            {settings.openingHours && <li style={{ whiteSpace: "pre-line" }}>{settings.openingHours}</li>}
            {settings.orderInstructions && <li>{settings.orderInstructions}</li>}
          </ul>
        </div>
        <div>
          <h2>Follow</h2>
          <ul>
            <li>
              {settings.instagramUrl ? (
                <a href={settings.instagramUrl} rel="noopener noreferrer" target="_blank">
                  {handle ? `@${handle} on Instagram` : "Instagram"}
                </a>
              ) : (
                "Links coming soon."
              )}
            </li>
          </ul>
        </div>
      </div>

      <p className="footer__mark">{settings.brandName}</p>

      <div className="wrap footer__base">
        <span>© {new Date().getFullYear()} PEAK Jordan</span>
        <a href="#main">Back to top</a>
      </div>
    </footer>
  );
}
