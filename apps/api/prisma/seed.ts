// Development seed. EVERY menu item and price here is FICTIONAL sample data, not PEAK's real menu.
// Safe to re-run: existing rows are left as they are, so edits made in the dashboard survive.
import { prisma } from "../src/db.ts";

type SeedItem = {
  slug: string;
  name: string;
  shortDescription: string;
  basePrice: string;
  imageUrl?: string;
  liquidColor?: string;
  layerColor?: string;
  isFeatured?: boolean;
  isSeasonal?: boolean;
  options?: { name: string; minSelect: number; maxSelect: number; values: { name: string; priceDelta: string; isDefault?: boolean }[] }[];
};

const size = { name: "Size", minSelect: 1, maxSelect: 1, values: [{ name: "Regular", priceDelta: "0", isDefault: true }, { name: "Large", priceDelta: "0.750" }] };
const milk = { name: "Milk", minSelect: 1, maxSelect: 1, values: [{ name: "Whole milk", priceDelta: "0", isDefault: true }, { name: "Oat milk", priceDelta: "0.500" }] };
const extras = { name: "Extras", minSelect: 0, maxSelect: 2, values: [{ name: "Extra matcha shot", priceDelta: "0.750" }, { name: "Vanilla syrup", priceDelta: "0.350" }] };

const catalogue: { slug: string; name: string; description: string; liquidColor: string | null; layerColor: string | null; items: SeedItem[] }[] = [
  {
    slug: "matcha",
    name: "Matcha",
    description: "Whisked matcha over ice.",
    liquidColor: "#7FA650",
    layerColor: "#F3F0E6",
    items: [
      { slug: "iced-matcha-latte", name: "Iced Matcha Latte", imageUrl: "/images/drinks/matcha-latte.webp", shortDescription: "Whisked matcha poured over milk and ice.", basePrice: "3.250", liquidColor: "#7FA650", layerColor: "#F3F0E6", isFeatured: true, options: [size, milk, extras] },
      { slug: "strawberry-matcha", name: "Strawberry Matcha", imageUrl: "/images/drinks/strawberry-matcha.webp", shortDescription: "Strawberry purée under milk, matcha on top.", basePrice: "3.750", liquidColor: "#7FA650", layerColor: "#F27C9C", isFeatured: true, options: [size, milk] },
      { slug: "honey-matcha", name: "Honey Matcha", imageUrl: "/images/drinks/matcha-honey.webp", shortDescription: "Honey at the bottom, milk, then matcha.", basePrice: "3.750", liquidColor: "#5E8C3A", layerColor: "#F3F0E6", options: [size, milk] },
      { slug: "blueberry-matcha", name: "Blueberry Matcha", imageUrl: "/images/drinks/matcha-blueberry.webp", shortDescription: "Blueberries through milk, matcha and fresh berries on top.", basePrice: "3.950", liquidColor: "#7FA650", layerColor: "#5B3F8C", isFeatured: true, options: [size, milk] },
      { slug: "pink-cloud-matcha", name: "Pink Cloud Matcha", imageUrl: "/images/drinks/pink-cloud.webp", shortDescription: "Matcha under a soft pink cold foam.", basePrice: "3.950", liquidColor: "#7FA650", layerColor: "#F4A5BF", isSeasonal: true, options: [size, milk] },
    ],
  },
  {
    slug: "iced-latte",
    name: "Iced Latte",
    description: "Espresso, milk and ice.",
    liquidColor: "#B07A4F",
    layerColor: "#F3F0E6",
    items: [
      { slug: "iced-spanish-latte", name: "Iced Spanish Latte", imageUrl: "/images/drinks/iced-latte-foam.webp", shortDescription: "Espresso with sweetened condensed milk.", basePrice: "3.250", liquidColor: "#B07A4F", layerColor: "#F3F0E6", isFeatured: true, options: [size, milk] },
      { slug: "iced-vanilla-latte", name: "Iced Vanilla Latte", imageUrl: "/images/drinks/iced-latte.webp", shortDescription: "Espresso, vanilla and cold milk.", basePrice: "3.250", liquidColor: "#B98A5E", layerColor: "#F3F0E6", options: [size, milk] },
    ],
  },
  {
    slug: "tea-and-shakes",
    name: "Tea & Shakes",
    description: "Brewed tea and thick shakes, served cold.",
    liquidColor: "#D9822B",
    layerColor: null,
    items: [
      { slug: "peach-iced-tea", name: "Peach Iced Tea", imageUrl: "/images/drinks/peach-iced-tea.webp", shortDescription: "Black tea with peach.", basePrice: "2.750", liquidColor: "#E0913A", layerColor: "#F4B860", isFeatured: true, options: [size] },
      { slug: "strawberry-shake", name: "Strawberry Shake", imageUrl: "/images/drinks/strawberry-shake.webp", shortDescription: "Strawberry, milk and ice cream, blended.", basePrice: "3.500", liquidColor: "#F4A5BF", layerColor: "#D94A5F", isFeatured: true, options: [size] },
    ],
  },
  {
    slug: "desserts",
    name: "Desserts",
    description: "Something to go with your cup.",
    liquidColor: null,
    layerColor: null,
    items: [
      { slug: "brownies", name: "Brownies", imageUrl: "/images/desserts/brownies.webp", shortDescription: "Dense, fudgy chocolate squares.", basePrice: "2.250" },
      { slug: "chocolate-chunk-cookie", name: "Chocolate Chunk Cookie", imageUrl: "/images/desserts/chocolate-chunk-cookie.webp", shortDescription: "Soft centre, dark chocolate, a pinch of sea salt.", basePrice: "1.750" },
      { slug: "cherry-crumble", name: "Cherry Crumble", imageUrl: "/images/desserts/cherry-crumble.webp", shortDescription: "Baked cherries under a buttery crumble.", basePrice: "3.250" },
      { slug: "red-velvet-cake", name: "Red Velvet Cake", imageUrl: "/images/desserts/red-velvet-cake.webp", shortDescription: "Three layers with cream cheese frosting.", basePrice: "3.500" },
      { slug: "red-velvet-cookie", name: "Red Velvet Cookie", imageUrl: "/images/desserts/red-velvet-cookie.webp", shortDescription: "Red velvet dough with white chocolate chunks.", basePrice: "1.950" },
    ],
  },
];

