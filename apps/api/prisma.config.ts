import { defineConfig } from "prisma/config";

try {
  process.loadEnvFile();
} catch {
  // env may come from the shell instead of .env
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  // Migrations need a direct (non-pooled) connection; Neon on Vercel provides DATABASE_URL_UNPOOLED.
  datasource: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL },
});
