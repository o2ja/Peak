import { z } from "zod";
import { prisma } from "../db.ts";
import { HttpError } from "../lib/errors.ts";
import { fmt } from "../lib/money.ts";

export async function getSettings() {
  const s = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  if (!s) throw new HttpError(503, "Store settings are missing. Run the database seed.");
  return s;
}

type Settings = Awaited<ReturnType<typeof getSettings>>;

export const serializeSettings = (s: Settings) => ({ ...s, deliveryFee: fmt(s.deliveryFee) });

const text = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  text(max)
    .nullish()
    .transform((v) => (v ? v : null));
// Only http(s) or site-relative links: blocks javascript: and data: URLs in CMS fields.
const link = z
  .string()
  .trim()
  .max(300)
  .refine((v) => /^(https?:\/\/|\/(?!\/))/i.test(v), "Use a full https:// link or a path starting with /");
const optionalLink = link.nullish().or(z.literal("")).transform((v) => (v ? v : null));

export const settingsSchema = z.object({
  brandName: text(40).min(1),
  heroHeading: text(60).min(1),
  heroSubheading: text(200).min(1),
  heroCtaLabel: text(30).min(1),
  heroCtaHref: link,
  storyHeading: optionalText(60),
  storyBody: optionalText(1200),
  announcement: optionalText(140),
  currencyCode: z.string().regex(/^[A-Z]{3}$/, "Three-letter ISO code, e.g. JOD"),
  instagramUrl: optionalLink,
  phone: optionalText(30),
  email: z.email().nullish().or(z.literal("")).transform((v) => (v ? v : null)),
  address: optionalText(200),
  mapUrl: optionalLink,
  openingHours: optionalText(400),
  timezone: optionalText(60).refine((v) => v === null || Intl.supportedValuesOf("timeZone").includes(v), "Use an IANA timezone such as Asia/Amman"),
  orderInstructions: optionalText(400),
  policyText: optionalText(2000),
  seoTitle: text(70).min(1),
  seoDescription: text(160).min(1),
  acceptingOrders: z.boolean(),
  pickupEnabled: z.boolean(),
  deliveryEnabled: z.boolean(),
  deliveryFee: z.string().regex(/^\d{1,6}(\.\d{1,3})?$/, "Amount like 1.500"),
  payAtPickupEnabled: z.boolean(),
});

export function updateSettings(data: z.infer<typeof settingsSchema>) {
  return prisma.siteSettings.update({ where: { id: 1 }, data });
}
