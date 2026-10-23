import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.ts";
import { hashPassword } from "../src/auth.ts";
import { pool, prisma } from "../src/db.ts";

const app = createApp();
const ADMIN = { email: "test-admin@example.test", password: "correct-horse-battery" };

type Menu = { categories: { slug: string; items: { id: string; slug: string; basePrice: string; options: { values: { id: string; priceDelta: string }[] }[] }[] }[] };
let latte: Menu["categories"][number]["items"][number];
const defaultChoices = () => latte.options.filter((_, i) => i < 2).map((o) => o.values[0].id); // Size + Milk (required)

const orderBody = (over: Record<string, unknown> = {}) => ({
  idempotencyKey: randomUUID(),
  fulfilment: "PICKUP",
  customerName: "Test Customer",
  customerPhone: "+962 7 0000 0000",
  paymentMethod: "PAY_AT_PICKUP",
  lines: [{ menuItemId: latte.id, quantity: 2, optionValueIds: defaultChoices() }],
  ...over,
});

async function signedIn() {
  const agent = request.agent(app);
  await agent.post("/api/admin/auth/login").send(ADMIN).expect(200);
  return agent;
}

beforeAll(async () => {
  const passwordHash = await hashPassword(ADMIN.password);
  await prisma.adminUser.upsert({ where: { email: ADMIN.email }, update: { passwordHash }, create: { email: ADMIN.email, name: "Test Admin", passwordHash } });
  const menu: Menu = (await request(app).get("/api/public/menu").expect(200)).body;
  latte = menu.categories.find((c) => c.slug === "matcha")!.items.find((i) => i.slug === "iced-matcha-latte")!;
});
afterAll(() => prisma.$disconnect().then(() => pool.end()));

describe("admin auth", () => {
  it("rejects every protected route without a session", async () => {
    for (const [method, path] of [
      ["get", "/api/admin/me"],
      ["get", "/api/admin/orders"],
      ["post", "/api/admin/items"],
      ["put", "/api/admin/settings"],
      ["post", "/api/admin/uploads"],
    ] as const) {
      await request(app)[method](path).expect(401);
    }
  });

  it("rejects a wrong password and accepts the right one", async () => {
    await request(app).post("/api/admin/auth/login").send({ ...ADMIN, password: "wrong-password" }).expect(401);
    const agent = await signedIn();
    expect((await agent.get("/api/admin/me").expect(200)).body.email).toBe(ADMIN.email);
    await agent.post("/api/admin/auth/logout").expect(204);
    await agent.get("/api/admin/me").expect(401);
  });

  it("sets an HttpOnly session cookie", async () => {
    const res = await request(app).post("/api/admin/auth/login").send(ADMIN).expect(200);
    expect(String(res.headers["set-cookie"])).toMatch(/HttpOnly/i);
  });

  it("blocks writes from foreign origins", async () => {
    await request(app).post("/api/public/orders").set("Origin", "https://evil.example").send(orderBody()).expect(403);
  });
});

describe("orders", () => {
  it("ignores client-sent prices and computes totals on the server", async () => {
    const body = orderBody({ total: "0.001", lines: [{ menuItemId: latte.id, quantity: 2, optionValueIds: defaultChoices(), unitPrice: "0.001" }] });
    const res = await request(app).post("/api/public/orders").send(body).expect(201);
    const order = await prisma.order.findUniqueOrThrow({ where: { reference: res.body.reference }, include: { items: true, events: true } });
    expect(order.total.toFixed(3)).toBe((Number(latte.basePrice) * 2).toFixed(3));
    expect(order.items[0].nameSnapshot).toBe("Iced Matcha Latte");
    expect(order.events.map((e) => e.toStatus)).toEqual(["PENDING"]);
  });

  it("returns the same order for a repeated idempotency key", async () => {
    const body = orderBody();
    const first = await request(app).post("/api/public/orders").send(body).expect(201);
    const [a, b] = await Promise.all([request(app).post("/api/public/orders").send(body), request(app).post("/api/public/orders").send(body)]);
    expect([a.body.reference, b.body.reference]).toEqual([first.body.reference, first.body.reference]);
    expect(await prisma.order.count({ where: { idempotencyKey: body.idempotencyKey } })).toBe(1);
  });

  it("rejects invalid quantities and sold-out items", async () => {
    await request(app).post("/api/public/orders").send(orderBody({ lines: [{ menuItemId: latte.id, quantity: 0, optionValueIds: defaultChoices() }] })).expect(400);
    await request(app).post("/api/public/orders").send(orderBody({ lines: [{ menuItemId: latte.id, quantity: 51, optionValueIds: defaultChoices() }] })).expect(400);
    await prisma.menuItem.update({ where: { id: latte.id }, data: { isAvailable: false } });
    try {
      const res = await request(app).post("/api/public/orders").send(orderBody()).expect(422);
      expect(res.body.details[0].message).toMatch(/sold out/);
    } finally {
      await prisma.menuItem.update({ where: { id: latte.id }, data: { isAvailable: true } });
    }
  });

  it("rejects delivery while delivery is disabled", async () => {
    await request(app).post("/api/public/orders").send(orderBody({ fulfilment: "DELIVERY", deliveryAddress: "Somewhere 12" })).expect(422);
  });

  it("only shows an order to the holder of its access token", async () => {
    const { body } = await request(app).post("/api/public/orders").send(orderBody()).expect(201);
    const ok = await request(app).get(`/api/public/orders/${body.reference}`).query({ token: body.accessToken }).expect(200);
    expect(ok.body.customerPhone).toBeUndefined();
    await request(app).get(`/api/public/orders/${body.reference}`).query({ token: "x".repeat(32) }).expect(404);
  });

  it("allows only valid status transitions, records history, and keeps payment separate", async () => {
    const { body } = await request(app).post("/api/public/orders").send(orderBody()).expect(201);
    const id = (await prisma.order.findUniqueOrThrow({ where: { reference: body.reference } })).id;
    const agent = await signedIn();
    await agent.post(`/api/admin/orders/${id}/status`).send({ to: "READY" }).expect(409);
    await agent.post(`/api/admin/orders/${id}/status`).send({ to: "CONFIRMED" }).expect(200);
    const res = await agent.post(`/api/admin/orders/${id}/status`).send({ to: "PREPARING", note: "on it" }).expect(200);
    expect(res.body.events.map((e: { toStatus: string }) => e.toStatus)).toEqual(["PENDING", "CONFIRMED", "PREPARING"]);
    expect(res.body.paymentStatus).toBe("UNPAID");
    await agent.post(`/api/admin/orders/${id}/payment`).send({ to: "REFUNDED" }).expect(409);
    expect((await agent.post(`/api/admin/orders/${id}/payment`).send({ to: "PAID" }).expect(200)).body.paymentStatus).toBe("PAID");
  });
});

