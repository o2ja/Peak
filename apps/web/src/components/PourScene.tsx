"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const STEPS = [
  { key: "whisk", title: "Whisk", body: "Matcha and a little water, beaten with a bamboo chasen until it foams." },
  { key: "pour", title: "Pour", body: "Tipped from the bowl straight over the ice." },
  { key: "settle", title: "Settle", body: "Green drifts down through the milk. Stir it, or don't." },
] as const;

// Scene units (viewBox 0 0 600 720). The cup is PEAK's own photograph; bowl and whisk are drawn.
const CUP = { src: "/images/drinks/matcha-latte.webp", x: 300, y: 262, w: 293, h: 430 };
const MATCHA = "#7FA650";
const FOAM = [
  [262, 128, 4],
  [284, 133, 3],
  [306, 126, 4.5],
  [328, 134, 3],
  [346, 128, 3.5],
  [250, 135, 2.5],
  [318, 138, 2.5],
  [292, 124, 2.5],
] as const;

/**
 * Bowl → whisk → tilt → pour → the real cup fills from the bottom, played by the scrollbar: the section holds while
 * one GSAP timeline is scrubbed, so scrolling up pours it back. Without script, or with reduced motion, the finished
 * cup is shown and nothing is pinned.
 */
export function PourScene() {
  const root = useRef<HTMLElement>(null);

  // On phones the drawing sits under the text; tell the CSS where the text ends so the two never overlap.
  useEffect(() => {
    const sec = root.current;
    const text = sec?.querySelector<HTMLElement>(".pour__text");
    if (!sec || !text) return;
    const ro = new ResizeObserver(() => sec.style.setProperty("--pour-top", `${text.offsetTop + text.offsetHeight}px`));
    ro.observe(text);
    return () => ro.disconnect();
  }, []);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const q = gsap.utils.selector(root);
      const t = gsap.timeline({
        defaults: { ease: "power2.inOut" },
        scrollTrigger: { trigger: root.current, start: "top top", end: "+=320%", pin: true, scrub: 1.4 },
        // on the timeline, not the trigger, so the step names follow the scrub as it eases to rest
        onUpdate: () => {
          const now = t.time();
          root.current?.setAttribute("data-step", now < t.labels.tilt ? "whisk" : now < t.labels.stop ? "pour" : "settle");
        },
      });
      root.current?.setAttribute("data-step", "whisk");

      t.set(q("[data-fill]"), { attr: { y: CUP.y + CUP.h, height: 0 } })
        .set(q("[data-stream]"), { scaleY: 0, autoAlpha: 1, transformOrigin: "50% 0%" })
        .set(q("[data-foam] circle"), { scale: 0, transformOrigin: "50% 50%" })
        .set(q("[data-whisk]"), { y: -200, autoAlpha: 0 })
        .to(q("[data-whisk]"), { y: 0, autoAlpha: 1, duration: 0.6, ease: "power3.out" })
        // the M-shaped back-and-forth of a chasen
        .to(q("[data-whisk]"), { x: 22, rotation: 5, svgOrigin: "300 80", duration: 0.1, ease: "sine.inOut", repeat: 13, yoyo: true })
        .to(q("[data-foam] circle"), { scale: 1, duration: 0.3, stagger: 0.09, ease: "back.out(2)" }, "<0.2")
        .to(q("[data-whisk]"), { y: -220, autoAlpha: 0, duration: 0.5, ease: "power2.in" }, "+=0.1")
        .addLabel("tilt")
        .to(q("[data-bowl]"), { rotation: 46, svgOrigin: "408 128", duration: 0.8 }, "tilt")
        .to(q("[data-surface]"), { scaleY: 0.55, svgOrigin: "300 132", duration: 0.8 }, "tilt")
        .addLabel("pour", "tilt+=0.6")
        .to(q("[data-stream]"), { scaleY: 1, duration: 0.28, ease: "power1.in" }, "pour")
        .to(q("[data-stream]"), { scaleX: 0.75, svgOrigin: "414 300", duration: 0.16, repeat: 11, yoyo: true, ease: "sine.inOut" }, "pour+=0.28")
        .to(q("[data-fill]"), { attr: { y: CUP.y, height: CUP.h }, duration: 2.1, ease: "power1.inOut" }, "pour+=0.2")
        .addLabel("stop", "pour+=2.1")
        .to(q("[data-stream]"), { scaleY: 0, transformOrigin: "50% 100%", duration: 0.3, ease: "power1.out" }, "stop")
        .to(q("[data-bowl]"), { rotation: 0, duration: 0.8 }, "stop")
        .to(q("[data-surface]"), { scaleY: 0.4, duration: 0.8 }, "stop")
        .to({}, { duration: 0.4 }); // a beat on the full cup before the section lets go
    },
    { scope: root },
  );

  return (
    <section id="pour" className="pour" ref={root} data-step="settle" aria-labelledby="pour-title">
      <div className="wrap pour__text" data-reveal>
        <h2 id="pour-title">From bowl to cup</h2>
        <p>Matcha starts as a fine green powder. Scroll, and watch it become a drink.</p>
        <ol className="pour__steps">
          {STEPS.map((s) => (
            <li key={s.key} data-k={s.key}>
              <span>
                <strong>{s.title}</strong>
                <span className="pour__body">{s.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="pour__stage">
        <svg viewBox="0 0 600 720" preserveAspectRatio="xMidYMax meet" role="img" aria-labelledby="pour-title" aria-describedby="pour-desc">
          <desc id="pour-desc">Matcha is whisked in a bowl, poured over ice, and fills a cup of milk from the bottom up.</desc>
          <defs>
            {/* the empty cup: the same photograph, washed to clear plastic */}
            <filter id="pour-ghost" colorInterpolationFilters="sRGB">
              <feColorMatrix type="matrix" values="0.08 0.15 0.03 0 0.86  0.08 0.15 0.03 0 0.86  0.08 0.15 0.03 0 0.88  0 0 0 0.55 0" />
            </filter>
            <clipPath id="pour-level">
              <rect data-fill x={CUP.x - 10} y={CUP.y} width={CUP.w + 20} height={CUP.h} />
            </clipPath>
          </defs>

          <ellipse cx={CUP.x + CUP.w / 2} cy={CUP.y + CUP.h + 6} rx="120" ry="12" fill="#b5336a" opacity="0.1" />
          <rect data-stream x="408" y="134" width="12" height="236" rx="6" fill={MATCHA} style={{ visibility: "hidden" }} />
          <image href={CUP.src} x={CUP.x} y={CUP.y} width={CUP.w} height={CUP.h} filter="url(#pour-ghost)" />
          <image href={CUP.src} x={CUP.x} y={CUP.y} width={CUP.w} height={CUP.h} clipPath="url(#pour-level)" />

          {/* chawan */}
          <g data-bowl>
            <rect x="272" y="222" width="56" height="12" rx="4" fill="#cdc4c0" />
            <path d="M192,128 C192,196 238,226 300,226 C362,226 408,196 408,128 Z" fill="#ece6e3" />
            <path d="M206,170 C224,200 258,212 300,212 C342,212 376,200 394,170" fill="none" stroke="#d8cfcb" strokeWidth="5" strokeLinecap="round" />
            <ellipse cx="300" cy="128" rx="108" ry="18" fill="#d8cfcb" />
            <ellipse data-surface cx="300" cy="132" rx="96" ry="12" fill={MATCHA} />
            <g data-foam fill="#cfe39f">
              {FOAM.map(([cx, cy, r]) => (
                <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
              ))}
            </g>
          </g>

          {/* chasen */}
          <g data-whisk style={{ visibility: "hidden" }}>
            <rect x="288" y="0" width="24" height="70" rx="7" fill="#e8cd92" />
            <rect x="286" y="66" width="28" height="7" rx="2" fill="#3a2e1e" />
            <path d="M286,73 C276,94 266,112 268,132 L332,132 C334,112 324,94 314,73 Z" fill="#f2ddad" />
            <g stroke="#d8b877" strokeWidth="2.2" strokeLinecap="round">
              <path d="M292,76 C286,96 280,114 280,130" />
              <path d="M297,76 C294,96 292,114 292,130" />
              <path d="M303,76 C306,96 308,114 308,130" />
              <path d="M308,76 C314,96 320,114 320,130" />
            </g>
          </g>
        </svg>
      </div>
    </section>
  );
}
