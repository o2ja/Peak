"use client";
import Link from "next/link";
import { useDeferredValue, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { DrinkPicture } from "./DrinkPicture";
import { formatMoney } from "@/lib/format";
import type { MenuCategory } from "@/lib/types";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Full menu in admin-defined order: category filter and search over the already-loaded API data. */
export function MenuBrowser({ categories, currency }: { categories: MenuCategory[]; currency: string }) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const tools = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const q = useDeferredValue(query.trim().toLowerCase());

  // Tiles rise in, row by row, as they come into view; re-dealt whenever the filter or search changes the list.
  // Hidden only by script, so without it (or with reduced motion) every tile is simply there.
  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const items = gsap.utils.toArray<HTMLElement>(".cat-tiles > li, .catalogue > li", root.current);
      gsap.set(items, { autoAlpha: 0, y: 28 });
      ScrollTrigger.batch(items, {
        start: "top 92%",
        once: true,
        onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.07, overwrite: true }),
      });
    },
    { scope: root, dependencies: [cat, q], revertOnUpdate: true },
  );
  const visible = categories
    .filter((c) => !cat || c.slug === cat)
    .map((c) => ({ ...c, items: c.items.filter((i) => !q || `${i.name} ${i.shortDescription ?? ""} ${c.name}`.toLowerCase().includes(q)) }))
    .filter((c) => c.items.length > 0);

  const pick = (slug: string | null, scroll = false) => {
    setCat(slug);
    if (scroll) tools.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div ref={root}>
      <div className="wrap">
        <ul className="cat-tiles" aria-label="Categories">
          {categories.map((c, n) => {
            const face = c.items.find((i) => i.imageUrl) ?? c.items[0];
            return (
              <li key={c.id}>
                <button type="button" className="cat-tile" aria-pressed={cat === c.slug} onClick={() => pick(cat === c.slug ? null : c.slug, true)}>
                  <span className="tile" data-field={n % 4}>
                    {face && <DrinkPicture imageUrl={face.imageUrl} liquid={face.liquidColor ?? c.liquidColor} layer={face.layerColor} />}
                  </span>
                  {c.name}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="menu-tools wrap" ref={tools}>
        <div className="chips" role="group" aria-label="Filter by category">
          <button type="button" className="chip" aria-pressed={cat === null} onClick={() => pick(null)}>
            All
          </button>
          {categories.map((c) => (
            <button key={c.id} type="button" className="chip" aria-pressed={cat === c.slug} onClick={() => pick(c.slug)}>
              {c.name}
            </button>
          ))}
        </div>
        <div className="field search">
          <label htmlFor="menu-search" className="visually-hidden">
            Search the menu
          </label>
          <input id="menu-search" type="search" placeholder="Search drinks and desserts" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="wrap" style={{ paddingBottom: "var(--section)" }}>
        {categories.length === 0 && (
          <div className="empty">
            <p>The menu is being prepared. Check back soon.</p>
          </div>
        )}
        {categories.length > 0 && visible.length === 0 && (
          <div className="empty" role="status">
            <p>Nothing matches “{query}”{cat && ` in ${categories.find((c) => c.slug === cat)?.name}`}.</p>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                setQuery("");
                setCat(null);
              }}
            >
              Show everything
            </button>
          </div>
        )}
        {visible.map((c) => (
          <section key={c.id} id={c.slug} className="menu-cat" aria-labelledby={`cat-${c.slug}`}>
            <div className="menu-cat__head">
              <h2 id={`cat-${c.slug}`}>{c.name}</h2>
              {c.description && <p>{c.description}</p>}
            </div>
            <ul className="catalogue">
              {c.items.map((i, n) => (
                <li key={i.id}>
                  <Link className="spec" href={`/menu/${i.slug}`} data-out={!i.isAvailable}>
                    <span className="tile" data-field={n % 4}>
                      <DrinkPicture imageUrl={i.imageUrl} liquid={i.liquidColor} layer={i.layerColor} />
                    </span>
                    <span>
                      <span className="spec__top">
                        <span className="spec__name">{i.name}</span>
                        <span className="spec__price">{formatMoney(i.basePrice, currency)}</span>
                      </span>
                      {i.shortDescription && <span className="spec__desc">{i.shortDescription}</span>}
                      {(!i.isAvailable || i.isSeasonal) && (
                        <span className="spec__tags">
                          {!i.isAvailable && <span className="tag tag--out">Sold out</span>}
                          {i.isSeasonal && <span className="tag">Seasonal</span>}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
