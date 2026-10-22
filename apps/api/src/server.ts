import { createApp } from "./app.ts";
import { config } from "./config.ts";
import { prisma } from "./db.ts";

const server = createApp().listen(config.PORT, () => {
  console.log(`[api] listening on http://localhost:${config.PORT}`);
});

const shutdown = () => {
  server.close(() => void prisma.$disconnect().then(() => process.exit(0)));
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
