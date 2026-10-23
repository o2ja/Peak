import express from "express";
import helmet from "helmet";
import cors from "cors";
import { isAllowedOrigin, isProd } from "./config.ts";
import { sessionMiddleware } from "./auth.ts";
import { errorHandler, HttpError } from "./lib/errors.ts";
import { uploadDir } from "./lib/storage.ts";
import { publicRouter } from "./routes/public.ts";
import { adminRouter } from "./routes/admin.ts";

export function createApp() {
  const app = express();
  if (isProd) app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  // The web app normally proxies /api through Next (same origin); CORS covers direct calls from allowed origins.
  app.use(cors({ origin: (o, cb) => cb(null, !o || isAllowedOrigin(o)), credentials: true }));
  app.use(express.json({ limit: "100kb" }));

  // CSRF guard: browsers always send Origin on cross-site writes; reject any that isn't ours.
  app.use((req, _res, next) => {
    const origin = req.get("origin");
    if (req.method !== "GET" && req.method !== "HEAD" && origin && !isAllowedOrigin(origin)) {
      return next(new HttpError(403, "Origin not allowed"));
    }
    next();
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });
  app.use("/uploads", express.static(uploadDir, { maxAge: "7d", immutable: true, fallthrough: false }));
  app.use("/api/public", publicRouter);
  app.use("/api/admin", sessionMiddleware, adminRouter);
  app.use((_req, _res, next) => next(new HttpError(404, "Not found")));
  app.use(errorHandler);
  return app;
}
