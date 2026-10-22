import { z } from "zod";
import { prisma } from "../db.ts";
import { Prisma } from "../generated/prisma/client.ts";
import { HttpError, notFound } from "../lib/errors.ts";
import { fmt } from "../lib/money.ts";

const optionsInclude = {
  options: { orderBy: { sortOrder: "asc" }, include: { values: { orderBy: { sortOrder: "asc" } } } },
} satisfies Prisma.MenuItemInclude;

type ItemRow = Prisma.MenuItemGetPayload<{ include: typeof optionsInclude & { category: true } }>;

const serializeItem = (i: ItemRow, { internal = false } = {}) => ({
  id: i.id,
  categoryId: i.categoryId,
  categorySlug: i.category.slug,
  categoryName: i.category.name,
  name: i.name,
  slug: i.slug,
  shortDescription: i.shortDescription,
  description: i.description,
  imageUrl: i.imageUrl,
  liquidColor: i.liquidColor,
  layerColor: i.layerColor,
  basePrice: fmt(i.basePrice),
  isFeatured: i.isFeatured,
  isSeasonal: i.isSeasonal,
  isAvailable: i.isAvailable,
  sortOrder: i.sortOrder,
  ...(internal ? { isActive: i.isActive, updatedAt: i.updatedAt } : {}),
  options: i.options
    .map((o) => ({
      id: o.id,
      name: o.name,
      minSelect: o.minSelect,
      maxSelect: o.maxSelect,
      values: o.values
        .filter((v) => internal || v.isAvailable)
        .map((v) => ({ id: v.id, name: v.name, priceDelta: fmt(v.priceDelta), isDefault: v.isDefault, ...(internal ? { isAvailable: v.isAvailable } : {}) })),
    }))
    .filter((o) => internal || o.values.length > 0),
});

/** Public menu: active categories and active items only. Sold-out items are included and flagged. */
export async function getPublicMenu() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      items: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: { ...optionsInclude, category: true },
      },
    },
  });
  return categories.map(({ items, ...c }) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    liquidColor: c.liquidColor,
    layerColor: c.layerColor,
    items: items.map((i) => serializeItem(i)),
  }));
}

export async function getPublicItem(slug: string) {
  const item = await prisma.menuItem.findFirst({
    where: { slug, isActive: true, category: { isActive: true } },
    include: { ...optionsInclude, category: true },
  });
  if (!item) throw notFound("Menu item");
  return serializeItem(item);
}

// ---------- admin ----------

const slug = z
  .string()
  .trim()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes only");
const hex = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Colour like #7FA650")
  .nullish()
  .or(z.literal("").transform(() => null));
const price = z.string().trim().regex(/^\d{1,6}(\.\d{1,3})?$/, "Price like 3.500");
const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(60),
  slug,
  description: nullableText(300),
  liquidColor: hex,
  layerColor: hex,
  isActive: z.boolean().default(true),
});

export const itemSchema = z.object({
  categoryId: z.uuid(),
  name: z.string().trim().min(1).max(80),
  slug,
  shortDescription: nullableText(140),
  description: nullableText(1000),
  imageUrl: z
    .string()
    // An upload, or one of the drink photos bundled with the storefront (apps/web/public/images/drinks).
    .regex(/^\/(uploads|images\/drinks)\/[a-zA-Z0-9-]+\.(png|jpg|webp)$/, "Use an uploaded image")
    .nullish()
    .transform((v) => v ?? null),
  liquidColor: hex,
  layerColor: hex,
  basePrice: price,
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isSeasonal: z.boolean().default(false),
  isAvailable: z.boolean().default(true),
});

export const optionsSchema = z
  .array(
    z
      .object({
        name: z.string().trim().min(1).max(40),
        minSelect: z.number().int().min(0).max(10),
        maxSelect: z.number().int().min(1).max(10),
        values: z
          .array(
            z.object({
              name: z.string().trim().min(1).max(40),
              priceDelta: z.string().trim().regex(/^-?\d{1,6}(\.\d{1,3})?$/, "Amount like 0.500"),
              isDefault: z.boolean().default(false),
              isAvailable: z.boolean().default(true),
            }),
          )
          .min(1, "Add at least one choice"),
      })
      .refine((o) => o.minSelect <= o.maxSelect, { message: "Minimum can't exceed maximum", path: ["minSelect"] })
      .refine((o) => o.values.filter((v) => v.isDefault).length <= o.maxSelect, { message: "Too many defaults", path: ["values"] }),
  )
  .max(10);

