"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** The page's Lenis instance, so scroll-driven components can glide to a position instead of jumping. */
export const scroller: { lenis: Lenis | null } = { lenis: null };

/**
 * Storefront-wide motion: Lenis smooth scrolling driven by GSAP's ticker (so ScrollTrigger stays in step),
 * a staggered entrance for the children of every [data-reveal] block, and a slow scroll-linked settle for
 * [data-drift] photographs, and [data-speed] parallax (pictures that slide past each other at different rates). All of it is skipped under prefers-reduced-motion; content is visible without JS
 * because the hiding class is only added here.
 */
export function Motion() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp: 0.075, anchors: true });
    scroller.lenis = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(raf);
      scroller.lenis = null;
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.documentElement.classList.toggle("js", !reduced);
    if (reduced) return;
    const ctx = gsap.context(() => {
      ScrollTrigger.batch("[data-reveal]", {
        start: "top 88%",
        once: true,
        onEnter: (blocks) =>
          blocks.forEach((b) => gsap.to(b.children, { opacity: 1, y: 0, duration: 0.85, ease: "power3.out", stagger: 0.08, overwrite: true })),
      });
      gsap.utils.toArray<HTMLElement>("[data-drift]").forEach((el) =>
        gsap.fromTo(el, { scale: 1.14 }, { scale: 1, ease: "none", scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true } }),
      );
      gsap.utils.toArray<HTMLElement>("[data-speed]").forEach((el) => {
        const v = Number(el.dataset.speed) * 90;
        gsap.fromTo(el, { y: v }, { y: -v, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
      });
    });
    // Images and fonts change section heights after first paint.
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    return () => {
      window.removeEventListener("load", refresh);
      ctx.revert();
    };
  }, [pathname]);

  return null;
}
