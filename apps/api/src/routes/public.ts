import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { getPublicItem, getPublicMenu } from "../services/menu.ts";
import { createOrder, createOrderSchema, getPublicOrder, quote, quoteSchema } from "../services/orders.ts";
import { getSettings } from "../services/settings.ts";
import { fmt } from "../lib/money.ts";

export const publicRouter = Router();

const limiter = (windowMs: number, limit: number, error: string) =>
  rateLimit({ windowMs, limit, standardHeaders: "draft-8", legacyHeaders: false, message: { error } });
const orderLimiter = limiter(10 * 60 * 1000, 20, "Too many orders from this device. Please wait a few minutes.");
const quoteLimiter = limiter(60 * 1000, 120, "Too many requests. Please slow down.");

publicRouter.get("/settings", async (_req, res) => {
  const s = await getSettings();
  // Explicit allowlist: new private settings fields never leak by default.
  res.json({
    brandName: s.brandName,
    heroHeading: s.heroHeading,
    heroSubheading: s.heroSubheading,
    heroCtaLabel: s.heroCtaLabel,
    heroCtaHref: s.heroCtaHref,
    storyHeading: s.storyHeading,
    storyBody: s.storyBody,
    announcement: s.announcement,
    currencyCode: s.currencyCode,
    instagramUrl: s.instagramUrl,
    phone: s.phone,
    email: s.email,
    address: s.address,
    mapUrl: s.mapUrl,
    openingHours: s.openingHours,
    orderInstructions: s.orderInstructions,
    policyText: s.policyText,
    seoTitle: s.seoTitle,
    seoDescription: s.seoDescription,
    acceptingOrders: s.acceptingOrders,
    pickupEnabled: s.pickupEnabled,
    deliveryEnabled: s.deliveryEnabled,
    deliveryFee: fmt(s.deliveryFee),
    payAtPickupEnabled: s.payAtPickupEnabled,
  });
});

publicRouter.get("/menu", async (_req, res) => {
  res.json({ categories: await getPublicMenu() });
});

publicRouter.get("/menu/items/:slug", async (req, res) => {
  res.json(await getPublicItem(z.string().max(80).parse(req.params.slug)));
});

publicRouter.post("/cart/quote", quoteLimiter, async (req, res) => {
  res.json(await quote(quoteSchema.parse(req.body)));
});

publicRouter.post("/orders", orderLimiter, async (req, res) => {
  const { order, replayed } = await createOrder(createOrderSchema.parse(req.body));
  res.status(replayed ? 200 : 201).json({ reference: order.reference, accessToken: order.accessToken, status: order.status });
});

publicRouter.get("/orders/:reference", async (req, res) => {
  const reference = z.string().max(16).parse(req.params.reference);
  const token = z.string().min(10).max(64).parse(req.query.token);
  res.set("Cache-Control", "no-store").json(await getPublicOrder(reference, token));
});
