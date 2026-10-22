"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart";

const LINKS = [
  { href: "/menu", label: "Menu" },
  { href: "/#pour", label: "How it's made", wide: true },
  { href: "/#story", label: "Story" },
];

export function Nav({ brandName }: { brandName: string }) {
  const pathname = usePathname();
  const count = useCart().reduce((n, l) => n + l.quantity, 0);
  const [bump, setBump] = useState(false);
  const last = useRef(count);
  const mountedAt = useRef(0);
  useEffect(() => {
    mountedAt.current = performance.now();
  }, []);

  useEffect(() => {
    // The bag hydrates from localStorage just after mount; only a later increase is someone adding a drink.
    if (count > last.current && performance.now() - mountedAt.current > 500) {
      setBump(true);
    }
    last.current = count;
  }, [count]);

  return (
    <header className="nav">
      <div className="wrap nav__bar">
        <Link href="/" className="nav__brand" aria-label={`${brandName} home`}>
          <Image src="/images/peak-monogram.png" alt="" width={161} height={183} priority />
          <span>{brandName}</span>
        </Link>
        <nav aria-label="Main" style={{ marginLeft: "auto" }}>
          <ul className="nav__links">
            {LINKS.map((l) => (
              <li key={l.href} className={l.wide ? "nav__wide" : undefined}>
                <Link href={l.href} aria-current={pathname === l.href ? "page" : undefined}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <Link href="/bag" className="btn btn--pink nav__bag" aria-label={`Bag, ${count} item${count === 1 ? "" : "s"}`}>
          Bag{" "}
          <span className="nav__count" data-bump={bump} onAnimationEnd={() => setBump(false)}>
            {count}
          </span>
        </Link>
      </div>
    </header>
  );
}
