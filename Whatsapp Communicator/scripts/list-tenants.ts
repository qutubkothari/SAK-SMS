import 'dotenv/config';
import { prisma } from '../src/db.js';

async function main() {
  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      name: true,
      sessionId: true,
      apiKeyMode: true,
      phoneNumber: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Intentionally does not print apiKey/webhookSecret.
  // eslint-disable-next-line no-console
  console.log(tenants);
}

await main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
