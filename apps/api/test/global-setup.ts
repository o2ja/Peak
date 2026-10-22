import { execSync } from "node:child_process";

export default function setup() {
  const opts = { stdio: "inherit" as const, env: process.env };
  execSync("npx prisma migrate deploy", opts);
  execSync("npx tsx prisma/seed.ts", opts);
}
