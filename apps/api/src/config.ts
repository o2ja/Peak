import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  UPLOAD_DIR: z.string().default("./uploads"),
  NODE_ENV: z.string().default("development"),
});

export const config = schema.parse(process.env);
export const isProd = config.NODE_ENV === "production";
// Comma-separated; "*" matches one DNS label fragment, e.g. https://web-*-team.vercel.app for Vercel preview/deployment URLs.
const originPatterns = config.WEB_ORIGIN.split(",").map(
  (s) => new RegExp(`^${s.trim().replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[a-z0-9-]*")}$`),
);
export const isAllowedOrigin = (origin: string) => originPatterns.some((re) => re.test(origin));
