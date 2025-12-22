import { prisma } from '../db.js';

export async function createAuditLog(params: {
  tenantId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  changes?: any;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        changes: params.changes || null,
        metadata: params.metadata || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null
      }
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Failed to create audit log:', err instanceof Error ? err.message : err);
  }
}
