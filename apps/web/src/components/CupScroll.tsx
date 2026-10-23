"use client";
import Link from "next/link";
import { useRef, useState, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { scroller } from "./Motion";
import { formatMoney } from "@/lib/format";
import type { MenuItem } from "@/lib/types";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
// The more colourful of a drink's two colours tints the room, washed 74% toward white.
const room = (d: MenuItem) => {
  const pick =
    [d.layerColor, d.liquidColor].find((c) => c && (([r, g, b]) => (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(r, g, b, 1))(rgb(c)) > 0.3) ??
    d.liquidColor ??
    "#f4a5bf";
  const [r, g, b] = rgb(pick).map((v) => Math.round(v * 0.26 + 255 * 0.74));
  return `rgb(${r}, ${g}, ${b})`;
};

/**
 * Cut-out photos are cropped differently, so each cup is measured once loaded: its body (75% of the way down) is
 * scaled to the slot's width and its base set on the palm. Before that, the picture is simply contained in the slot.
 */
const seat = (img: HTMLImageElement) => {
  if (!img.naturalWidth) return;
  const w = 80;
  const h = Math.round((w * img.naturalHeight) / img.naturalWidth);
  const ctx = Object.assign(document.createElement("canvas"), {
    width: w,
    height: h,
  }).getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  ctx.drawImage(img, 0, 0, w, h);
  const a = ctx.getImageData(0, 0, w, h).data;
  const solid = (x: number, y: number) => a[(y * w + x) * 4 + 3] > 128;
  const rows = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => solid(x, y)).some(Boolean));
  const top = rows.indexOf(true);
  const bottom = rows.lastIndexOf(true);
  if (top < 0) return;
  const y = Math.round(top + (bottom - top) * 0.75);
  const xs = Array.from({ length: w }, (_, x) => x).filter((x) => solid(x, y));
  const body = (xs.at(-1)! - xs[0] + 1) / w;
  const centre = (xs[0] + xs.at(-1)! + 1) / 2 / w;
  img.style.width = `${100 / body}%`;
  img.style.height = "auto";
  img.style.transform = `translate(${-centre * 100}%, ${((h - 1 - bottom) / h) * 100}%)`;
  img.dataset.seated = "";
};

/**
 * A held stage before the menu: a hand slides in from the left, then the scrollbar hands it one cup after another.
 * One scrubbed timeline moves the cups, the palm and the room's colour together, and snaps to rest on each cup.
 * Names on the right glide to a cup. Under reduced motion there is no pin; the names swap the cup directly.
 */
