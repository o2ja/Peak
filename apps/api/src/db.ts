import pg from "pg";
import { attachDatabasePool } from "@vercel/functions";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.ts";
import { config } from "./config.ts";

// One pool for Prisma and the session store. On Vercel Fluid compute, attachDatabasePool closes idle
// clients before the instance suspends; elsewhere it is a no-op.
export const pool = new pg.Pool({ connectionString: config.DATABASE_URL, max: 10 });
attachDatabasePool(pool);

export const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
