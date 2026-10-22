"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";

const NAV = [
  { href: "/admin", label: "Today" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/menu", label: "Menu items" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/settings", label: "Site & ordering" },
  { href: "/admin/activity", label: "Activity" },
];

export function AdminShell({ admin, children }: { admin: { name: string; email: string }; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <div className="adm">
      <aside className="adm-side">
        <Link href="/admin" className="adm-brand">
          <Image src="/images/peak-monogram.png" alt="" width={161} height={183} />
          peak <small>counter</small>
        </Link>
        <nav aria-label="Dashboard">
          <ul className="adm-nav">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} aria-current={active(n.href) ? "page" : undefined}>
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="adm-user">
          <span>
            Signed in as <strong>{admin.name}</strong>
          </span>
          <Link href="/" className="textbtn" style={{ padding: 0 }}>
            View site
          </Link>
          <button
            type="button"
            className="textbtn"
            style={{ padding: 0, justifySelf: "start" }}
            disabled={leaving}
            onClick={async () => {
              setLeaving(true);
              await api("/api/admin/auth/logout", { method: "POST" }).catch(() => {});
              router.replace("/admin/login");
              router.refresh();
            }}
          >
            {leaving ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>
      <main className="adm-main" id="main">
        {children}
      </main>
    </div>
  );
}
