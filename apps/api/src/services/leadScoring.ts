import { prisma } from '../db.js';

export async function calculateLeadScore(leadId: string): Promise<number> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      messages: true,
      notes: true,
      calls: true,
      tasks: true,
      successEvents: true,
      events: true
    }
  });

  if (!lead) return 0;

  let score = 0;

  // Base score from lead completeness
  if (lead.fullName) score += 10;
  if (lead.phone) score += 10;
  if (lead.email) score += 10;

  // Activity-based scoring
  score += lead.messages.length * 5;
  score += lead.notes.length * 3;
  score += lead.calls.length * 8;
  score += lead.tasks.filter(t => t.status === 'COMPLETED').length * 5;
  
  // Success events add significant score
  score += lead.successEvents.length * 20;

  // Call outcomes matter
  const answeredCalls = lead.calls.filter(c => c.outcome === 'ANSWERED').length;
  score += answeredCalls * 10;

  // Recent activity boost
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentMessages = lead.messages.filter(m => new Date(m.createdAt) > oneWeekAgo).length;
  score += recentMessages * 3;

  // Status-based scoring
  if (lead.status === 'QUALIFIED') score += 30;
  if (lead.status === 'QUOTED') score += 40;
  if (lead.status === 'WON') score += 100;

  return Math.min(score, 999); // Cap at 999
}

export function getQualificationLevel(score: number): string {
  if (score >= 80) return 'HOT';
  if (score >= 50) return 'WARM';
  if (score >= 20) return 'QUALIFIED';
  return 'COLD';
}

export async function updateLeadScore(leadId: string): Promise<void> {
  const score = await calculateLeadScore(leadId);
  const qualificationLevel = getQualificationLevel(score);

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      score,
      qualificationLevel,
      lastActivityAt: new Date()
    }
  });
}
