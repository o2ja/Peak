import { z } from "zod";
import { prisma } from "../db.ts";
import { fmt, money } from "../lib/money.ts";
import { OPEN_STATUSES } from "./orders.ts";
import { getSettings } from "./settings.ts";

export const overviewSchema = z.object({ days: z.coerce.number().int().min(1).max(90).default(14) });

/** Every number here is computed from stored orders; cancelled orders never count as revenue. */
export async function overview({ days }: z.infer<typeof overviewSchema>) {
  const settings = await getSettings();
  const tz = settings.timezone ?? "UTC";
  const now = new Date();
  const since = new Date(now.getTime() - days * 86_400_000);

  const dayStart = startOfDayIn(tz, now);
  const [today, awaiting, soldOut, recent, top, trend] = await Promise.all([
    prisma.order.aggregate({ where: { createdAt: { gte: dayStart }, status: { not: "CANCELLED" } }, _count: true, _sum: { total: true } }),
    prisma.order.count({ where: { status: { in: OPEN_STATUSES } } }),
    prisma.menuItem.findMany({ where: { isActive: true, isAvailable: false }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, reference: true, customerName: true, status: true, total: true, createdAt: true, fulfilment: true },
    }),
    prisma.orderItem.groupBy({
      by: ["nameSnapshot"],
      where: { order: { createdAt: { gte: since }, status: { not: "CANCELLED" } } },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    prisma.$queryRaw<{ day: string; orders: bigint; value: string }[]>`
      SELECT to_char(date_trunc('day', "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${tz}), 'YYYY-MM-DD') AS day,
             count(*) AS orders, coalesce(sum(total), 0)::text AS value
      FROM orders
      WHERE "createdAt" >= ${since} AND status <> 'CANCELLED'
      GROUP BY 1 ORDER BY 1`,
  ]);

  // Fill missing days with zeros so the chart's x-axis is honest about quiet days.
  const byDay = new Map(trend.map((r) => [r.day, r]));
  const series = Array.from({ length: days }, (_, i) => {
    const d = new Date(now.getTime() - (days - 1 - i) * 86_400_000);
    const key = d.toLocaleDateString("en-CA", { timeZone: tz });
    const row = byDay.get(key);
    return { day: key, orders: Number(row?.orders ?? 0), value: fmt(row?.value ?? 0) };
  });

  return {
    currencyCode: settings.currencyCode,
    timezone: tz,
    timezoneConfirmed: settings.timezone !== null,
    today: { orders: today._count, value: fmt(today._sum.total ?? 0) },
    awaitingAction: awaiting,
    soldOut,
    recent: recent.map((o) => ({ ...o, total: fmt(o.total) })),
    topItems: top.map((t) => ({ name: t.nameSnapshot, quantity: t._sum.quantity ?? 0, value: fmt(money(t._sum.lineTotal ?? 0)) })),
    trend: series,
  };
}

/** Midnight "today" in the store's timezone, as a UTC instant. */
function startOfDayIn(tz: string, now: Date) {
  const local = new Date(now.toLocaleString("en-US", { timeZone: tz }));
  const offset = now.getTime() - local.getTime();
  local.setHours(0, 0, 0, 0);
  return new Date(local.getTime() + offset);
}
