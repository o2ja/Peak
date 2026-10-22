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
export const allowedOrigins = config.WEB_ORIGIN.split(",").map((s) => s.trim());
