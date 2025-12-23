const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Setting up SAK CRM...\n');

  // Create or get tenant
  let tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: 'SAK Organization',
      }
    });
    console.log('✓ Created tenant:', tenant.name);
  } else {
    console.log('✓ Using existing tenant:', tenant.name);
  }

  // Hash password
  const hash = await bcrypt.hash('515253', 10);

  // Create or update admin user
  const user = await prisma.user.upsert({
    where: { phone: '9537653927' },
    update: {
      passwordHash: hash,
      active: true,
      tenantId: tenant.id
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

  console.log('\n✅ Setup completed successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🏢 Organization:', tenant.name);
  console.log('👤 User:        ', user.displayName);
  console.log('📱 Phone:       ', user.phone);
  console.log('🔑 Password:    ', '515253');
  console.log('👑 Role:        ', user.role);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n🌐 Login at: http://13.203.69.128/');
  console.log('   Phone:    9537653927');
  console.log('   Password: 515253\n');
}

main()
  .catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
