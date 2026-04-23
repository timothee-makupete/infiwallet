import { PrismaClient } from "./generated";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@infiwallet.local";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin123456!";
  const hash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash: hash,
      firstName: "Admin",
      lastName: "User",
      role: "SUPER_ADMIN",
      emailVerified: true,
      profile: { create: {} },
    },
    update: {
      passwordHash: hash,
      role: "SUPER_ADMIN",
      emailVerified: true,
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
