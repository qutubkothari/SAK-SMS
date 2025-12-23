import 'dotenv/config';
import { prisma } from '../src/db.js';

async function main() {
  // Order matters due to FK (InboundMessage -> Tenant)
  const inbound = await prisma.inboundMessage.deleteMany({});
  const tenants = await prisma.tenant.deleteMany({});

  // eslint-disable-next-line no-console
  console.log(`Deleted ${inbound.count} inbound messages`);
  // eslint-disable-next-line no-console
  console.log(`Deleted ${tenants.count} tenants`);
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
