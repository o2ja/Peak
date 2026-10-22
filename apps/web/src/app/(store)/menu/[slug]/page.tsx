import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DrinkPicture } from "@/components/DrinkPicture";
import { ItemCustomizer } from "@/components/ItemCustomizer";
import { ApiError, getItem, getSettings } from "@/lib/api";
import { formatMoney } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  try {
    return await getItem(slug);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = await load((await params).slug);
  return { title: item.name, description: item.shortDescription ?? undefined, openGraph: { title: item.name, description: item.shortDescription ?? undefined } };
}

export default async function ItemPage({ params }: Props) {
  const { slug } = await params;
  const [item, settings] = await Promise.all([load(slug), getSettings()]);
  return (
    <article className="wrap item">
      <div className="item__visual">
        <div className="tile" data-field={item.isSeasonal ? 2 : 0}>
          <DrinkPicture imageUrl={item.imageUrl} liquid={item.liquidColor} layer={item.layerColor} alt={item.name} eager />
        </div>
      </div>
      <div className="item__info">
        <Link className="link item__back" href={`/menu#${item.categorySlug}`}>
          ← {item.categoryName}
        </Link>
        <h1>{item.name}</h1>
        {(item.description || item.shortDescription) && <p className="item__desc">{item.description ?? item.shortDescription}</p>}
        <p className="item__price">
          {item.options.some((o) => o.values.some((v) => Number(v.priceDelta) > 0)) && "From "}
          {formatMoney(item.basePrice, settings.currencyCode)}</p>
        {(item.isSeasonal || !item.isAvailable) && (
          <p className="item__tags">
            {!item.isAvailable && <span className="tag tag--out">Sold out</span>}
            {item.isSeasonal && <span className="tag">Seasonal</span>}
          </p>
        )}
        <Suspense>
          <ItemCustomizer item={item} currency={settings.currencyCode} acceptingOrders={settings.acceptingOrders} />
        </Suspense>
      </div>
    </article>
  );
}
