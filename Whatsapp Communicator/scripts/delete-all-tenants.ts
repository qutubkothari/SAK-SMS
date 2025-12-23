import 'dotenv/config';
import { prisma } from '../src/db.js';

async function main() {
  const result = await prisma.tenant.deleteMany({});
  // eslint-disable-next-line no-console
  console.log(`Deleted ${result.count} tenants`);
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