async function main() {
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      brandName: "peak",
      heroHeading: "Matcha & more.",
      heroSubheading: "PEAK Jordan pours iced matcha and coffee, with something sweet on the side. Order ahead and pick it up.",
      heroCtaLabel: "See the menu",
      heroCtaHref: "/menu",
      storyHeading: "Whisked, then poured",
      storyBody:
        "Sifted matcha is whisked with a little water until it foams, then poured over cold milk and ice, so the green drifts down through the white.\n\nBeside it on the counter: espresso over ice, peach tea with mint, and something sweet to go with your cup, from brownies to red velvet.",
      currencyCode: "JOD",
      instagramUrl: "https://www.instagram.com/peak.joo/",
      orderInstructions: "Pay at the counter when you collect your order.",
      seoTitle: "PEAK Jordan — matcha, coffee and desserts",
      seoDescription: "Order PEAK's iced matcha, coffee and desserts ahead for pickup.",
      pickupEnabled: true,
      deliveryEnabled: false,
      payAtPickupEnabled: true,
    },
  });

  for (const [ci, c] of catalogue.entries()) {
    const { items, ...cat } = c;
    const category = await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: { ...cat, sortOrder: ci } });
    for (const [ii, { options, ...item }] of items.entries()) {
      const row = await prisma.menuItem.upsert({
        where: { slug: item.slug },
        update: {},
        create: { ...item, categoryId: category.id, sortOrder: ii },
        include: { _count: { select: { options: true } } },
      });
      // Bundled photos fill items that have none yet; a picture chosen in the dashboard is never replaced.
      if (item.imageUrl && !row.imageUrl) await prisma.menuItem.update({ where: { id: row.id }, data: { imageUrl: item.imageUrl } });
      if (row._count.options === 0 && options) {
        for (const [oi, o] of options.entries()) {
          await prisma.menuItemOption.create({
            data: { menuItemId: row.id, name: o.name, minSelect: o.minSelect, maxSelect: o.maxSelect, sortOrder: oi, values: { create: o.values.map((v, vi) => ({ ...v, sortOrder: vi })) } },
          });
        }
      }
    }
  }
  console.log("Seeded fictional sample menu and default settings.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
