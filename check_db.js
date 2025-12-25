const { prisma } = require('/home/ubuntu/SAK-SMS/apps/api/dist/db.js');

async function check() {
  const tenant = await prisma.tenant.findFirst();
  console.log('Tenant:', tenant ? `${tenant.id} (${tenant.name})` : 'NOT FOUND');
  
  const leads = await prisma.lead.count({ where: { phone: '+917737845253' } });
  console.log('Test leads count:', leads);
  
  await prisma.$disconnect();
  process.exit(0);
}

check().catch(console.error);
