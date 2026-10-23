import Link from "next/link";
import type { CSSProperties } from "react";
import { PetalField } from "@/components/PetalField";
import { PourScene } from "@/components/PourScene";
import { CupScroll } from "@/components/CupScroll";
import { DrinkPicture, isCutout } from "@/components/DrinkPicture";
import { getMenu, getSettings } from "@/lib/api";
import { formatMoney } from "@/lib/format";

// PEAK's own photographs (apps/web/public/images/photos), pinned to the story board. `speed` is the parallax rate.
const BOARD = [
  { src: "/images/photos/counter.jpg", alt: "Two pink-topped matcha drinks on a café counter beside pink tulips", speed: 0.5 },
  { src: "/images/photos/pink-table.jpg", alt: "Two iced matchas seen from above on a round pink table", speed: -0.6 },
  { src: "/images/photos/wood-table.jpg", alt: "Matcha swirling through pink milk in a lidded cup on a wooden table", speed: 0.9 },
];

export default async function Home() {
  const [settings, categories] = await Promise.all([getSettings(), getMenu()]);
  const all = categories.flatMap((c) => c.items);
  const picks = all.filter((i) => i.isFeatured && isCutout(i.imageUrl)).slice(0, 4);
  // Pink Cloud is served in a glass that does not sit right in the hand, so it stays on the menu but not in the hand.
  const cups = categories.filter((c) => c.liquidColor).flatMap((c) => c.items.filter((i) => isCutout(i.imageUrl) && i.slug !== "pink-cloud-matcha"));
  const pinned = all.find((i) => i.slug === "strawberry-shake" && isCutout(i.imageUrl)) ?? cups.at(-1);
  const currency = settings.currencyCode;

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <PetalField />
        <div className="wrap hero__inner">
          <div className="hero__copy" data-reveal>
            <h1 id="hero-title">{settings.heroHeading}</h1>
            <p>{settings.heroSubheading}</p>
            <div className="hero__actions">
              <Link className="btn btn--pink" href={settings.heroCtaHref}>
                {settings.heroCtaLabel}
              </Link>
              <a className="link" href="#pour">
                How it&apos;s made
              </a>
            </div>
          </div>
          <figure className="hero__cup" data-speed={-0.6}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/drinks/matcha-blueberry.webp" alt="An iced blueberry matcha: blueberries swirled through milk and matcha, fresh berries on top" width={430} height={728} fetchPriority="high" />
          </figure>
        </div>
      </section>

      {picks.length > 0 && (
        <section className="section wrap picks" aria-labelledby="picks-title">
          <div className="picks__head" data-reveal>
            <h2 id="picks-title">Our picks</h2>
            <p>A few drinks to start with. Tap one to make it yours.</p>
            <Link className="link" href="/menu">
              The whole menu
            </Link>
          </div>
          <ul className="picks__row" data-reveal>
            {picks.map((i) => (
              <li key={i.id}>
                <Link className="pick" href={`/menu/${i.slug}`}>
                  <span className="pick__tile">
                    <DrinkPicture imageUrl={i.imageUrl} liquid={i.liquidColor} layer={i.layerColor} alt={i.name} />
                  </span>
                  <span className="pick__meta">
                    <span className="pick__name">{i.name}</span>
                    <span>{i.isAvailable ? formatMoney(i.basePrice, currency) : "Sold out"}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <PourScene />

      <section className="counters" aria-labelledby="counters-title">
        <div className="wrap counters__head" data-reveal>
          <h2 id="counters-title">Matcha, coffee and something sweet</h2>
          <p>Every cup on the menu, sorted by what you came for. Open a counter to see what is on it.</p>
        </div>
        <ul className="wrap counters__row" data-reveal>
          {categories.map((c) => {
            const face = c.items.find((i) => isCutout(i.imageUrl));
            const from = c.items.reduce((m, i) => (Number(i.basePrice) < Number(m) ? i.basePrice : m), c.items[0]?.basePrice ?? "0");
            return (
              <li key={c.id} style={{ "--c": c.liquidColor ?? "#f4a5bf" } as CSSProperties}>
                <Link className="counter" href={`/menu#${c.slug}`}>
                  <span className="counter__name">{c.name}</span>
                  <span className="counter__pic">{face && <DrinkPicture imageUrl={face.imageUrl} liquid={face.liquidColor} />}</span>
                  <span className="counter__more">
                    {c.description && <span>{c.description}</span>}
                    <span className="counter__count">
                      {c.items.length} on the menu · from {formatMoney(from, currency)}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {settings.storyHeading && (
        <section id="story" className="mood" aria-labelledby="story-title">
          <PetalField density={0.7} />
          <div className="wrap mood__board">
            {BOARD.map((p, n) => (
              <figure key={p.src} className={`mood__pic mood__pic--${n + 1}`} data-speed={p.speed}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.src} alt={p.alt} loading="lazy" decoding="async" width={1200} height={1600} />
              </figure>
            ))}
            {pinned && (
              <figure className="mood__pic mood__pic--4 mood__cut" data-speed={-0.4}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pinned.imageUrl!} alt={pinned.name} loading="lazy" decoding="async" />
              </figure>
            )}
            <div className="mood__note" data-reveal>
              <h2 id="story-title">{settings.storyHeading}</h2>
              {settings.storyBody?.split(/\n\n+/).map((para) => <p key={para.slice(0, 24)}>{para}</p>)}
              <Link className="link" href="/menu">
                Find your cup
              </Link>
            </div>
          </div>
        </section>
      )}

      <CupScroll drinks={cups} currency={currency} />

      <section className="section wrap board" aria-labelledby="board-title">
        <div className="board__head" data-reveal>
          <h2 id="board-title">The whole menu</h2>
          <Link className="btn btn--pink" href="/menu">
            Order ahead
          </Link>
        </div>
        <div className="board__cats">
          {categories.map((c) => (
            <div key={c.id} className="board__cat" data-reveal>
              <h3>{c.name}</h3>
              <ul className="board__rows">
                {c.items.map((i) => (
                  <li key={i.id}>
                    <Link href={`/menu/${i.slug}`} data-season={i.isSeasonal} data-out={!i.isAvailable}>
                      <span className="board__name">
                        {i.name}
                        {i.shortDescription && <span className="board__note">{i.shortDescription}</span>}
                      </span>
                      <span className="board__price">
                        {formatMoney(i.basePrice, currency)}
                        {!i.isAvailable && <small>Sold out</small>}
                        {i.isAvailable && i.isSeasonal && <small>Seasonal</small>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
