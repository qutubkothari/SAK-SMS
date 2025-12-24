import type { PrismaClient } from '@prisma/client';
import { prisma } from '../db.js';

export type SlaRuleCreateInput = {
  name: string;
  description?: string;
  triggerOn: 'NEW_LEAD' | 'MESSAGE_RECEIVED' | 'TRIAGE_ESCALATED' | 'LEAD_ASSIGNED';
  leadStatus?: string;
  leadHeat?: string;
  channel?: string;
  responseTimeMinutes: number;
  escalationTimeMinutes?: number;
  notifyRoles: string[];
  escalateToRole?: string;
  autoReassign?: boolean;
};

// Create SLA rule
export async function createSlaRule(
  tenantId: string,
  input: SlaRuleCreateInput
) {
  return prisma.slaRule.create({
    data: {
      tenantId,
      ...input
    }
  });
}

// Trigger SLA monitoring for a lead event
export async function triggerSlaMonitoring(params: {
  tenantId: string;
  leadId: string;
  event: 'NEW_LEAD' | 'MESSAGE_RECEIVED' | 'TRIAGE_ESCALATED' | 'LEAD_ASSIGNED';
  lead?: {
    status: string;
    heat: string;
    channel: string;
  };
}): Promise<void> {
  const { tenantId, leadId, event } = params;

  // Find applicable SLA rules
  const rules = await prisma.slaRule.findMany({
    where: {
      tenantId,
      isActive: true,
      triggerOn: event
    }
  });

  if (rules.length === 0) return;

  // Get lead details if not provided
  const lead = params.lead || await prisma.lead.findUnique({
    where: { id: leadId },
    select: { status: true, heat: true, channel: true }
  });

  if (!lead) return;

  // Filter rules by lead conditions
  const applicableRules = rules.filter(rule => {
    if (rule.leadStatus && rule.leadStatus !== lead.status) return false;
    if (rule.leadHeat && rule.leadHeat !== lead.heat) return false;
    if (rule.channel && rule.channel !== lead.channel) return false;
    return true;
  });

  const now = new Date();

  // Create SLA violations for each applicable rule
  for (const rule of applicableRules) {
    const dueAt = new Date(now.getTime() + rule.responseTimeMinutes * 60 * 1000);

    await prisma.slaViolation.create({
      data: {
        tenantId,
        slaRuleId: rule.id,
        leadId,
        triggeredAt: now,
        dueAt,
        status: 'PENDING'
      }
    });
  }
}

// Check and process SLA violations (run periodically)
export async function processSlaViolations(): Promise<void> {
  const now = new Date();

  // Find all pending violations that are past due
  const violations = await prisma.slaViolation.findMany({
    where: {
      status: 'PENDING',
      dueAt: {
        lte: now
      }
    },
    include: {
      slaRule: true,
      lead: {
        include: {
          assignee: {
            include: {
              user: true
            }
          }
        }
      }
    }
  });

  for (const violation of violations) {
    const breachMinutes = Math.floor((now.getTime() - violation.dueAt.getTime()) / (1000 * 60));

    // Mark as breached
    await prisma.slaViolation.update({
      where: { id: violation.id },
      data: {
        status: 'BREACHED',
        breachMinutes
      }
    });

    // Send notifications
    await notifySlaViolation(violation);

    // Handle escalation if configured
    if (violation.slaRule.escalationTimeMinutes) {
      const escalationDue = new Date(
        violation.dueAt.getTime() + violation.slaRule.escalationTimeMinutes * 60 * 1000
      );

      if (now >= escalationDue) {
        await escalateSlaViolation(violation);
      }
    }
  }
}

// Mark SLA as responded (when salesman replies)
export async function markSlaResponded(leadId: string): Promise<void> {
  await prisma.slaViolation.updateMany({
    where: {
      leadId,
      status: 'PENDING'
    },
    data: {
      status: 'RESPONDED',
      respondedAt: new Date()
    }
  });
}

// Mark SLA as resolved
export async function markSlaResolved(leadId: string): Promise<void> {
  await prisma.slaViolation.updateMany({
    where: {
      leadId,
      status: { in: ['PENDING', 'BREACHED', 'ESCALATED'] }
    },
    data: {
      status: 'RESOLVED',
      resolvedAt: new Date()
    }
  });
}