export function CupScroll({ drinks, currency }: { drinks: MenuItem[]; currency: string }) {
  const [sel, setSel] = useState(0);
  const root = useRef<HTMLElement>(null);
  const st = useRef<ScrollTrigger | null>(null);
  const first = useRef(true);
  const n = drinks.length;

  useGSAP(
    () => {
      if (n < 2) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const q = gsap.utils.selector(root);
        const cups = q("[data-cup]");
        const colours = drinks.map(room);
        gsap.fromTo(
          q(".cups__hand"),
          { xPercent: -85, rotation: -18 },
          {
            xPercent: 0,
            rotation: 0,
            ease: "none",
            scrollTrigger: {
              trigger: root.current,
              start: "top 90%",
              end: "top top",
              scrub: 0.8,
            },
          },
        );
        gsap.set(q(".cups__bg"), { backgroundColor: colours[0] });
        const tl = gsap.timeline({
          defaults: { duration: 1, ease: "power2.inOut" },
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: () => `+=${(n - 1) * window.innerHeight * 0.85}`,
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
            onUpdate: (s) => setSel(Math.round(s.progress * (n - 1))),
          },
        });
        // Each step is one unit: the swap happens in its middle, so the first and last fifth of every step hold a
        // whole cup, and the scroll always comes to rest on one.
        for (let i = 1; i < n; i++) {
          const at = i - 1;
          tl.to(
            cups[i - 1],
            {
              autoAlpha: 0,
              xPercent: 38,
              yPercent: -34,
              rotation: 14,
              scale: 0.9,
              duration: 0.38,
              ease: "power2.in",
            },
            at + 0.2,
          )
            .fromTo(
              cups[i],
              {
                autoAlpha: 0,
                xPercent: -26,
                yPercent: 46,
                rotation: -12,
                scale: 0.88,
              },
              {
                autoAlpha: 1,
                xPercent: 0,
                yPercent: 0,
                rotation: 0,
                scale: 1,
                duration: 0.42,
                ease: "power3.out",
              },
              at + 0.38,
            )
            .to(q(".cups__bg"), { backgroundColor: colours[i], duration: 0.5, ease: "none" }, at + 0.25)
            // the palm gives a little as each cup lands
            .to(
              q(".cups__lift"),
              {
                y: 22,
                rotation: -1.5,
                duration: 0.2,
                ease: "sine.inOut",
                yoyo: true,
                repeat: 1,
              },
              at + 0.4,
            );
        }
        tl.set({}, {}, n - 1);
        const s = tl.scrollTrigger!;
        st.current = s;
        // Snap through Lenis (ScrollTrigger's own snap fights the smooth scroller and can stop between two cups).
        const settle = () => {
          if (!s.isActive) return;
          const step = (s.end - s.start) / (n - 1);
          const y = s.start + Math.round((s.scroll() - s.start) / step) * step;
          if (Math.abs(y - s.scroll()) < 2) return;
          if (scroller.lenis) scroller.lenis.scrollTo(y, { duration: 0.6 });
          else window.scrollTo({ top: y, behavior: "smooth" });
        };
        ScrollTrigger.addEventListener("scrollEnd", settle);
        return () => {
          ScrollTrigger.removeEventListener("scrollEnd", settle);
          st.current = null;
        };
      });
    },
    { scope: root },
  );

  // the details beside the hand settle in each time the cup changes
  useGSAP(
    () => {
      if (first.current) {
        first.current = false;
        return;
      }
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.fromTo(
        ".cups__detail > *",
        { y: 12, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.45,
          stagger: 0.05,
          ease: "power3.out",
          overwrite: true,
        },
      );
    },
    { scope: root, dependencies: [sel], revertOnUpdate: false },
  );

  if (n === 0) return null;
  const d = drinks[sel];

  const go = (i: number) => {
    const s = st.current;
    if (!s) return setSel(i);
    const y = s.start + ((s.end - s.start) * i) / (n - 1);
    if (scroller.lenis) scroller.lenis.scrollTo(y, { duration: 0.8 + Math.abs(i - sel) * 0.25 });
    else window.scrollTo({ top: y, behavior: "smooth" });
  };

  return (
    <section ref={root} id="drinks" className="cups" aria-labelledby="cups-title" style={{ "--room": room(d) } as CSSProperties}>
      <div className="cups__bg" />
      <h2 id="cups-title" className="cups__title wrap">
        Pass me a cup
      </h2>

      <div className="cups__hand" aria-hidden="true">
        <div className="cups__palm">
          <div className="cups__lift">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="cups__arm" src="/images/hand.webp" alt="" width={1200} height={914} />
            {drinks.map((x, i) => (
              <div key={x.id} className="cups__cup" data-cup data-on={i === sel}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={x.imageUrl!}
                  alt=""
                  ref={(el) => {
                    if (el?.complete) seat(el);
                  }}
                  onLoad={(e) => seat(e.currentTarget)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="cups__info">
        <ul className="cups__names" aria-label="Drinks">
          {drinks.map((x, i) => (
            <li key={x.id}>
              <button type="button" aria-current={i === sel} onClick={() => go(i)}>
                {x.name}
              </button>
            </li>
          ))}
        </ul>
        <div className="cups__detail" aria-live="polite">
          <p className="cups__name">
            {d.name} <span>{d.isAvailable ? formatMoney(d.basePrice, currency) : "Sold out"}</span>
          </p>
          {d.shortDescription && <p>{d.shortDescription}</p>}
          <Link className="link" href={`/menu/${d.slug}`}>
            {d.isAvailable ? "Make it yours" : `See ${d.name}`}
          </Link>
        </div>
      </div>
    </section>
  );
}
