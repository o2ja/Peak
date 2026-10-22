import { describe, expect, it } from "vitest";
import { Decimal } from "../src/lib/money.ts";
import { priceCart, type ItemForPricing } from "../src/services/pricing.ts";
import { HttpError } from "../src/lib/errors.ts";

const item = (over: Partial<ItemForPricing> = {}): ItemForPricing => ({
  id: "i1",
  name: "Latte",
  imageUrl: null,
  basePrice: new Decimal("3.250"),
  isActive: true,
  isAvailable: true,
  category: { isActive: true },
  options: [
    { id: "size", name: "Size", minSelect: 1, maxSelect: 1, values: [{ id: "reg", name: "Regular", priceDelta: new Decimal(0), isAvailable: true }, { id: "lg", name: "Large", priceDelta: new Decimal("0.750"), isAvailable: true }] },
    { id: "extra", name: "Extras", minSelect: 0, maxSelect: 2, values: [{ id: "shot", name: "Shot", priceDelta: new Decimal("0.333"), isAvailable: true }, { id: "gone", name: "Gone", priceDelta: new Decimal(1), isAvailable: false }] },
  ],
  ...over,
});
const items = (i = item()) => new Map([[i.id, i]]);
const problems = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(HttpError);
    return ((e as HttpError).details as { message: string }[]).map((p) => p.message).join(" | ");
  }
  throw new Error("expected priceCart to throw");
};

describe("priceCart", () => {
  it("adds option deltas exactly and multiplies by quantity without float drift", () => {
    const cart = priceCart([{ menuItemId: "i1", quantity: 3, optionValueIds: ["lg", "shot"] }], items(), "1.100");
    expect(cart.lines[0].unitPrice.toFixed(3)).toBe("4.333");
    expect(cart.subtotal.toFixed(3)).toBe("12.999");
    expect(cart.total.toFixed(3)).toBe("14.099");
  });

  it("enforces required and maximum selections", () => {
    expect(problems(() => priceCart([{ menuItemId: "i1", quantity: 1, optionValueIds: [] }], items(), 0))).toMatch(/Choose 1 for “Size”/);
    expect(problems(() => priceCart([{ menuItemId: "i1", quantity: 1, optionValueIds: ["reg", "lg"] }], items(), 0))).toMatch(/Choose 1/);
  });

  it("rejects foreign, duplicate and unavailable choices", () => {
    expect(problems(() => priceCart([{ menuItemId: "i1", quantity: 1, optionValueIds: ["reg", "other-items-value"] }], items(), 0))).toMatch(/don't belong/);
    expect(problems(() => priceCart([{ menuItemId: "i1", quantity: 1, optionValueIds: ["reg", "shot", "shot"] }], items(), 0))).toMatch(/Duplicate/);
    expect(problems(() => priceCart([{ menuItemId: "i1", quantity: 1, optionValueIds: ["reg", "gone"] }], items(), 0))).toMatch(/unavailable/);
  });

  it("rejects sold-out, inactive, archived-category and unknown items", () => {
    expect(problems(() => priceCart([{ menuItemId: "i1", quantity: 1, optionValueIds: ["reg"] }], items(item({ isAvailable: false })), 0))).toMatch(/sold out/);
    expect(problems(() => priceCart([{ menuItemId: "i1", quantity: 1, optionValueIds: ["reg"] }], items(item({ isActive: false })), 0))).toMatch(/no longer/);
    expect(problems(() => priceCart([{ menuItemId: "i1", quantity: 1, optionValueIds: ["reg"] }], items(item({ category: { isActive: false } })), 0))).toMatch(/no longer/);
    expect(problems(() => priceCart([{ menuItemId: "nope", quantity: 1, optionValueIds: [] }], items(), 0))).toMatch(/no longer/);
  });
});
