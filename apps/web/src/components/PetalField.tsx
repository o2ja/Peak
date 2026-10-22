"use client";
import { useEffect, useRef } from "react";

const COLORS = ["#f9cfdc", "#f6b6cb", "#fbe0e8", "#f4a5bf", "#f078a2"];

type Flower = { x: number; y: number; r: number; rot: number; spin: number; vx: number; vy: number; fall: number; phase: number; c: string; a: number };

/**
 * A field of five-petal pink blossoms drifting down behind a section. The pointer pushes nearby flowers away and
 * sets them spinning. Canvas 2D, paused off screen and in background tabs; under reduced motion it draws one still frame.
 */
export function PetalField({ density = 1 }: { density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let flowers: Flower[] = [];
    const pointer = { x: -9999, y: -9999 };
    let raf = 0;
    let visible = true;

    const make = (y?: number): Flower => {
      const r = 7 + Math.random() ** 2 * 22;
      return {
        x: Math.random() * w,
        y: y ?? Math.random() * h,
        r,
        rot: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.01,
        vx: 0,
        vy: 0,
        fall: 0.15 + (r / 29) * 0.45, // bigger = nearer = faster
        phase: Math.random() * Math.PI * 2,
        c: COLORS[Math.floor(Math.random() * COLORS.length)],
        a: 0.55 + (r / 29) * 0.45,
      };
    };

    const resize = () => {
      const b = cv.getBoundingClientRect();
      w = b.width;
      h = b.height;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(70, Math.max(14, ((w * h) / 24000) * density)));
      flowers = flowers.slice(0, count);
      while (flowers.length < count) flowers.push(make());
      if (still) draw(0);
    };

    // one notched sakura petal pointing up from the centre
    const petal = (r: number) => {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-r * 0.55, -r * 0.3, -r * 0.5, -r * 0.92, -r * 0.14, -r);
      ctx.lineTo(0, -r * 0.84);
      ctx.lineTo(r * 0.14, -r);
      ctx.bezierCurveTo(r * 0.5, -r * 0.92, r * 0.55, -r * 0.3, 0, 0);
      ctx.fill();
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const f of flowers) {
        if (!still) {
          const dx = f.x - pointer.x;
          const dy = f.y - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 150 * 150) {
            const d = Math.sqrt(d2) || 1;
            const push = (1 - d / 150) * 1.6;
            f.vx += (dx / d) * push;
            f.vy += (dy / d) * push;
            f.spin += (dx > 0 ? 1 : -1) * push * 0.004;
          }
          f.vx *= 0.94;
          f.vy *= 0.94;
          f.spin *= 0.995;
          f.x += f.vx + Math.sin(t / 1400 + f.phase) * 0.35;
          f.y += f.vy + f.fall;
          f.rot += f.spin + 0.002;
          if (f.y - f.r > h) Object.assign(f, make(-f.r * 2));
          if (f.x < -40) f.x = w + 30;
          if (f.x > w + 40) f.x = -30;
        }
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rot);
        ctx.globalAlpha = f.a;
        ctx.fillStyle = f.c;
        for (let k = 0; k < 5; k++) {
          petal(f.r);
          ctx.rotate((Math.PI * 2) / 5);
        }
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(0, 0, f.r * 0.16, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    const loop = (t: number) => {
      draw(t);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (!still && visible && !document.hidden && !raf) raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const onMove = (e: PointerEvent) => {
      const b = cv.getBoundingClientRect();
      pointer.x = e.clientX - b.left;
      pointer.y = e.clientY - b.top;
    };
    const onLeave = () => {
      pointer.x = pointer.y = -9999;
    };
    const onVis = () => (document.hidden ? stop() : start());
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) start();
      else stop();
    });
    const ro = new ResizeObserver(resize);

    resize();
    ro.observe(cv);
    io.observe(cv);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVis);
    start();
    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [density]);

  return <canvas className="petals" ref={ref} aria-hidden="true" />;
}