export const reorderSchema = z.object({ ids: z.array(z.uuid()).min(1).max(500) });

const conflictOnSlug = (e: unknown) => {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    throw new HttpError(409, "That slug is already used. Pick another.");
  }
  throw e;
};

export async function listAdminCategories() {
  const rows = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { items: true } } },
  });
  return rows.map(({ _count, ...c }) => ({ ...c, itemCount: _count.items }));
}

export async function createCategory(data: z.infer<typeof categorySchema>) {
  const last = await prisma.category.aggregate({ _max: { sortOrder: true } });
  return prisma.category.create({ data: { ...data, sortOrder: (last._max.sortOrder ?? 0) + 1 } }).catch(conflictOnSlug);
}

export function updateCategory(id: string, data: z.infer<typeof categorySchema>) {
  return prisma.category.update({ where: { id }, data }).catch((e) => {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") throw notFound("Category");
    return conflictOnSlug(e);
  });
}

/** Deletes an empty category. Categories with items must be archived or emptied first. */
export async function deleteCategory(id: string) {
  const count = await prisma.menuItem.count({ where: { categoryId: id } });
  if (count > 0) throw new HttpError(409, `This category still has ${count} item(s). Move them or archive the category instead.`);
  await prisma.category.delete({ where: { id } }).catch(() => {
    throw notFound("Category");
  });
}

export async function reorder(model: "category" | "menuItem", ids: string[]) {
  await prisma.$transaction(
    ids.map((id, i) =>
      model === "category" ? prisma.category.update({ where: { id }, data: { sortOrder: i } }) : prisma.menuItem.update({ where: { id }, data: { sortOrder: i } }),
    ),
  );
}

export async function listAdminItems() {
  const rows = await prisma.menuItem.findMany({
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
    include: { ...optionsInclude, category: true },
  });
  return rows.map((i) => serializeItem(i, { internal: true }));
}

export async function getAdminItem(id: string) {
  const item = await prisma.menuItem.findUnique({ where: { id }, include: { ...optionsInclude, category: true } });
  if (!item) throw notFound("Menu item");
  return serializeItem(item, { internal: true });
}

export async function createItem(data: z.infer<typeof itemSchema>) {
  const last = await prisma.menuItem.aggregate({ where: { categoryId: data.categoryId }, _max: { sortOrder: true } });
  const item = await prisma.menuItem.create({ data: { ...data, sortOrder: (last._max.sortOrder ?? 0) + 1 } }).catch(conflictOnSlug);
  return getAdminItem(item.id);
}

export async function updateItem(id: string, data: Partial<z.infer<typeof itemSchema>>) {
  const before = await prisma.menuItem.findUnique({ where: { id } });
  if (!before) throw notFound("Menu item");
  await prisma.menuItem.update({ where: { id }, data }).catch(conflictOnSlug);
  return { before, after: await getAdminItem(id) };
}

/** Replaces the item's whole option set. Past orders are unaffected: they keep their own snapshots. */
export async function replaceOptions(menuItemId: string, options: z.infer<typeof optionsSchema>) {
  if (!(await prisma.menuItem.findUnique({ where: { id: menuItemId } }))) throw notFound("Menu item");
  await prisma.$transaction(async (tx) => {
    await tx.menuItemOption.deleteMany({ where: { menuItemId } });
    for (const [i, o] of options.entries()) {
      await tx.menuItemOption.create({
        data: {
          menuItemId,
          name: o.name,
          minSelect: o.minSelect,
          maxSelect: o.maxSelect,
          sortOrder: i,
          values: { create: o.values.map((v, j) => ({ ...v, sortOrder: j })) },
        },
      });
    }
  });
  return getAdminItem(menuItemId);
}
