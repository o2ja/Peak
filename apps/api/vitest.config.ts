import { defineConfig } from "vitest/config";

// Tests run against a separate `peak_test` database (migrated + seeded, never reset); tests restore what they change.
try {
  process.loadEnvFile();
} catch {}
const url = new URL(process.env.DATABASE_URL ?? "");
url.pathname = "/peak_test";
process.env.DATABASE_URL = url.toString();
process.env.SESSION_SECRET ??= "test-secret-test-secret-test-secret-123";

export default defineConfig({
  test: { globalSetup: "test/global-setup.ts", fileParallelism: false, testTimeout: 20000, hookTimeout: 120000 },
});