// Get SLA status for a lead
export async function getLeadSlaStatus(leadId: string) {
  const violations = await prisma.slaViolation.findMany({
    where: { leadId },
    include: {
      slaRule: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const active = violations.filter(v => v.status === 'PENDING' || v.status === 'BREACHED');
  const resolved = violations.filter(v => v.status === 'RESOLVED' || v.status === 'RESPONDED');

  return {
    total: violations.length,
    active: active.length,
    breached: violations.filter(v => v.status === 'BREACHED').length,
    resolved: resolved.length,
    violations
  };
}

// Notify about SLA violation
async function notifySlaViolation(violation: any): Promise<void> {
  const { prisma } = await import('../db.js');
  
  // Find users with target roles
  const users = await prisma.user.findMany({
    where: { 
      tenantId: violation.tenantId,
      active: true,
      role: { in: violation.slaRule.notifyRoles }
    },
    select: { id: true }
  });

  // Create notifications for each user
  await Promise.all(
    users.map(u =>
      prisma.notification.create({
        data: {
          tenantId: violation.tenantId,
          userId: u.id,
          type: 'SLA_VIOLATED',
          title: `SLA Violated: ${violation.slaRule.name}`,
          body: `Lead ${violation.lead.fullName || violation.lead.phone || violation.leadId} breached SLA by ${violation.breachMinutes} minutes`,
          entityType: 'Lead',
          entityId: violation.leadId
        }
      })
    )
  );

  await prisma.slaViolation.update({
    where: { id: violation.id },
    data: {
      notificationsSent: violation.notificationsSent + 1
    }
  });
}

// Escalate SLA violation
async function escalateSlaViolation(violation: any): Promise<void> {
  await prisma.slaViolation.update({
    where: { id: violation.id },
    data: {
      status: 'ESCALATED',
      escalatedAt: new Date()
    }
  });

  // Notify escalation target
  if (violation.slaRule.escalateToRole) {
    const users = await prisma.user.findMany({
      where: {
        tenantId: violation.tenantId,
        active: true,
        role: violation.slaRule.escalateToRole
      },
      select: { id: true }
    });

    await Promise.all(
      users.map(u =>
        prisma.notification.create({
          data: {
            tenantId: violation.tenantId,
            userId: u.id,
            type: 'SLA_ESCALATED',
            title: `SLA Escalated: ${violation.slaRule.name}`,
            body: `Lead ${violation.lead.fullName || violation.lead.phone || violation.leadId} requires immediate attention`,
            entityType: 'Lead',
            entityId: violation.leadId
          }
        })
      )
    );
  }

  // Auto-reassign if configured
  if (violation.slaRule.autoReassign) {
    // Find another available salesman
    const { pickSalesmanRoundRobin } = await import('./routing.js');
    const newSalesman = await pickSalesmanRoundRobin(prisma, violation.tenantId, violation.leadId);

    if (newSalesman) {
      await prisma.lead.update({
        where: { id: violation.leadId },
        data: { assignedToSalesmanId: newSalesman.id }
      });

      await prisma.leadEvent.create({
        data: {
          tenantId: violation.tenantId,
          leadId: violation.leadId,
          type: 'SLA_AUTO_REASSIGNED',
          payload: {
            fromSalesmanId: violation.lead.assignedToSalesmanId,
            toSalesmanId: newSalesman.id,
            slaRuleId: violation.slaRuleId
          }
        }
      });
    }
  }
}

// Get SLA analytics for dashboard
export async function getSlaAnalytics(tenantId: string, days: number = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [total, pending, breached, resolved, avgBreachTime] = await Promise.all([
    prisma.slaViolation.count({
      where: { tenantId, createdAt: { gte: since } }
    }),
    prisma.slaViolation.count({
      where: { tenantId, status: 'PENDING', createdAt: { gte: since } }
    }),
    prisma.slaViolation.count({
      where: { tenantId, status: 'BREACHED', createdAt: { gte: since } }
    }),
    prisma.slaViolation.count({
      where: { tenantId, status: { in: ['RESOLVED', 'RESPONDED'] }, createdAt: { gte: since } }
    }),
    prisma.slaViolation.aggregate({
      where: {
        tenantId,
        status: 'BREACHED',
        breachMinutes: { not: null },
        createdAt: { gte: since }
      },
      _avg: { breachMinutes: true }
    })
  ]);

  const complianceRate = total > 0 ? ((resolved / total) * 100).toFixed(1) : '100';
  const breachRate = total > 0 ? ((breached / total) * 100).toFixed(1) : '0';

  return {
    total,
    pending,
    breached,
    resolved,
    complianceRate: parseFloat(complianceRate),
    breachRate: parseFloat(breachRate),
    avgBreachTimeMinutes: avgBreachTime._avg.breachMinutes || 0
  };
}
