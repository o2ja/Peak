import { randomBytes, randomInt } from "node:crypto";
import { z } from "zod";
import { prisma } from "../db.ts";
import { Prisma, type OrderStatus, type PaymentStatus } from "../generated/prisma/client.ts";
import { HttpError, notFound } from "../lib/errors.ts";
import { fmt } from "../lib/money.ts";
import { getSettings } from "./settings.ts";
import { priceCart, type CartLineInput, type ItemForPricing, type PricedCart } from "./pricing.ts";
import { audit } from "./audit.ts";

const lineSchema = z.object({
  menuItemId: z.uuid(),
  quantity: z.number().int().min(1).max(50),
  optionValueIds: z.array(z.uuid()).max(20).default([]),
});
const linesSchema = z.array(lineSchema).min(1, "Your bag is empty.").max(30);

export const quoteSchema = z.object({
  fulfilment: z.enum(["PICKUP", "DELIVERY"]).default("PICKUP"),
  lines: linesSchema,
});

export const createOrderSchema = z
  .object({
    idempotencyKey: z.uuid(),
    fulfilment: z.enum(["PICKUP", "DELIVERY"]),
    customerName: z.string().trim().min(2).max(80),
    customerPhone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number"),
    customerEmail: z.email().max(120).optional().or(z.literal("").transform(() => undefined)),
    deliveryAddress: z.string().trim().max(300).optional(),
    notes: z.string().trim().max(500).optional(),
    paymentMethod: z.enum(["PAY_AT_PICKUP"]),
    lines: linesSchema,
  })
  .refine((o) => o.fulfilment !== "DELIVERY" || (o.deliveryAddress?.length ?? 0) >= 5, {
    path: ["deliveryAddress"],
    message: "Delivery address is required",
  });

async function loadItems(lines: CartLineInput[], tx: Prisma.TransactionClient = prisma) {
  const rows = await tx.menuItem.findMany({
    where: { id: { in: [...new Set(lines.map((l) => l.menuItemId))] } },
    include: {
      category: { select: { isActive: true } },
      options: { orderBy: { sortOrder: "asc" }, include: { values: { orderBy: { sortOrder: "asc" } } } },
    },
  });
  return new Map<string, ItemForPricing>(rows.map((r) => [r.id, r]));
}

function assertFulfilment(settings: Awaited<ReturnType<typeof getSettings>>, fulfilment: "PICKUP" | "DELIVERY") {
  if (fulfilment === "PICKUP" && !settings.pickupEnabled) throw new HttpError(422, "Pickup is not available right now.");
  if (fulfilment === "DELIVERY" && !settings.deliveryEnabled) throw new HttpError(422, "Delivery is not available right now.");
}

export const serializeCart = (cart: PricedCart, currencyCode: string) => ({
  currencyCode,
  lines: cart.lines.map((l) => ({ ...l, basePrice: fmt(l.basePrice), unitPrice: fmt(l.unitPrice), lineTotal: fmt(l.lineTotal) })),
  subtotal: fmt(cart.subtotal),
  discountTotal: fmt(cart.discountTotal),
  deliveryFee: fmt(cart.deliveryFee),
  total: fmt(cart.total),
});

export async function quote(input: z.infer<typeof quoteSchema>) {
  const settings = await getSettings();
  const fee = input.fulfilment === "DELIVERY" ? settings.deliveryFee : 0;
  return serializeCart(priceCart(input.lines, await loadItems(input.lines), fee), settings.currencyCode);
}

// Unambiguous characters only (no 0/O, 1/I/L) so references read well over the counter.
const REF_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const newReference = () => "PK-" + Array.from({ length: 6 }, () => REF_ALPHABET[randomInt(REF_ALPHABET.length)]).join("");

const isUniqueViolation = (e: unknown, field: string) =>
  e instanceof Prisma.PrismaClientKnownRequestError &&
  e.code === "P2002" &&
  JSON.stringify(e.meta ?? {}).includes(field);

