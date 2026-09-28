import 'dotenv/config';

import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  await prisma.plan.upsert({
    where: {
      type: 'FREE',
    },
    update: {
      name: 'Free',
      monthlyLimit: 50,
    },
    create: {
      type: 'FREE',
      name: 'Free',
      monthlyLimit: 50,
    },
  });

  await prisma.plan.upsert({
    where: {
      type: 'PREMIUM',
    },
    update: {
      name: 'Premium',
      monthlyLimit: 1000,
    },
    create: {
      type: 'PREMIUM',
      name: 'Premium',
      monthlyLimit: 1000,
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
