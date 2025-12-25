const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLead() {
  try {
    const lead = await prisma.lead.findFirst({
      where: { phone: '+917737845253' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        assignedTo: {
          select: { fullName: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!lead) {
      console.log('❌ No lead found for +917737845253');
      return;
    }
    
    console.log('\n✅ Lead Found:');
    console.log('ID:', lead.id);
    console.log('Name:', lead.fullName);
    console.log('Phone:', lead.phone);
    console.log('Channel:', lead.channel);
    console.log('Status:', lead.status);
    console.log('Heat:', lead.heat);
    console.log('Score:', lead.score);
    console.log('Assigned to:', lead.assignedTo?.fullName || 'Unassigned');
    console.log('Created:', lead.createdAt);
    
    console.log('\n📨 Messages (' + lead.messages.length + '):');
    lead.messages.forEach((msg, i) => {
      console.log(`\n${i+1}. ${msg.direction} message (${msg.createdAt.toISOString()}):`);
      console.log('   Body:', msg.body.substring(0, 100));
      console.log('   Channel:', msg.channel);
      console.log('   Status:', msg.status);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkLead();
