// Creates (or resets the password of) a dashboard admin. There is no public sign-up.
// Usage: npm run admin:create -w apps/api -- <email> "<name>"
// The password is read from ADMIN_PASSWORD or prompted for (input hidden), never passed as an argument.
import { createInterface } from "node:readline";
import { hashPassword } from "../src/auth.ts";
import { pool, prisma } from "../src/db.ts";

async function promptHidden(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const write = (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput.bind(rl);
  (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s) => write(s.startsWith(question) ? s : "");
  const answer = await new Promise<string>((r) => rl.question(question, r));
  rl.close();
  process.stdout.write("\n");
  return answer;
}

const [email, name] = process.argv.slice(2);
if (!email || !name) {
  console.error('Usage: npm run admin:create -w apps/api -- <email> "<name>"');
  process.exit(1);
}

const password = process.env.ADMIN_PASSWORD ?? (await promptHidden("Password (min 12 characters): "));
if (password.length < 12) {
  console.error("Password must be at least 12 characters.");
  process.exit(1);
}

const passwordHash = await hashPassword(password);
const admin = await prisma.adminUser.upsert({
  where: { email: email.toLowerCase() },
  update: { passwordHash, name },
  create: { email: email.toLowerCase(), name, passwordHash },
});
console.log(`Admin ready: ${admin.email}`);
await prisma.$disconnect();
await pool.end();