export async function createOrder(input: z.infer<typeof createOrderSchema>) {
  // A retried submit (double click, flaky network) returns the order already created for this key.
  const existing = await prisma.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) return { order: existing, replayed: true };

  const settings = await getSettings();
  if (!settings.acceptingOrders) throw new HttpError(503, "We're not taking online orders at the moment.");
  assertFulfilment(settings, input.fulfilment);
  if (input.paymentMethod === "PAY_AT_PICKUP" && !settings.payAtPickupEnabled) throw new HttpError(422, "This payment method is not available.");

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const order = await prisma.$transaction(
        async (tx) => {
          // Price inside the transaction so an item sold out a moment ago cannot slip through.
          const cart = priceCart(input.lines, await loadItems(input.lines, tx), input.fulfilment === "DELIVERY" ? settings.deliveryFee : 0);
          return tx.order.create({
            data: {
              reference: newReference(),
              accessToken: randomBytes(24).toString("base64url"),
              idempotencyKey: input.idempotencyKey,
              customerName: input.customerName,
              customerPhone: input.customerPhone,
              customerEmail: input.customerEmail,
              fulfilment: input.fulfilment,
              deliveryAddress: input.fulfilment === "DELIVERY" ? input.deliveryAddress : null,
              notes: input.notes || null,
              paymentMethod: input.paymentMethod,
              currencyCode: settings.currencyCode,
              subtotal: cart.subtotal,
              discountTotal: cart.discountTotal,
              deliveryFee: cart.deliveryFee,
              total: cart.total,
              items: {
                create: cart.lines.map((l) => ({
                  menuItemId: l.menuItemId,
                  nameSnapshot: l.name,
                  imageSnapshot: l.imageUrl,
                  basePrice: l.basePrice,
                  optionsSnapshot: l.options,
                  unitPrice: l.unitPrice,
                  quantity: l.quantity,
                  lineTotal: l.lineTotal,
                })),
              },
              events: { create: { toStatus: "PENDING" } },
            },
          });
        },
        { isolationLevel: "Serializable" },
      );
      return { order, replayed: false };
    } catch (e) {
      if (isUniqueViolation(e, "idempotencyKey")) {
        const order = await prisma.order.findUniqueOrThrow({ where: { idempotencyKey: input.idempotencyKey } });
        return { order, replayed: true };
      }
      const retryable = isUniqueViolation(e, "reference") || (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034");
      if (!retryable) throw e;
    }
  }
  throw new HttpError(503, "We couldn't place your order. Please try again.");
}

const orderDetailInclude = {
  items: true,
  events: { orderBy: { createdAt: "asc" }, include: { admin: { select: { name: true } } } },
} satisfies Prisma.OrderInclude;

type OrderWithDetail = Prisma.OrderGetPayload<{ include: typeof orderDetailInclude }>;

function serializeOrder(o: OrderWithDetail, { internal }: { internal: boolean }) {
  return {
    id: internal ? o.id : undefined,
    reference: o.reference,
    status: o.status,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    fulfilment: o.fulfilment,
    customerName: o.customerName,
    customerPhone: internal ? o.customerPhone : undefined,
    customerEmail: internal ? o.customerEmail : undefined,
    deliveryAddress: internal ? o.deliveryAddress : undefined,
    notes: o.notes,
    currencyCode: o.currencyCode,
    subtotal: fmt(o.subtotal),
    discountTotal: fmt(o.discountTotal),
    deliveryFee: fmt(o.deliveryFee),
    total: fmt(o.total),
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    items: o.items.map((i) => ({
      id: i.id,
      menuItemId: i.menuItemId,
      name: i.nameSnapshot,
      imageUrl: i.imageSnapshot,
      options: i.optionsSnapshot,
      unitPrice: fmt(i.unitPrice),
      quantity: i.quantity,
      lineTotal: fmt(i.lineTotal),
    })),
    events: o.events.map((e) => ({
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      createdAt: e.createdAt,
      by: internal ? (e.admin?.name ?? (e.fromStatus ? null : "Customer")) : undefined,
      note: internal ? e.note : undefined,
    })),
  };
}