describe("menu management", () => {
  it("persists an edit and shows it on the public menu", async () => {
    const agent = await signedIn();
    const startedAt = new Date();
    await agent.patch(`/api/admin/items/${latte.id}`).send({ basePrice: "3.900", name: "Iced Matcha Latte (edited)" }).expect(200);
    try {
      const item = (await request(app).get(`/api/public/menu/items/${latte.slug}`).expect(200)).body;
      expect(item).toMatchObject({ basePrice: "3.900", name: "Iced Matcha Latte (edited)" });
      const log = await prisma.auditLog.findFirstOrThrow({ where: { entityId: latte.id, action: "item.update", createdAt: { gte: startedAt } } });
      expect(log.details).toMatchObject({ basePrice: { from: latte.basePrice, to: "3.900" } });
    } finally {
      await agent.patch(`/api/admin/items/${latte.id}`).send({ basePrice: latte.basePrice, name: "Iced Matcha Latte" }).expect(200);
    }
  });

  it("hides archived items publicly and refuses to delete a category that still has items", async () => {
    const agent = await signedIn();
    await agent.patch(`/api/admin/items/${latte.id}`).send({ isActive: false }).expect(200);
    await request(app).get(`/api/public/menu/items/${latte.slug}`).expect(404);
    await agent.patch(`/api/admin/items/${latte.id}`).send({ isActive: true }).expect(200);
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: "matcha" } });
    await agent.delete(`/api/admin/categories/${category.id}`).expect(409);
  });

  it("validates uploads by content, not by filename", async () => {
    const agent = await signedIn();
    await agent.post("/api/admin/uploads").attach("file", Buffer.from("<svg onload=alert(1)>"), { filename: "x.png", contentType: "image/png" }).expect(415);
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
    const res = await agent.post("/api/admin/uploads").attach("file", png, { filename: "evil.php", contentType: "text/plain" }).expect(201);
    expect(res.body.url).toMatch(/^\/uploads\/[0-9a-f-]+\.png$/);
  });

  it("accepts only uploaded or bundled image paths", async () => {
    const agent = await signedIn();
    const before = (await request(app).get(`/api/public/menu/items/${latte.slug}`).expect(200)).body.imageUrl;
    try {
      await agent.patch(`/api/admin/items/${latte.id}`).send({ imageUrl: "/images/drinks/matcha-latte.webp" }).expect(200);
      for (const bad of ["https://evil.test/x.png", "/images/drinks/../x.png", "/images/other/x.png"]) {
        await agent.patch(`/api/admin/items/${latte.id}`).send({ imageUrl: bad }).expect(400);
      }
    } finally {
      await agent.patch(`/api/admin/items/${latte.id}`).send({ imageUrl: before }).expect(200);
    }
  });

  it("rejects script URLs in settings links", async () => {
    const agent = await signedIn();
    const current = (await agent.get("/api/admin/settings").expect(200)).body;
    const { id: _id, updatedAt: _u, ...rest } = current;
    await agent.put("/api/admin/settings").send({ ...rest, heroCtaHref: "javascript:alert(1)" }).expect(400);
    await agent.put("/api/admin/settings").send({ ...rest, timezone: "Mars/Base" }).expect(400);
    await agent.put("/api/admin/settings").send({ ...rest, heroHeading: "New heading" }).expect(200);
    expect((await request(app).get("/api/public/settings").expect(200)).body.heroHeading).toBe("New heading");
    await agent.put("/api/admin/settings").send(rest).expect(200);
  });
});
