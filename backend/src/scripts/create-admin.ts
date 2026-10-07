import { db } from "../db/index.js";
import { admins } from "../db/schema.js";
import { hashPassword } from "../lib/auth.js";
import "dotenv/config";

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error("Usage: tsx src/scripts/create-admin.ts <email> <password>");
  process.exit(1);
}

const passwordHash = await hashPassword(password);
await db.insert(admins).values({ email, passwordHash });
console.log(`Admin created: ${email}`);
process.exit(0);