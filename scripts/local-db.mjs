// Runs a project-owned PostgreSQL cluster from installed PostgreSQL binaries (no Docker needed).
// Usage: node scripts/local-db.mjs <init|start|stop|status>
// Env: PG_BIN (folder with initdb/pg_ctl), PEAK_PG_PORT (default 5433), PEAK_PG_PASSWORD (init only).
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";

const root = resolve(import.meta.dirname, "..");
const dataDir = join(root, ".pgdata");
const port = process.env.PEAK_PG_PORT ?? "5433";
const exe = process.platform === "win32" ? ".exe" : "";

function findBin() {
  if (process.env.PG_BIN) return process.env.PG_BIN;
  if (process.platform === "win32") {
    const base = "C:/Program Files/PostgreSQL";
    if (existsSync(base)) {
      const v = readdirSync(base).sort((a, b) => Number(b) - Number(a))[0];
      if (v) return join(base, v, "bin");
    }
  }
  return ""; // fall back to PATH
}
const bin = (name) => {
  const dir = findBin();
  return dir ? join(dir, name + exe) : name;
};
// "start" must not inherit our stdio: the detached postgres would keep the pipes (and this process) open.
const run = (name, args, stdio = "inherit") => execFileSync(bin(name), args, { stdio });

const cmd = process.argv[2];
if (cmd === "init") {
  if (existsSync(dataDir)) {
    console.log(".pgdata already exists, skipping initdb");
  } else {
    const password = process.env.PEAK_PG_PASSWORD ?? randomBytes(18).toString("base64url");
    const pwFile = join(root, ".pg-pwfile");
    writeFileSync(pwFile, password);
    try {
      run("initdb", ["-D", dataDir, "-U", "peak", "--pwfile", pwFile, "-A", "scram-sha-256", "-E", "UTF8"]);
    } finally {
      rmSync(pwFile, { force: true });
    }
    console.log(`\nCluster created. Put this in apps/api/.env:\nDATABASE_URL="postgresql://peak:${password}@localhost:${port}/peak"\n`);
  }
} else if (cmd === "start") {
  run("pg_ctl", ["-D", dataDir, "-o", `-p ${port}`, "-l", join(dataDir, "server.log"), "-w", "start"], "ignore");
  console.log(`PostgreSQL running on port ${port} (log: .pgdata/server.log)`);
} else if (cmd === "stop") {
  run("pg_ctl", ["-D", dataDir, "-w", "stop"]);
} else if (cmd === "status") {
  run("pg_ctl", ["-D", dataDir, "status"]);
} else {
  console.log("Usage: node scripts/local-db.mjs <init|start|stop|status>");
  process.exit(1);
}
