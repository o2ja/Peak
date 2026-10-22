import { Router, type Response } from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { requireAdmin, loginSchema, verifyLogin, type AdminLocals } from "../auth.ts";
import { prisma } from "../db.ts";
import { HttpError } from "../lib/errors.ts";
import { MAX_UPLOAD_BYTES, saveImage } from "../lib/storage.ts";
import { fmt } from "../lib/money.ts";
import { overview, overviewSchema } from "../services/analytics.ts";
import { audit } from "../services/audit.ts";
import * as menu from "../services/menu.ts";
import * as orders from "../services/orders.ts";
import { getSettings, serializeSettings, settingsSchema, updateSettings } from "../services/settings.ts";

export const adminRouter = Router();
const id = (v: unknown) => z.uuid().parse(v);
const adminOf = (res: Response) => (res.locals as AdminLocals).admin;

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: "Too many sign-in attempts. Try again in 15 minutes." },
});

adminRouter.post("/auth/login", loginLimiter, async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const admin = await verifyLogin(email, password);
  if (!admin) throw new HttpError(401, "Email or password is incorrect.");
  // New session id on login prevents session fixation.
  await new Promise<void>((ok, fail) => req.session.regenerate((e) => (e ? fail(e) : ok())));
  req.session.adminId = admin.id;
  await new Promise<void>((ok, fail) => req.session.save((e) => (e ? fail(e) : ok())));
  res.json({ id: admin.id, name: admin.name, email: admin.email });
});

adminRouter.post("/auth/logout", (req, res, next) => {
  req.session.destroy((e) => {
    if (e) return next(e);
    res.clearCookie("peak.sid").status(204).end();
  });
});

// Everything below requires a signed-in admin.
adminRouter.use(requireAdmin);

adminRouter.get("/me", (_req, res) => {
  res.json(adminOf(res));
});

adminRouter.get("/overview", async (req, res) => {
  res.json(await overview(overviewSchema.parse(req.query)));
});

// ----- orders -----
adminRouter.get("/orders", async (req, res) => {
  res.json(await orders.listOrders(orders.listOrdersSchema.parse(req.query)));
});
adminRouter.get("/orders/:id", async (req, res) => {
  res.json(await orders.getAdminOrder(id(req.params.id)));
});
adminRouter.post("/orders/:id/status", async (req, res) => {
  res.json(await orders.changeStatus(id(req.params.id), adminOf(res).id, orders.statusChangeSchema.parse(req.body)));
});
adminRouter.post("/orders/:id/payment", async (req, res) => {
  res.json(await orders.changePayment(id(req.params.id), adminOf(res).id, orders.paymentChangeSchema.parse(req.body)));
});

// ----- categories -----
adminRouter.get("/categories", async (_req, res) => {
  res.json(await menu.listAdminCategories());
});
adminRouter.post("/categories", async (req, res) => {
  const c = await menu.createCategory(menu.categorySchema.parse(req.body));
  await audit(adminOf(res).id, "category.create", "category", c.id, { name: c.name });
  res.status(201).json(c);
});
adminRouter.post("/categories/reorder", async (req, res) => {
  await menu.reorder("category", menu.reorderSchema.parse(req.body).ids);
  res.status(204).end();
});
adminRouter.put("/categories/:id", async (req, res) => {
  const c = await menu.updateCategory(id(req.params.id), menu.categorySchema.parse(req.body));
  await audit(adminOf(res).id, "category.update", "category", c.id, { name: c.name, isActive: c.isActive });
  res.json(c);
});
adminRouter.delete("/categories/:id", async (req, res) => {
  const categoryId = id(req.params.id);
  await menu.deleteCategory(categoryId);
  await audit(adminOf(res).id, "category.delete", "category", categoryId);
  res.status(204).end();
});

// ----- items -----
adminRouter.get("/items", async (_req, res) => {
  res.json(await menu.listAdminItems());
});
adminRouter.post("/items/reorder", async (req, res) => {
  await menu.reorder("menuItem", menu.reorderSchema.parse(req.body).ids);
  res.status(204).end();
});
adminRouter.get("/items/:id", async (req, res) => {
  res.json(await menu.getAdminItem(id(req.params.id)));
});
adminRouter.post("/items", async (req, res) => {
  const item = await menu.createItem(menu.itemSchema.parse(req.body));
  await audit(adminOf(res).id, "item.create", "menuItem", item.id, { name: item.name, basePrice: item.basePrice });
  res.status(201).json(item);
});
// PATCH accepts any subset, so the list's quick toggles (sold out, featured, archive) reuse it.
adminRouter.patch("/items/:id", async (req, res) => {
  const { before, after } = await menu.updateItem(id(req.params.id), menu.itemSchema.partial().parse(req.body));
  const tracked = ["name", "basePrice", "isAvailable", "isActive", "isFeatured", "isSeasonal"] as const;
  const was = (k: (typeof tracked)[number]) => (k === "basePrice" ? fmt(before.basePrice) : before[k]);
  const changed = Object.fromEntries(tracked.filter((k) => was(k) !== after[k]).map((k) => [k, { from: was(k), to: after[k] }]));
  await audit(adminOf(res).id, "item.update", "menuItem", after.id, changed);
  res.json(after);
});
adminRouter.put("/items/:id/options", async (req, res) => {
  const item = await menu.replaceOptions(id(req.params.id), menu.optionsSchema.parse(req.body));
  await audit(adminOf(res).id, "item.options", "menuItem", item.id, { options: item.options.map((o) => o.name) });
  res.json(item);
});

// ----- uploads -----
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } });
adminRouter.post("/uploads", (req, res, next) => {
  upload.single("file")(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      const tooBig = err.code === "LIMIT_FILE_SIZE";
      return next(new HttpError(tooBig ? 413 : 400, tooBig ? "Images must be 3 MB or smaller." : "Upload failed."));
    }
    if (err) return next(err);
    if (!req.file) return next(new HttpError(400, "Choose an image to upload."));
    saveImage(req.file.buffer)
      .then((url) => res.status(201).json({ url }))
      .catch(next);
  });
});

// ----- settings & audit -----
adminRouter.get("/settings", async (_req, res) => {
  res.json(serializeSettings(await getSettings()));
});
adminRouter.put("/settings", async (req, res) => {
  const s = await updateSettings(settingsSchema.parse(req.body));
  await audit(adminOf(res).id, "settings.update", "settings", "1");
  res.json(serializeSettings(s));
});
adminRouter.get("/audit", async (_req, res) => {
  const rows = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { admin: { select: { name: true } } } });
  res.json(rows.map((r) => ({ id: r.id, action: r.action, entity: r.entity, entityId: r.entityId, details: r.details, createdAt: r.createdAt, by: r.admin?.name ?? null })));
});
