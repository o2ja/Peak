import type { CSSProperties } from "react";

/** PNG/WebP pictures are treated as cut-outs on a transparent ground: they sit on colour tiles and in the hand. */
export const isCutout = (url: string | null): url is string => !!url && /\.(png|webp)$/i.test(url);

type Props = { imageUrl: string | null; liquid: string | null; layer?: string | null; alt?: string; eager?: boolean };

/**
 * The item's own picture, contained on whatever tile it sits on. Without a photo, the drink is shown
 * from above as a disc of its dashboard colour (desserts without a colour get the P mark), never a stand-in photo.
 */
export function DrinkPicture({ imageUrl, liquid, layer, alt = "", eager }: Props) {
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="pic" src={imageUrl} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" />;
  }
  if (!liquid) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="pic pic--mark" src="/images/peak-monogram.png" alt={alt} width={161} height={183} />;
  }
  return <span className="pic pic--top" role={alt ? "img" : undefined} aria-label={alt || undefined} style={{ "--liquid": liquid, "--layer": layer ?? liquid } as CSSProperties} />;
}
