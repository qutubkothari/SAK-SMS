const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Find first tenant
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    console.log('❌ No tenant found. Please create a tenant first.');
    process.exit(1);
  }

  console.log('✓ Found tenant:', tenant.name);

  // Hash password
  const hash = await bcrypt.hash('515253', 10);

  // Create or update user
  const user = await prisma.user.upsert({
    where: { phone: '9537653927' },
    update: {
      passwordHash: hash,
      active: true
    },
    create: {
      tenantId: tenant.id,
      email: 'admin@sak.com',
      phone: '9537653927',
      passwordHash: hash,
      role: 'ADMIN',
      displayName: 'Admin User',
      active: true
    }
  });

  console.log('\n✅ User created/updated successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📱 Phone:    ', user.phone);
  console.log('🔑 Password: ', '515253');
  console.log('👤 Name:     ', user.displayName);
  console.log('👑 Role:     ', user.role);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
