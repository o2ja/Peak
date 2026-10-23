import argon2 from "argon2";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import type { RequestHandler } from "express";
import { z } from "zod";
import { config, isProd } from "./config.ts";
import { pool, prisma } from "./db.ts";
import { HttpError } from "./lib/errors.ts";

declare module "express-session" {
  interface SessionData {
    adminId?: string;
  }
}

const PgStore = connectPgSimple(session);

export const sessionMiddleware = session({
  name: "peak.sid",
  // Table is created by the Prisma migration, not by the store.
  store: new PgStore({ pool, tableName: "session" }),
  secret: config.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { httpOnly: true, sameSite: "lax", secure: isProd, maxAge: 8 * 60 * 60 * 1000 },
});

export const hashPassword = (pw: string) => argon2.hash(pw, { type: argon2.argon2id });

export const loginSchema = z.object({ email: z.email().max(120), password: z.string().min(1).max(200) });

// Verified against a real hash even for unknown emails so response time doesn't reveal which emails exist.
let dummyHash: Promise<string> | undefined;

export async function verifyLogin(email: string, password: string) {
  const admin = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });
  dummyHash ??= hashPassword("not-a-real-password");
  const ok = await argon2.verify(admin?.passwordHash ?? (await dummyHash), password);
  return admin && ok ? admin : null;
}

export type AdminLocals = { admin: { id: string; name: string; email: string } };

/** Every /api/admin route except login goes through this; the session alone is never trusted for a deleted admin. */
export const requireAdmin: RequestHandler<unknown, unknown, unknown, unknown, AdminLocals> = async (req, res, next) => {
  const id = req.session.adminId;
  if (!id) return next(new HttpError(401, "Please sign in."));
  const admin = await prisma.adminUser.findUnique({ where: { id }, select: { id: true, name: true, email: true } });
  if (!admin) {
    req.session.destroy(() => {});
    return next(new HttpError(401, "Please sign in."));
  }
  res.locals.admin = admin;
  next();
};
