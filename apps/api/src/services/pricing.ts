import { HttpError } from "../lib/errors.ts";
import { Decimal, money, type MoneyInput } from "../lib/money.ts";

export type CartLineInput = { menuItemId: string; quantity: number; optionValueIds: string[] };

export type ItemForPricing = {
  id: string;
  name: string;
  imageUrl: string | null;
  basePrice: Decimal;
  isActive: boolean;
  isAvailable: boolean;
  category: { isActive: boolean };
  options: {
    id: string;
    name: string;
    minSelect: number;
    maxSelect: number;
    values: { id: string; name: string; priceDelta: Decimal; isAvailable: boolean }[];
  }[];
};

export type PricedLine = {
  menuItemId: string;
  name: string;
  imageUrl: string | null;
  basePrice: Decimal;
  options: { option: string; value: string; priceDelta: string }[];
  unitPrice: Decimal;
  quantity: number;
  lineTotal: Decimal;
};

export type PricedCart = {
  lines: PricedLine[];
  subtotal: Decimal;
  discountTotal: Decimal;
  deliveryFee: Decimal;
  total: Decimal;
};

/**
 * The only place prices are computed. Everything comes from database rows; the client
 * contributes ids and quantities. Throws 422 listing every line problem at once.
 */
export function priceCart(lines: CartLineInput[], items: Map<string, ItemForPricing>, deliveryFee: MoneyInput): PricedCart {
  const problems: { line: number; message: string }[] = [];
  const priced: PricedLine[] = [];

  lines.forEach((line, i) => {
    const item = items.get(line.menuItemId);
    if (!item || !item.isActive || !item.category.isActive) {
      problems.push({ line: i, message: "This item is no longer on the menu." });
      return;
    }
    if (!item.isAvailable) {
      problems.push({ line: i, message: `${item.name} is sold out right now.` });
      return;
    }
    if (new Set(line.optionValueIds).size !== line.optionValueIds.length) {
      problems.push({ line: i, message: `Duplicate choices for ${item.name}.` });
      return;
    }

    const chosen: PricedLine["options"] = [];
    let unit = money(item.basePrice);
    const remaining = new Set(line.optionValueIds);
    for (const option of item.options) {
      const picked = option.values.filter((v) => remaining.has(v.id));
      picked.forEach((v) => remaining.delete(v.id));
      if (picked.length < option.minSelect || picked.length > option.maxSelect) {
        const need = option.minSelect === option.maxSelect ? `${option.minSelect}` : `${option.minSelect}–${option.maxSelect}`;
        problems.push({ line: i, message: `Choose ${need} for “${option.name}” on ${item.name}.` });
      }
      for (const v of picked) {
        if (!v.isAvailable) problems.push({ line: i, message: `${v.name} is unavailable for ${item.name}.` });
        unit = unit.plus(v.priceDelta);
        chosen.push({ option: option.name, value: v.name, priceDelta: money(v.priceDelta).toFixed(3) });
      }
    }
    if (remaining.size > 0) problems.push({ line: i, message: `Some choices don't belong to ${item.name}.` });

    unit = money(unit);
    priced.push({
      menuItemId: item.id,
      name: item.name,
      imageUrl: item.imageUrl,
      basePrice: money(item.basePrice),
      options: chosen,
      unitPrice: unit,
      quantity: line.quantity,
      lineTotal: money(unit.times(line.quantity)),
    });
  });

  if (problems.length) throw new HttpError(422, "Some items in your bag need attention.", problems);

  const subtotal = money(priced.reduce((sum, l) => sum.plus(l.lineTotal), new Decimal(0)));
  const fee = money(deliveryFee);
  const discountTotal = money(0); // promotions are not enabled for PEAK yet
  return { lines: priced, subtotal, discountTotal, deliveryFee: fee, total: money(subtotal.minus(discountTotal).plus(fee)) };
}
