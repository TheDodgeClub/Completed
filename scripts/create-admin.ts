import bcrypt from "bcrypt";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const EMAIL = "admin@dodgeclub.com";
const PASSWORD = "dodgeball123";

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 10);

  const existing = await db.query.usersTable.findFirst({ where: eq(usersTable.email, EMAIL) });

  if (existing) {
    await db.update(usersTable)
      .set({ passwordHash: hash, isAdmin: true })
      .where(eq(usersTable.email, EMAIL));
    console.log(`Updated existing user: ${EMAIL} → isAdmin=true, password reset`);
  } else {
    await db.insert(usersTable).values({
      email: EMAIL,
      name: "Admin",
      passwordHash: hash,
      isAdmin: true,
      memberSince: new Date(),
    });
    console.log(`Created admin user: ${EMAIL}`);
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