export async function getPublicOrder(reference: string, token: string) {
  const order = await prisma.order.findUnique({ where: { reference }, include: orderDetailInclude });
  // Same 404 for wrong reference and wrong token: never confirm another customer's order exists.
  if (!order || order.accessToken !== token) throw notFound("Order");
  return serializeOrder(order, { internal: false });
}

export async function getAdminOrder(id: string) {
  const order = await prisma.order.findUnique({ where: { id }, include: orderDetailInclude });
  if (!order) throw notFound("Order");
  return serializeOrder(order, { internal: true });
}

export const listOrdersSchema = z.object({
  q: z.string().trim().max(80).optional(),
  status: z.enum(["PENDING", "CONFIRMED", "PREPARING", "READY", "COMPLETED", "CANCELLED", "OPEN"]).optional(),
  fulfilment: z.enum(["PICKUP", "DELIVERY"]).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export const OPEN_STATUSES: OrderStatus[] = ["PENDING", "CONFIRMED", "PREPARING", "READY"];

export async function listOrders(q: z.infer<typeof listOrdersSchema>) {
  const pageSize = 25;
  const where: Prisma.OrderWhereInput = {
    status: q.status === "OPEN" ? { in: OPEN_STATUSES } : q.status,
    fulfilment: q.fulfilment,
    createdAt: q.from || q.to ? { gte: q.from, lte: q.to } : undefined,
    OR: q.q
      ? [
          { reference: { contains: q.q, mode: "insensitive" } },
          { customerName: { contains: q.q, mode: "insensitive" } },
          { customerPhone: { contains: q.q } },
        ]
      : undefined,
  };
  const [total, rows] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { items: true } } },
    }),
  ]);
  return {
    total,
    page: q.page,
    pageSize,
    orders: rows.map((o) => ({
      id: o.id,
      reference: o.reference,
      customerName: o.customerName,
      fulfilment: o.fulfilment,
      status: o.status,
      paymentStatus: o.paymentStatus,
      total: fmt(o.total),
      currencyCode: o.currencyCode,
      itemCount: o._count.items,
      createdAt: o.createdAt,
    })),
  };
}

export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export const PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  UNPAID: ["PAID"],
  PAID: ["REFUNDED"],
  REFUNDED: [],
};

export const statusChangeSchema = z.object({
  to: z.enum(["PENDING", "CONFIRMED", "PREPARING", "READY", "COMPLETED", "CANCELLED"]),
  note: z.string().trim().max(500).optional(),
});

export async function changeStatus(id: string, adminId: string, { to, note }: z.infer<typeof statusChangeSchema>) {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw notFound("Order");
  if (!STATUS_TRANSITIONS[order.status].includes(to)) {
    throw new HttpError(409, `An order that is ${order.status.toLowerCase()} can't move to ${to.toLowerCase()}.`);
  }
  await prisma.$transaction(async (tx) => {
    // Conditional update: if another admin changed it first, nothing matches and we report a conflict.
    const { count } = await tx.order.updateMany({ where: { id, status: order.status }, data: { status: to } });
    if (count === 0) throw new HttpError(409, "This order was just updated by someone else. Refresh and try again.");
    await tx.orderStatusEvent.create({ data: { orderId: id, fromStatus: order.status, toStatus: to, adminId, note: note || null } });
  });
  return getAdminOrder(id);
}

export const paymentChangeSchema = z.object({ to: z.enum(["UNPAID", "PAID", "REFUNDED"]) });

export async function changePayment(id: string, adminId: string, { to }: z.infer<typeof paymentChangeSchema>) {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw notFound("Order");
  if (!PAYMENT_TRANSITIONS[order.paymentStatus].includes(to)) {
    throw new HttpError(409, `Payment can't move from ${order.paymentStatus.toLowerCase()} to ${to.toLowerCase()}.`);
  }
  const { count } = await prisma.order.updateMany({ where: { id, paymentStatus: order.paymentStatus }, data: { paymentStatus: to } });
  if (count === 0) throw new HttpError(409, "This order was just updated by someone else. Refresh and try again.");
  await audit(adminId, "order.payment", "order", id, { from: order.paymentStatus, to });
  return getAdminOrder(id);
}
