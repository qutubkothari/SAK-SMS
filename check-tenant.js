require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.tenant.findMany()
  .then(tenants => {
    console.log('Tenants:', JSON.stringify(tenants, null, 2));
  })
  .finally(() => prisma.$disconnect());
