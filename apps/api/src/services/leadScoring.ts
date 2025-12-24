import { prisma } from '../db.js';
import type { LeadChannel, LeadHeat } from '@prisma/client';

// Predictive Lead Scoring with Historical Conversion Analysis
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

  // === PREDICTIVE FACTORS (Historical Conversion Analysis) ===
  
  // 1. Channel Conversion Probability (30 points max)
  const channelWeight = await getChannelConversionWeight(lead.tenantId, lead.channel);
  score += channelWeight * 30;

  // 2. Response Time Pattern (20 points max)
  const responseTimeScore = calculateResponseTimeScore(lead);
  score += responseTimeScore;

  // 3. Engagement Velocity (25 points max)
  const velocityScore = calculateEngagementVelocity(lead);
  score += velocityScore;

  // 4. Lead Source Quality (15 points max)
  const sourceQualityScore = await getSourceQualityScore(lead.tenantId, lead.channel, lead.heat);
  score += sourceQualityScore;

  // === ACTIVITY-BASED SCORING ===
  
  // Base score from lead completeness
  if (lead.fullName) score += 10;
  if (lead.phone) score += 10;
  if (lead.email) score += 10;

  // Activity-based scoring
  score += Math.min(lead.messages.length * 5, 50); // Cap at 50
  score += Math.min(lead.notes.length * 3, 30); // Cap at 30
  score += Math.min(lead.calls.length * 8, 60); // Cap at 60
  score += Math.min(lead.tasks.filter(t => t.status === 'COMPLETED').length * 5, 40); // Cap at 40
  
  // Success events add significant score
  score += Math.min(lead.successEvents.length * 20, 100); // Cap at 100

  // Call outcomes matter
  const answeredCalls = lead.calls.filter(c => c.outcome === 'ANSWERED').length;
  const missedCalls = lead.calls.filter(c => c.outcome === 'NO_ANSWER' || c.outcome === 'BUSY').length;
  score += answeredCalls * 10;
  score -= missedCalls * 3; // Penalty for unreachable leads

  // Recent activity boost
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentMessages = lead.messages.filter(m => new Date(m.createdAt) > oneWeekAgo).length;
  score += Math.min(recentMessages * 3, 20); // Cap at 20

  // === STATUS-BASED SCORING ===
  if (lead.status === 'CONTACTED') score += 20;
  if (lead.status === 'QUALIFIED') score += 40;
  if (lead.status === 'QUOTED') score += 60;
  if (lead.status === 'WON') score += 150;
  if (lead.status === 'LOST') score = Math.max(score - 50, 0); // Penalty for lost leads

  // === HEAT-BASED MULTIPLIER ===
  const heatMultiplier = getHeatMultiplier(lead.heat);
  score = Math.floor(score * heatMultiplier);

  return Math.max(0, Math.min(score, 999)); // Keep between 0-999
}

// Calculate channel conversion probability based on historical data
async function getChannelConversionWeight(tenantId: string, channel: LeadChannel): Promise<number> {
  const [totalLeads, wonLeads] = await Promise.all([
    prisma.lead.count({ where: { tenantId, channel } }),
    prisma.lead.count({ where: { tenantId, channel, status: 'WON' } })
  ]);

  if (totalLeads === 0) return 0.5; // Default neutral weight

  const conversionRate = wonLeads / totalLeads;
  
  // Normalize to 0-1 scale (assume 10% is average, 30% is excellent)
  if (conversionRate >= 0.30) return 1.0;
  if (conversionRate >= 0.20) return 0.8;
  if (conversionRate >= 0.10) return 0.6;
  if (conversionRate >= 0.05) return 0.4;
  return 0.2;
}

// Calculate response time score (faster responses = higher score)
function calculateResponseTimeScore(lead: any): number {
  const inboundMessages = lead.messages.filter((m: any) => m.direction === 'IN');
  const outboundMessages = lead.messages.filter((m: any) => m.direction === 'OUT');

  if (inboundMessages.length === 0 || outboundMessages.length === 0) return 0;

  let totalResponseTime = 0;
  let responseCount = 0;

  for (const inbound of inboundMessages) {
    const nextOutbound = outboundMessages.find((out: any) => 
      new Date(out.createdAt) > new Date(inbound.createdAt)
    );

    if (nextOutbound) {
      const responseTime = new Date(nextOutbound.createdAt).getTime() - new Date(inbound.createdAt).getTime();
      totalResponseTime += responseTime;
      responseCount++;
    }
  }

  if (responseCount === 0) return 0;

  const avgResponseTimeMinutes = (totalResponseTime / responseCount) / (1000 * 60);

  // Scoring based on avg response time
  if (avgResponseTimeMinutes <= 5) return 20; // Excellent (< 5 min)
  if (avgResponseTimeMinutes <= 15) return 15; // Good (< 15 min)
  if (avgResponseTimeMinutes <= 60) return 10; // Average (< 1 hour)
  if (avgResponseTimeMinutes <= 240) return 5; // Slow (< 4 hours)
  return 0; // Very slow
}

