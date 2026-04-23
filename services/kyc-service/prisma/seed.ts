import { PrismaClient } from "./generated";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const tiers = [
    { tier: 1, dailyLimit: 50_000, monthlyLimit: 500_000, singleTransactionLimit: 25_000 },
    { tier: 2, dailyLimit: 250_000, monthlyLimit: 2_000_000, singleTransactionLimit: 100_000 },
    { tier: 3, dailyLimit: 1_000_000, monthlyLimit: 10_000_000, singleTransactionLimit: 500_000 },
  ];
  for (const t of tiers) {
    await prisma.tierLimit.upsert({
      where: { tier: t.tier },
      create: {
        tier: t.tier,
        dailyLimit: t.dailyLimit,
        monthlyLimit: t.monthlyLimit,
        singleTransactionLimit: t.singleTransactionLimit,
      },
      update: {
        dailyLimit: t.dailyLimit,
        monthlyLimit: t.monthlyLimit,
        singleTransactionLimit: t.singleTransactionLimit,
      },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