// Calculate engagement velocity (activity frequency trend)
function calculateEngagementVelocity(lead: any): number {
  const now = Date.now();
  const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = now - (14 * 24 * 60 * 60 * 1000);

  const recentActivity = [
    ...lead.messages,
    ...lead.notes,
    ...lead.calls,
    ...lead.events
  ].filter(item => new Date(item.createdAt).getTime() > oneWeekAgo).length;

  const previousActivity = [
    ...lead.messages,
    ...lead.notes,
    ...lead.calls,
    ...lead.events
  ].filter(item => {
    const time = new Date(item.createdAt).getTime();
    return time > twoWeeksAgo && time <= oneWeekAgo;
  }).length;

  // Velocity calculation
  if (recentActivity > previousActivity * 1.5) return 25; // Accelerating engagement
  if (recentActivity > previousActivity) return 15; // Growing engagement
  if (recentActivity === previousActivity && recentActivity > 0) return 10; // Stable engagement
  if (recentActivity < previousActivity) return 5; // Declining engagement
  return 0; // No engagement
}

// Get source quality score based on channel + heat combination
async function getSourceQualityScore(tenantId: string, channel: LeadChannel, heat: LeadHeat): Promise<number> {
  // Premium channels get higher base score
  const channelScore: Record<LeadChannel, number> = {
    'INDIAMART': 12,
    'WHATSAPP': 10,
    'FACEBOOK': 8,
    'INSTAGRAM': 8,
    'MANUAL': 15, // Direct leads often high quality
    'OTHER': 5
  };

  // Heat amplifies the channel score
  const heatMultiplier: Record<LeadHeat, number> = {
    'ON_FIRE': 1.5,
    'VERY_HOT': 1.3,
    'HOT': 1.1,
    'WARM': 1.0,
    'COLD': 0.7
  };

  return Math.floor(channelScore[channel] * heatMultiplier[heat]);
}

// Heat-based score multiplier
function getHeatMultiplier(heat: LeadHeat): number {
  const multipliers: Record<LeadHeat, number> = {
    'ON_FIRE': 1.3,
    'VERY_HOT': 1.2,
    'HOT': 1.1,
    'WARM': 1.0,
    'COLD': 0.9
  };
  return multipliers[heat] || 1.0;
}

export function getQualificationLevel(score: number): string {
  if (score >= 150) return 'HOT';
  if (score >= 80) return 'WARM';
  if (score >= 30) return 'QUALIFIED';
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

// Get predictive insights for a lead
export async function getLeadPredictiveInsights(leadId: string): Promise<{
  score: number
  qualificationLevel: string
  conversionProbability: number
  recommendedActions: string[]
  insights: string[]
}> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      messages: true,
      calls: true,
      successEvents: true
    }
  });

  if (!lead) {
    return {
      score: 0,
      qualificationLevel: 'COLD',
      conversionProbability: 0,
      recommendedActions: [],
      insights: []
    };
  }

  const score = await calculateLeadScore(leadId);
  const qualificationLevel = getQualificationLevel(score);
  
  // Calculate conversion probability (0-1)
  const channelWeight = await getChannelConversionWeight(lead.tenantId, lead.channel);
  const statusWeight = getStatusConversionWeight(lead.status);
  const activityWeight = lead.messages.length > 5 ? 0.8 : lead.messages.length > 2 ? 0.5 : 0.3;
  
  const conversionProbability = Math.min(
    (channelWeight * 0.3 + statusWeight * 0.5 + activityWeight * 0.2),
    0.95 // Cap at 95%
  );

  // Generate recommended actions
  const recommendedActions: string[] = [];
  const insights: string[] = [];

  // Recommendation logic
  if (lead.messages.length === 0) {
    recommendedActions.push('Send initial WhatsApp message');
    insights.push('No engagement yet - immediate contact recommended');
  } else if (lead.messages.filter(m => m.direction === 'OUT').length === 0) {
    recommendedActions.push('Respond to customer message');
    insights.push('Customer reached out but no response sent');
  }

  if (lead.calls.length === 0 && score > 50) {
    recommendedActions.push('Schedule a call');
    insights.push('High potential lead - phone call recommended');
  }

  if (lead.calls.filter(c => c.outcome === 'NO_ANSWER').length >= 2) {
    recommendedActions.push('Try WhatsApp or Email instead');
    insights.push('Multiple missed calls - try alternative channel');
  }

  const daysSinceCreated = (Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceCreated > 7 && lead.status === 'NEW') {
    recommendedActions.push('Mark as ON_HOLD or close');
    insights.push('Lead aging without progress - needs action');
  }

  if (lead.status === 'CONTACTED' && daysSinceCreated > 3) {
    recommendedActions.push('Move to QUALIFIED or send follow-up');
    insights.push('Lead contacted but not progressed');
  }

  if (score >= 100 && lead.status !== 'QUOTED' && lead.status !== 'WON') {
    recommendedActions.push('Send quotation');
    insights.push('High engagement - ready for quotation');
  }

  if (lead.successEvents.length > 0) {
    insights.push(`${lead.successEvents.length} success event(s) recorded`);
  }

  if (conversionProbability > 0.7) {
    insights.push('High conversion probability - priority lead');
  } else if (conversionProbability < 0.2) {
    insights.push('Low conversion probability - consider nurture campaign');
  }

  return {
    score,
    qualificationLevel,
    conversionProbability: Math.round(conversionProbability * 100) / 100,
    recommendedActions,
    insights
  };
}

function getStatusConversionWeight(status: string): number {
  const weights: Record<string, number> = {
    'NEW': 0.1,
    'CONTACTED': 0.3,
    'QUALIFIED': 0.5,
    'QUOTED': 0.7,
    'WON': 1.0,
    'LOST': 0.0,
    'ON_HOLD': 0.2
  };
  return weights[status] || 0.1;
}
