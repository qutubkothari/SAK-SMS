import { Router } from 'express';
import { z } from 'zod';
import { prisma } from './db.js';
import { asyncHandler } from './http.js';
import { HttpError } from './http.js';
import { clearAuthCookie, getAuthContext, getTenantId, hashPassword, setAuthCookie, signAuthToken, verifyPassword } from './auth.js';
import { createAiGatewayForTenant } from './ai/tenantAi.js';
import { pickSalesmanRoundRobin } from './services/routing.js';
import { recomputeSalesmanScores } from './services/scoring.js';

export const routes = Router();

// AI gateway is resolved per-tenant (DB-configurable) with env fallback.

async function createNotificationForUser(params: {
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  entityType?: string | null;
  entityId?: string | null;
}) {
  try {
    await prisma.notification.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body ?? null,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null
      }
    });
  } catch (err) {
    // If migrations aren't applied yet, keep the app usable.
    // eslint-disable-next-line no-console
    console.warn(
      'Failed to create notification (missing migration?):',
      err instanceof Error ? err.message : err
    );
  }
}

async function notifyTenantRoles(params: {
  tenantId: string;
  roles: Array<'OWNER' | 'ADMIN' | 'MANAGER' | 'SALESMAN'>;
  type: string;
  title: string;
  body?: string | null;
  entityType?: string | null;
  entityId?: string | null;
}) {
  const users: Array<{ id: string }> = await prisma.user.findMany({
    where: { tenantId: params.tenantId, active: true, role: { in: params.roles } },
    select: { id: true }
  });

  await Promise.all(
    users.map((u: { id: string }) =>
      createNotificationForUser({
        tenantId: params.tenantId,
        userId: u.id,
        type: params.type,
        title: params.title,
        body: params.body,
        entityType: params.entityType,
        entityId: params.entityId
      })
    )
  );
}

routes.get('/health', (_req, res) => res.json({ ok: true }));

// Notifications (per-user)
routes.get(
  '/notifications',
  asyncHandler(async (req, res) => {
    const { tenantId, userId } = getAuthContext(req);

    const unreadOnly = z
      .preprocess((v) => (v === undefined ? undefined : String(v)), z.enum(['1', '0']).optional())
      .parse((req.query as any)?.unreadOnly);

    const limit = z
      .preprocess((v) => (v === undefined ? undefined : Number(v)), z.number().int().min(1).max(100).default(20))
      .parse((req.query as any)?.limit);

    try {
      const notifications = await prisma.notification.findMany({
        where: {
          tenantId,
          userId,
          ...(unreadOnly === '1' ? { readAt: null } : {})
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      res.json({ notifications });
    } catch (err) {
      // If migrations aren't applied yet, keep the app usable.
      // eslint-disable-next-line no-console
      console.warn(
        'GET /notifications failed (missing migration?):',
        err instanceof Error ? err.message : err
      );
      res.json({ notifications: [], warning: 'Notifications table missing (run migrations)' });
    }
  })
);

routes.get(
  '/notifications/unread-count',
  asyncHandler(async (req, res) => {
    const { tenantId, userId } = getAuthContext(req);
    try {
      const count = await prisma.notification.count({ where: { tenantId, userId, readAt: null } });
      res.json({ count });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        'GET /notifications/unread-count failed (missing migration?):',
        err instanceof Error ? err.message : err
      );
      res.json({ count: 0, warning: 'Notifications table missing (run migrations)' });
    }
  })
);

routes.post(
  '/notifications/:id/read',
  asyncHandler(async (req, res) => {
    const { tenantId, userId } = getAuthContext(req);
    const notificationId = z.string().parse(req.params.id);

    try {
      await prisma.notification.updateMany({
        where: { id: notificationId, tenantId, userId, readAt: null },
        data: { readAt: new Date() }
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        'POST /notifications/:id/read failed (missing migration?):',
        err instanceof Error ? err.message : err
      );
    }

    res.json({ ok: true });
  })
);

routes.post(
  '/notifications/read-all',
  asyncHandler(async (req, res) => {
    const { tenantId, userId } = getAuthContext(req);
    try {
      await prisma.notification.updateMany({
        where: { tenantId, userId, readAt: null },
        data: { readAt: new Date() }
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        'POST /notifications/read-all failed (missing migration?):',
        err instanceof Error ? err.message : err
      );
    }
    res.json({ ok: true });
  })
);

// Auth
routes.post(
  '/auth/login',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        tenantId: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(1)
      })
      .parse(req.body);

    const user = await prisma.user.findFirst({
      where: {
        tenantId: body.tenantId,
        email: body.email.toLowerCase(),
        active: true
      }
    });
    if (!user) throw new HttpError(401, 'Invalid credentials');

    const ok = await verifyPassword(body.password, user.passwordHash);
    if (!ok) throw new HttpError(401, 'Invalid credentials');

    const token = signAuthToken({ tenantId: user.tenantId, userId: user.id, role: user.role as any });
    setAuthCookie(res, token);

    res.json({
      ok: true,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        role: user.role,
        email: user.email,
        displayName: user.displayName
      }
    });
  })
);

routes.get(
  '/auth/me',
  asyncHandler(async (req, res) => {
    const { tenantId, userId } = getAuthContext(req);
    const user = await prisma.user.findFirst({ where: { id: userId, tenantId, active: true } });
    if (!user) throw new HttpError(401, 'Unauthorized');
    res.json({
      ok: true,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        role: user.role,
        email: user.email,
        displayName: user.displayName
      }
    });
  })
);

routes.post(
  '/auth/logout',
  asyncHandler(async (_req, res) => {
    clearAuthCookie(res);
    res.json({ ok: true });
  })
);

// Tenant AI configuration (manager/admin only)
routes.get(
  '/ai/config',
  asyncHandler(async (req, res) => {
    const { tenantId, role } = getAuthContext(req);
    if (role === 'SALESMAN') throw new Error('Forbidden');

    const envConfig = {
      tenantId,
      provider: (process.env.AI_PROVIDER ?? 'MOCK'),
      openaiModel: process.env.OPENAI_MODEL ?? null,
      hasOpenaiApiKey: Boolean(process.env.OPENAI_API_KEY)
    };

    try {
      // If migrations haven't been applied, this may throw.
      const cfg = await prisma.tenantAiConfig.findUnique({ where: { tenantId } });
      if (!cfg) {
        res.json({ config: envConfig });
        return;
      }

      res.json({
        config: {
          tenantId,
          provider: cfg.provider,
          openaiModel: cfg.openaiModel ?? null,
          hasOpenaiApiKey: Boolean(cfg.openaiApiKey) || envConfig.hasOpenaiApiKey
        }
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('GET /ai/config failed; using env defaults:', err instanceof Error ? err.message : err);
      res.json({ config: envConfig, warning: 'AI config table missing (run migrations)' });
    }
  })
);

routes.patch(
  '/ai/config',
  asyncHandler(async (req, res) => {
    const { tenantId, role } = getAuthContext(req);
    if (role === 'SALESMAN') throw new Error('Forbidden');

    const body = z
      .object({
        provider: z.enum(['MOCK', 'OPENAI', 'GEMINI']).optional(),
        openaiApiKey: z.string().min(1).nullable().optional(),
        openaiModel: z.string().min(1).nullable().optional()
      })
      .parse(req.body);

    try {
      const updated = await prisma.tenantAiConfig.upsert({
        where: { tenantId },
        update: {
          ...(body.provider ? { provider: body.provider as any } : {}),
          ...(body.openaiApiKey !== undefined ? { openaiApiKey: body.openaiApiKey } : {}),
          ...(body.openaiModel !== undefined ? { openaiModel: body.openaiModel } : {})
        },
        create: {
          tenantId,
          provider: (body.provider ?? 'MOCK') as any,
          openaiApiKey: body.openaiApiKey ?? undefined,
          openaiModel: body.openaiModel ?? undefined
        }
      });

      res.json({ ok: true, config: { tenantId, provider: updated.provider, openaiModel: updated.openaiModel ?? null } });
    } catch (err) {
      // If migrations aren't applied yet, this will fail. Keep app usable.
      // eslint-disable-next-line no-console
      console.warn('Failed to persist tenant AI config (missing migration?):', err instanceof Error ? err.message : err);
      res.json({ ok: true, warning: 'AI config not persisted (run migrations)', config: { tenantId, ...body } });
    }
  })
);

// Bots (multi-bot per tenant for departments/products)
routes.get(
  '/bots',
  asyncHandler(async (req, res) => {
    const { tenantId, role } = getAuthContext(req);
    if (role === 'SALESMAN') throw new Error('Forbidden');

    const bots = await prisma.bot.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } });
    res.json({ bots });
  })
);

routes.post(
  '/bots',
  asyncHandler(async (req, res) => {
    const { tenantId, role } = getAuthContext(req);
    if (role === 'SALESMAN') throw new Error('Forbidden');

    const body = z
      .object({
        name: z.string().min(1),
        department: z.string().optional(),
        productTag: z.string().optional(),
        pricingMode: z.enum(['ROUTE', 'STANDARD']).default('ROUTE'),
        isActive: z.boolean().default(true)
      })
      .parse(req.body);

    const bot = await prisma.bot.create({
      data: {
        tenantId,
        name: body.name,
        department: body.department,
        productTag: body.productTag,
        pricingMode: body.pricingMode,
        isActive: body.isActive
      }
    });

    res.json({ bot });
  })
);

routes.patch(
  '/bots/:id',
  asyncHandler(async (req, res) => {
    const { tenantId, role } = getAuthContext(req);
    if (role === 'SALESMAN') throw new Error('Forbidden');

    const botId = z.string().parse(req.params.id);
    const body = z
      .object({
        name: z.string().min(1).optional(),
        department: z.string().nullable().optional(),
        productTag: z.string().nullable().optional(),
        pricingMode: z.enum(['ROUTE', 'STANDARD']).optional(),
        isActive: z.boolean().optional()
      })
      .parse(req.body);

    const updated = await prisma.bot.updateMany({ where: { id: botId, tenantId }, data: body });
    if (updated.count !== 1) throw new Error('Bot not found');
    res.json({ ok: true });
  })
);

// Dev bootstrap: create tenant + manager user.
routes.post(
  '/dev/bootstrap',
  asyncHandler(async (req, res) => {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_ROUTES !== 'true') {
      throw new HttpError(403, 'Forbidden');
    }

    const body = z
      .object({
        tenantName: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6),
        displayName: z.string().min(1)
      })
      .parse(req.body);

    const tenant = await prisma.tenant.create({ data: { name: body.tenantName } });
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: body.email.toLowerCase(),
        passwordHash: await hashPassword(body.password),
        role: 'MANAGER',
        displayName: body.displayName
      }
    });

    // Best-effort: create default AI config row.
    try {
      await prisma.tenantAiConfig.upsert({
        where: { tenantId: tenant.id },
        update: {},
        create: { tenantId: tenant.id, provider: 'MOCK' as any }
      });
    } catch {
      // ignore if migration not applied yet
    }

    // Create a few default success definitions to make the demo usable.
    await prisma.successDefinition.createMany({
      data: [
        { tenantId: tenant.id, name: 'Demo booked', type: 'DEMO_BOOKED', weight: 20, isActive: true },
        { tenantId: tenant.id, name: 'Order received', type: 'ORDER_RECEIVED', weight: 60, isActive: true },
        { tenantId: tenant.id, name: 'Contract signed', type: 'CONTRACT_SIGNED', weight: 100, isActive: true }
      ],
      skipDuplicates: true
    });

    res.json({ tenant, user });
  })
);

// Success definitions (tenant-configurable success criteria)
routes.get(
  '/success-definitions',
  asyncHandler(async (req, res) => {
    const { tenantId, role } = getAuthContext(req);
    if (role === 'SALESMAN') throw new Error('Forbidden');

    const defs = await prisma.successDefinition.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ definitions: defs });
  })
);

routes.post(
  '/success-definitions',
  asyncHandler(async (req, res) => {
    const { tenantId, role } = getAuthContext(req);
    if (role === 'SALESMAN') throw new Error('Forbidden');

    const body = z
      .object({
        name: z.string().min(1),
        type: z.enum(['DEMO_BOOKED', 'PAYMENT_RECEIVED', 'ORDER_RECEIVED', 'CONTRACT_SIGNED', 'CUSTOM']),
        weight: z.number().min(0).max(1000).default(10),
        isActive: z.boolean().default(true)
      })
      .parse(req.body);

    const definition = await prisma.successDefinition.create({
      data: {
        tenantId,
        name: body.name,
        type: body.type,
        weight: body.weight,
        isActive: body.isActive
      }
    });

    res.json({ definition });
  })
);

routes.patch(
  '/success-definitions/:id',
  asyncHandler(async (req, res) => {
    const { tenantId, role } = getAuthContext(req);
    if (role === 'SALESMAN') throw new Error('Forbidden');

    const defId = z.string().parse(req.params.id);
    const body = z
      .object({
        name: z.string().min(1).optional(),
        weight: z.number().min(0).max(1000).optional(),
        isActive: z.boolean().optional()
      })
      .parse(req.body);

    const updated = await prisma.successDefinition.updateMany({ where: { id: defId, tenantId }, data: body });
    if (updated.count !== 1) throw new Error('Success definition not found');
    res.json({ ok: true });
  })
);

// Record a success event against a lead; scoring is updated automatically.
routes.post(
  '/leads/:id/success',
  asyncHandler(async (req, res) => {
    const { tenantId, role } = getAuthContext(req);
    if (role === 'SALESMAN') throw new Error('Forbidden');

    const leadId = z.string().parse(req.params.id);
    const body = z.object({ definitionId: z.string(), note: z.string().optional() }).parse(req.body);

    const lead = await prisma.lead.findFirst({ where: { id: leadId, tenantId } });
    if (!lead) throw new Error('Lead not found');

    const def = await prisma.successDefinition.findFirst({ where: { id: body.definitionId, tenantId, isActive: true } });
    if (!def) throw new Error('Success definition not found');

    const ev = await prisma.successEvent.create({
      data: {
        tenantId,
        leadId: lead.id,
        salesmanId: lead.assignedToSalesmanId,
        definitionId: def.id,
        type: def.type,
        weight: def.weight,
        note: body.note
      }
    });

    await prisma.leadEvent.create({
      data: {
        tenantId,
        leadId: lead.id,
        type: 'SUCCESS_RECORDED',
        payload: { successEventId: ev.id, definitionId: def.id, type: def.type, weight: def.weight }
      }
    });

    // If the lead was in triage, auto-close any OPEN triage items.
    const closed = await prisma.triageQueueItem.updateMany({
      where: { tenantId, leadId: lead.id, status: 'OPEN' },
      data: { status: 'CLOSED' }
    });

    if (closed.count > 0) {
      await prisma.leadEvent.create({
        data: {
          tenantId,
          leadId: lead.id,
          type: 'TRIAGE_AUTO_CLOSED',
          payload: { successEventId: ev.id, closedCount: closed.count }
        }
      });
    }

    const updates = await recomputeSalesmanScores(prisma, tenantId);
    res.json({ ok: true, successEvent: ev, scoreUpdates: updates });
  })
);

routes.post(
  '/success/recompute',
  asyncHandler(async (req, res) => {
    const { tenantId, role } = getAuthContext(req);
    if (role === 'SALESMAN') throw new Error('Forbidden');

    const updates = await recomputeSalesmanScores(prisma, tenantId);
    res.json({ ok: true, updates });
  })
);

// Dashboard stats (overview metrics)
routes.get(
  '/analytics/dashboard',
  asyncHandler(async (req, res) => {
    const { tenantId } = getAuthContext(req);

    const [totalLeads, newLeads, activeLeads, convertedLeads, totalTriageOpen, totalSalesmen, recentSuccessEvents] = await Promise.all([
      prisma.lead.count({ where: { tenantId } }),
      prisma.lead.count({ where: { tenantId, status: 'NEW' } }),
      prisma.lead.count({ where: { tenantId, status: { in: ['CONTACTED', 'QUALIFIED', 'QUOTED'] } } }),
      prisma.lead.count({ where: { tenantId, status: 'WON' } }),
      prisma.triageQueueItem.count({ where: { tenantId, status: 'OPEN' } }),
      prisma.salesman.count({ where: { tenantId } }),
      prisma.successEvent.findMany({
        where: { tenantId, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          definition: true,
          lead: { select: { fullName: true, phone: true } }
        }
      })
    ]);

    const leadsByStatus = await prisma.lead.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { _all: true }
    });

    const leadsByHeat = await prisma.lead.groupBy({
      by: ['heat'],
      where: { tenantId },
      _count: { _all: true }
    });

    const leadsByChannel = await prisma.lead.groupBy({
      by: ['channel'],
      where: { tenantId },
      _count: { _all: true }
    });

    res.json({
      ok: true,
      totalLeads,
      newLeads,
      activeLeads,
      convertedLeads,
      totalTriageOpen,
      totalSalesmen,
      leadsByStatus: leadsByStatus.map((x) => ({ status: x.status, count: x._count._all })),
      leadsByHeat: leadsByHeat.map((x) => ({ heat: x.heat, count: x._count._all })),
      leadsByChannel: leadsByChannel.map((x) => ({ channel: x.channel, count: x._count._all })),
      recentSuccessEvents
    });
  })
);

// Success analytics (simple aggregates for dashboards)
routes.get(
  '/analytics/success',
  asyncHandler(async (req, res) => {
    const { tenantId, role } = getAuthContext(req);
    if (role === 'SALESMAN') throw new Error('Forbidden');

    const days = z
      .preprocess((v) => (v === undefined ? undefined : Number(v)), z.number().int().min(1).max(365).default(30))
      .parse((req.query as any)?.days);

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [eventsByType, leadStatusCounts, leadHeatCounts, salesmanAgg] = await Promise.all([
      prisma.successEvent.groupBy({
        by: ['type'],
        where: { tenantId, createdAt: { gte: since } },
        _count: { _all: true },
        _sum: { weight: true }
      }),
      prisma.lead.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { _all: true }
      }),
      prisma.lead.groupBy({
        by: ['heat'],
        where: { tenantId },
        _count: { _all: true }
      }),
      prisma.successEvent.groupBy({
        by: ['salesmanId'],
        where: { tenantId, createdAt: { gte: since } },
        _count: { _all: true },
        _sum: { weight: true }
      })
    ]);

    const salesmanIds = salesmanAgg.map((x) => x.salesmanId).filter((id): id is string => Boolean(id));
    const salesmen = salesmanIds.length
      ? await prisma.salesman.findMany({
          where: { tenantId, id: { in: salesmanIds } },
          include: { user: true }
        })
      : [];

    const salesmanById = new Map(salesmen.map((s) => [s.id, s] as const));

    const leaderboard = salesmanAgg
      .filter((x) => Boolean(x.salesmanId))
      .map((x) => {
        const salesman = salesmanById.get(x.salesmanId as string);
        return {
          salesmanId: x.salesmanId as string,
          displayName: salesman?.user.displayName ?? x.salesmanId,
          email: salesman?.user.email ?? null,
          events: x._count._all,
          weight: x._sum.weight ?? 0
        };
      })
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 10);

    res.json({
      ok: true,
      days,
      since: since.toISOString(),
      eventsByType: eventsByType.map((x) => ({ type: x.type, count: x._count._all, weight: x._sum.weight ?? 0 })),
      leadStatusCounts: leadStatusCounts.map((x) => ({ status: x.status, count: x._count._all })),
      leadHeatCounts: leadHeatCounts.map((x) => ({ heat: x.heat, count: x._count._all })),
      leaderboard
    });
  })
);

// Dev seed: create 5 salesman users + profiles and a few leads.
routes.post(
  '/dev/seed',
  asyncHandler(async (req, res) => {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_ROUTES !== 'true') {
      throw new HttpError(403, 'Forbidden');
    }

    const body = z
      .object({
        tenantId: z.string().min(1),
        salesmanCount: z.number().int().min(1).max(20).default(5)
      })
      .parse(req.body);

    const tenant = await prisma.tenant.findFirst({ where: { id: body.tenantId } });
    if (!tenant) throw new Error('Tenant not found');

    const createdSalesmen: Array<{ userId: string; salesmanId: string; email: string }> = [];
    for (let i = 1; i <= body.salesmanCount; i++) {
      const email = `salesman${i}@${tenant.id}.local`;
      const user = await prisma.user.upsert({
        where: { tenantId_email: { tenantId: tenant.id, email } },
        update: { role: 'SALESMAN', active: true, displayName: `Salesman ${i}` },
        create: {
          tenantId: tenant.id,
          email,
          passwordHash: await hashPassword('password123'),
          role: 'SALESMAN',
          displayName: `Salesman ${i}`
        }
      });

      const salesman = await prisma.salesman.upsert({
        where: { userId: user.id },
        update: { isActive: true },
        create: { tenantId: tenant.id, userId: user.id }
      });

      createdSalesmen.push({ userId: user.id, salesmanId: salesman.id, email: user.email });
    }

    // Create sample leads and triage items.
    const leads = await Promise.all(
      [
        { fullName: 'Ahmed', phone: '+971500000001', language: 'ar', channel: 'WHATSAPP' as const },
        { fullName: 'Sara', phone: '+971500000002', language: 'en', channel: 'FACEBOOK' as const },
        { fullName: 'Imran', phone: '+971500000003', language: 'en', channel: 'INDIAMART' as const }
      ].map((l) =>
        prisma.lead.create({
          data: {
            tenantId: tenant.id,
            channel: l.channel,
            fullName: l.fullName,
            phone: l.phone,
            language: l.language
          }
        })
      )
    );

    await prisma.triageQueueItem.createMany({
      data: leads.map((lead) => ({
        tenantId: tenant.id,
        leadId: lead.id,
        reason: 'AUTO_ESCALATED'
      }))
    });

    res.json({ ok: true, salesmen: createdSalesmen, leads });
  })
);

// Leads
routes.get(
  '/leads',
  asyncHandler(async (req, res) => {
    const { tenantId, role, userId } = getAuthContext(req);

    const salesman =
      role === 'SALESMAN'
        ? await prisma.salesman.findFirst({ where: { tenantId, userId } })
        : null;

    if (role === 'SALESMAN' && !salesman) throw new Error('Salesman profile not found');

    const where = {
      tenantId,
      ...(role === 'SALESMAN' && salesman ? { assignedToSalesmanId: salesman.id } : {})
    } as const;

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 200
    });

    res.json({ leads });
  })
);

routes.get(
  '/leads/export/csv',
  asyncHandler(async (req, res) => {
    const { tenantId, role, userId } = getAuthContext(req);

    const salesman =
      role === 'SALESMAN'
        ? await prisma.salesman.findFirst({ where: { tenantId, userId } })
        : null;

    if (role === 'SALESMAN' && !salesman) throw new Error('Salesman profile not found');

    const where = {
      tenantId,
      ...(role === 'SALESMAN' && salesman ? { assignedToSalesmanId: salesman.id } : {})
    } as const;

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 1000
    });

    // Build CSV
    const headers = ['ID', 'Full Name', 'Phone', 'Email', 'Channel', 'Status', 'Heat', 'Language', 'Assigned To', 'Created At', 'Updated At'];
    const rows = leads.map((l) => [
      l.id,
      l.fullName ?? '',
      l.phone ?? '',
      l.email ?? '',
      l.channel,
      l.status,
      l.heat,
      l.language,
      l.assignedToSalesmanId ?? '',
      l.createdAt.toISOString(),
      l.updatedAt.toISOString()
    ]);

    const csvLines = [headers, ...rows].map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    );
    const csv = csvLines.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="leads-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  })
);

routes.get(
  '/leads/:id',
  asyncHandler(async (req, res) => {
    const { tenantId, role, userId } = getAuthContext(req);
    const leadId = z.string().parse(req.params.id);

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, tenantId },
      include: { messages: true, events: true, triageItems: true, successEvents: true }
    });
    if (!lead) throw new Error('Lead not found');

    if (role === 'SALESMAN') {
      const salesman = await prisma.salesman.findFirst({ where: { tenantId, userId } });
      if (!salesman || lead.assignedToSalesmanId !== salesman.id) throw new Error('Forbidden');
    }

    res.json({ lead });
  })
);

routes.post(
  '/leads',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const body = z
      .object({
        channel: z.enum(['MANUAL', 'WHATSAPP', 'FACEBOOK', 'INSTAGRAM', 'INDIAMART', 'OTHER']),
        externalId: z.string().optional(),
        fullName: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        language: z.string().optional()
      })
      .parse(req.body);

    const lead = await prisma.lead.create({
      data: {
        tenantId,
        channel: body.channel,
        externalId: body.externalId,
        fullName: body.fullName,
        phone: body.phone,
        email: body.email,
        language: body.language ?? 'en'
      }
    });

    res.json({ lead });
  })
);

routes.post(
  '/leads/:id/status',
  asyncHandler(async (req, res) => {
    const { tenantId } = getAuthContext(req);
    const leadId = z.string().parse(req.params.id);
    const body = z
      .object({ status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'QUOTED', 'WON', 'LOST', 'ON_HOLD']) })
      .parse(req.body);

    const updated = await prisma.lead.updateMany({
      where: { id: leadId, tenantId },
      data: { status: body.status }
    });
    if (updated.count !== 1) throw new Error('Lead not found');

    await prisma.leadEvent.create({
      data: {
        tenantId,
        leadId,
        type: 'STATUS_CHANGED',
        payload: { status: body.status }
      }
    });

    res.json({ ok: true });
  })
);

// Salesmen (manager/admin only)
routes.get(
  '/salesmen',
  asyncHandler(async (req, res) => {
    const { tenantId, role } = getAuthContext(req);
    if (role === 'SALESMAN') throw new Error('Forbidden');

    const salesmen = await prisma.salesman.findMany({
      where: { tenantId },
      include: { user: true },
      orderBy: { createdAt: 'asc' }
    });

    const loadRows = await prisma.lead.groupBy({
      by: ['assignedToSalesmanId'],
      where: {
        tenantId,
        assignedToSalesmanId: { not: null },
        status: { notIn: ['WON', 'LOST'] }
      },
      _count: { _all: true }
    });

    const loadBySalesmanId = new Map<string, number>();
    for (const row of loadRows) {
      if (!row.assignedToSalesmanId) continue;
      loadBySalesmanId.set(row.assignedToSalesmanId, row._count._all);
    }

    res.json({
      salesmen: salesmen.map((s: (typeof salesmen)[number]) => ({
        id: s.id,
        displayName: s.user.displayName,
        email: s.user.email,
        isActive: s.isActive,
        score: s.score,
        capacity: s.capacity,
        activeLeadCount: loadBySalesmanId.get(s.id) ?? 0
      }))
    });
  })
);

routes.patch(
  '/salesmen/:id',
  asyncHandler(async (req, res) => {
    const { tenantId, role } = getAuthContext(req);
    if (role === 'SALESMAN') throw new Error('Forbidden');

    const salesmanId = z.string().parse(req.params.id);
    const body = z
      .object({
        score: z.number().min(0).max(100).optional(),
        capacity: z.number().int().min(0).max(200).optional(),
        isActive: z.boolean().optional()
      })
      .parse(req.body);

    const updated = await prisma.salesman.updateMany({ where: { id: salesmanId, tenantId }, data: body });
    if (updated.count !== 1) throw new Error('Salesman not found');
    res.json({ ok: true });
  })
);

// Triage queue
routes.get(
  '/triage',
  asyncHandler(async (req, res) => {
    const { tenantId, role } = getAuthContext(req);
    if (role === 'SALESMAN') throw new Error('Forbidden');

    const statusParam = z
      .enum(['OPEN', 'ASSIGNED', 'CLOSED', 'ALL'])
      .optional()
      .parse((req.query as any)?.status);

    const items = await prisma.triageQueueItem.findMany({
      where: {
        tenantId,
        ...(statusParam && statusParam !== 'ALL' ? { status: statusParam } : {})
      },
      include: { lead: true },
      orderBy: { createdAt: 'asc' },
      take: 200
    });

    res.json({ items });
  })
);

routes.post(
  '/triage/:id/close',
  asyncHandler(async (req, res) => {
    const { tenantId, role, userId } = getAuthContext(req);
    if (role === 'SALESMAN') throw new Error('Forbidden');

    const triageId = z.string().parse(req.params.id);
    const body = z.object({ note: z.string().max(500).optional() }).parse(req.body ?? {});

    const item = await prisma.triageQueueItem.findFirst({ where: { id: triageId, tenantId } });
    if (!item) throw new Error('Triage item not found');

    await prisma.triageQueueItem.update({
      where: { id: item.id },
      data: { status: 'CLOSED' }
    });

    await prisma.leadEvent.create({
      data: {
        tenantId,
        leadId: item.leadId,
        type: 'TRIAGE_CLOSED',
        payload: { triageId: item.id, byRole: role, byUserId: userId, note: body.note ?? null }
      }
    });

    res.json({ ok: true });
  })
);

routes.post(
  '/triage/:id/reopen',
  asyncHandler(async (req, res) => {
    const { tenantId, role, userId } = getAuthContext(req);
    if (role === 'SALESMAN') throw new Error('Forbidden');

    const triageId = z.string().parse(req.params.id);
    const item = await prisma.triageQueueItem.findFirst({ where: { id: triageId, tenantId } });
    if (!item) throw new Error('Triage item not found');

    await prisma.triageQueueItem.update({
      where: { id: item.id },
      data: { status: 'OPEN', suggestedSalesmanId: null }
    });

    await prisma.leadEvent.create({
      data: {
        tenantId,
        leadId: item.leadId,
        type: 'TRIAGE_REOPENED',
        payload: { triageId: item.id, byRole: role, byUserId: userId }
      }
    });

    res.json({ ok: true });
  })
);

routes.post(
  '/triage/:id/assign',
  asyncHandler(async (req, res) => {
    const { tenantId, role } = getAuthContext(req);
    if (role === 'SALESMAN') throw new Error('Forbidden');

    const triageId = z.string().parse(req.params.id);
    const body = z.object({ salesmanId: z.string() }).parse(req.body);

    const item = await prisma.triageQueueItem.findFirst({ where: { id: triageId, tenantId } });
    if (!item) throw new Error('Triage item not found');

    const salesman = await prisma.salesman.findFirst({ where: { id: body.salesmanId, tenantId } });
    if (!salesman) throw new Error('Salesman not found');

    await prisma.lead.update({
      where: { id: item.leadId, tenantId },
      data: { assignedToSalesmanId: salesman.id }
    });

    await prisma.triageQueueItem.update({
      where: { id: item.id },
      data: { status: 'ASSIGNED', suggestedSalesmanId: salesman.id }
    });

    await prisma.leadEvent.create({
      data: {
        tenantId,
        leadId: item.leadId,
        type: 'TRIAGE_ASSIGNED',
        payload: { triageId: item.id, assignedToSalesmanId: salesman.id, byRole: role }
      }
    });

    await createNotificationForUser({
      tenantId,
      userId: salesman.userId,
      type: 'LEAD_ASSIGNED',
      title: 'New lead assigned',
      body: `Lead ${item.leadId} assigned to you`,
      entityType: 'Lead',
      entityId: item.leadId
    });

    res.json({ ok: true });
  })
);

// Bulk operations
routes.post(
  '/leads/bulk/assign',
  asyncHandler(async (req, res) => {
    const { tenantId, role } = getAuthContext(req);
    if (role === 'SALESMAN') throw new Error('Forbidden');

    const body = z.object({ 
      leadIds: z.array(z.string()).min(1), 
      salesmanId: z.string().nullable() 
    }).parse(req.body);

    if (body.salesmanId) {
      const salesman = await prisma.salesman.findFirst({ where: { id: body.salesmanId, tenantId } });
      if (!salesman) throw new Error('Salesman not found');

      for (const leadId of body.leadIds) {
        await createNotificationForUser({
          tenantId,
          userId: salesman.userId,
          type: 'LEAD_ASSIGNED',
          title: 'New lead assigned',
          body: `Lead ${leadId} assigned to you`,
          entityType: 'Lead',
          entityId: leadId
        });
      }
    }

    const updated = await prisma.lead.updateMany({
      where: { id: { in: body.leadIds }, tenantId },
      data: { assignedToSalesmanId: body.salesmanId }
    });

    for (const leadId of body.leadIds) {
      await prisma.leadEvent.create({
        data: {
          tenantId,
          leadId,
          type: 'BULK_ASSIGNED',
          payload: { assignedToSalesmanId: body.salesmanId, byRole: role, count: body.leadIds.length }
        }
      });
    }

    res.json({ ok: true, count: updated.count });
  })
);

routes.post(
  '/leads/bulk/status',
  asyncHandler(async (req, res) => {
    const { tenantId, role } = getAuthContext(req);
    if (role === 'SALESMAN') throw new Error('Forbidden');

    const body = z.object({ 
      leadIds: z.array(z.string()).min(1), 
      status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'QUOTED', 'WON', 'LOST', 'ON_HOLD'])
    }).parse(req.body);

    const updated = await prisma.lead.updateMany({
      where: { id: { in: body.leadIds }, tenantId },
      data: { status: body.status }
    });

    for (const leadId of body.leadIds) {
      await prisma.leadEvent.create({
        data: {
          tenantId,
          leadId,
          type: 'BULK_STATUS_UPDATE',
          payload: { status: body.status, byRole: role, count: body.leadIds.length }
        }
      });
    }

    res.json({ ok: true, count: updated.count });
  })
);

// Manager manual assignment
routes.post(
  '/leads/:id/assign',
  asyncHandler(async (req, res) => {
    const { tenantId, role } = getAuthContext(req);
    if (role === 'SALESMAN') throw new Error('Forbidden');

    const leadId = z.string().parse(req.params.id);
    const body = z.object({ salesmanId: z.string().nullable() }).parse(req.body);

    const lead = await prisma.lead.findFirst({ where: { id: leadId, tenantId } });
    if (!lead) throw new Error('Lead not found');

    if (body.salesmanId) {
      const salesman = await prisma.salesman.findFirst({ where: { id: body.salesmanId, tenantId } });
      if (!salesman) throw new Error('Salesman not found');

      await createNotificationForUser({
        tenantId,
        userId: salesman.userId,
        type: 'LEAD_ASSIGNED',
        title: 'New lead assigned',
        body: `Lead ${lead.id} assigned to you`,
        entityType: 'Lead',
        entityId: lead.id
      });
    }

    await prisma.lead.update({
      where: { id: leadId },
      data: { assignedToSalesmanId: body.salesmanId }
    });

    await prisma.leadEvent.create({
      data: {
        tenantId,
        leadId,
        type: 'ASSIGNED',
        payload: { assignedToSalesmanId: body.salesmanId, byRole: role }
      }
    });

    res.json({ ok: true });
  })
);

// AI stubs (MOCK) – will be used by WhatsApp ingestion pipeline later.
routes.post(
  '/ai/triage',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const body = z
      .object({
        leadId: z.string(),
        channel: z.enum(['MANUAL', 'WHATSAPP', 'FACEBOOK', 'INSTAGRAM', 'INDIAMART', 'OTHER']),
        customerMessage: z.string().min(1)
      })
      .parse(req.body);

    const lead = await prisma.lead.findFirst({ where: { id: body.leadId, tenantId } });
    if (!lead) throw new Error('Lead not found');

    const ai = await createAiGatewayForTenant(prisma, tenantId);

    const triage = await ai.triage({
      leadId: lead.id,
      channel: lead.channel,
      customerMessage: body.customerMessage
    });

    await prisma.lead.update({
      where: { id: lead.id },
      data: { language: triage.language, heat: triage.heat }
    });

    await prisma.leadEvent.create({
      data: {
        tenantId,
        leadId: lead.id,
        type: 'AI_TRIAGE',
        payload: triage
      }
    });

    res.json({ triage });
  })
);

routes.post(
  '/ai/draft-reply',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const body = z
      .object({
        leadId: z.string(),
        channel: z.enum(['MANUAL', 'WHATSAPP', 'FACEBOOK', 'INSTAGRAM', 'INDIAMART', 'OTHER']),
        customerMessage: z.string().min(1),
        pricingAllowed: z.boolean().default(false)
      })
      .parse(req.body);

    const lead = await prisma.lead.findFirst({ where: { id: body.leadId, tenantId } });
    if (!lead) throw new Error('Lead not found');

    const ai = await createAiGatewayForTenant(prisma, tenantId);

    const draft = await ai.draftReply({
      leadId: lead.id,
      channel: lead.channel,
      customerMessage: body.customerMessage,
      pricingAllowed: body.pricingAllowed
    });

    // Persist outbound draft as event (not as Message yet).
    await prisma.leadEvent.create({
      data: {
        tenantId,
        leadId: lead.id,
        type: 'AI_DRAFT_REPLY',
        payload: draft
      }
    });

    // If escalation is requested, push to triage.
    if (draft.shouldEscalate) {
      const existing = await prisma.triageQueueItem.findFirst({
        where: { tenantId, leadId: lead.id, status: 'OPEN' }
      });

      if (!existing) {
        await prisma.triageQueueItem.create({
          data: {
            tenantId,
            leadId: lead.id,
            reason: draft.escalationReason ?? 'AI_ESCALATION'
          }
        });

        await notifyTenantRoles({
          tenantId,
          roles: ['OWNER', 'ADMIN', 'MANAGER'],
          type: 'TRIAGE_ESCALATED',
          title: 'Triage escalation',
          body: `${draft.escalationReason ?? 'AI_ESCALATION'} (lead ${lead.fullName ?? lead.phone ?? lead.id})`,
          entityType: 'Lead',
          entityId: lead.id
        });
      }
    }

    res.json({ draft });
  })
);

const ingestMessageBodySchema = z.object({
  botId: z.string().optional(),
  channel: z.enum(['MANUAL', 'WHATSAPP', 'FACEBOOK', 'INSTAGRAM', 'INDIAMART', 'OTHER']),
  externalId: z.string().optional(),
  fullName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  customerMessage: z.string().min(1).optional(),
  text: z.string().min(1).optional()
});

const ingestMessageSchema = ingestMessageBodySchema.refine((v) => Boolean(v.customerMessage ?? v.text), {
  path: ['customerMessage'],
  message: 'Required'
});

async function handleIngestMessage(params: {
  tenantId: string;
  body: z.infer<typeof ingestMessageSchema>;
}) {
  const { tenantId, body } = params;

  const customerMessage = body.customerMessage ?? body.text;
  if (!customerMessage) throw new Error('customerMessage is required');

  const bot = body.botId
    ? await prisma.bot.findFirst({ where: { id: body.botId, tenantId, isActive: true } })
    : null;

  // Try to find an existing lead (by channel+externalId, else phone/email).
  const lead = await (async () => {
    if (body.externalId) {
      const found = await prisma.lead.findFirst({
        where: { tenantId, channel: body.channel, externalId: body.externalId }
      });
      if (found) return found;
    }

    if (body.phone) {
      const found = await prisma.lead.findFirst({ where: { tenantId, phone: body.phone } });
      if (found) return found;
    }

    if (body.email) {
      const found = await prisma.lead.findFirst({ where: { tenantId, email: body.email } });
      if (found) return found;
    }

    return prisma.lead.create({
      data: {
        tenantId,
        channel: body.channel,
        externalId: body.externalId,
        fullName: body.fullName,
        phone: body.phone,
        email: body.email,
        language: 'en'
      }
    });
  })();

  await prisma.message.create({
    data: {
      tenantId,
      leadId: lead.id,
      direction: 'IN',
      channel: body.channel,
      body: customerMessage,
      raw: { botId: bot?.id ?? null }
    }
  });

  const ai = await createAiGatewayForTenant(prisma, tenantId);

  // AI triage updates language + heat.
  const triage = await ai.triage({
    leadId: lead.id,
    channel: lead.channel,
    customerMessage
  });

  await prisma.lead.update({
    where: { id: lead.id },
    data: { language: triage.language, heat: triage.heat }
  });

  await prisma.leadEvent.create({
    data: {
      tenantId,
      leadId: lead.id,
      type: 'AI_TRIAGE',
      payload: triage
    }
  });

  const pricingAllowed = bot?.pricingMode === 'STANDARD';
  const draft = await ai.draftReply({
    leadId: lead.id,
    channel: lead.channel,
    customerMessage,
    pricingAllowed
  });

  await prisma.leadEvent.create({
    data: {
      tenantId,
      leadId: lead.id,
      type: 'AI_DRAFT_REPLY',
      payload: { ...draft, botId: bot?.id ?? null }
    }
  });

  if (draft.shouldEscalate) {
    const existing = await prisma.triageQueueItem.findFirst({
      where: { tenantId, leadId: lead.id, status: 'OPEN' }
    });

    if (!existing) {
      await prisma.triageQueueItem.create({
        data: {
          tenantId,
          leadId: lead.id,
          reason: draft.escalationReason ?? 'AI_ESCALATION',
          suggestedSalesmanId: null
        }
      });

      await notifyTenantRoles({
        tenantId,
        roles: ['OWNER', 'ADMIN', 'MANAGER'],
        type: 'TRIAGE_ESCALATED',
        title: 'Triage escalation',
        body: `${draft.escalationReason ?? 'AI_ESCALATION'} (lead ${lead.fullName ?? lead.phone ?? lead.id})`,
        entityType: 'Lead',
        entityId: lead.id
      });
    }
  } else {
    // Auto-assign if unassigned.
    const current = await prisma.lead.findFirst({
      where: { id: lead.id, tenantId },
      select: { assignedToSalesmanId: true }
    });

    if (!current?.assignedToSalesmanId) {
      const picked = await pickSalesmanRoundRobin(prisma, tenantId, lead.id);
      if (picked) {
        await prisma.lead.update({ where: { id: lead.id }, data: { assignedToSalesmanId: picked.id } });
        await prisma.leadEvent.create({
          data: {
            tenantId,
            leadId: lead.id,
            type: 'AUTO_ASSIGNED',
            payload: { salesmanId: picked.id, mode: 'WEIGHTED' }
          }
        });

        await createNotificationForUser({
          tenantId,
          userId: picked.userId,
          type: 'LEAD_ASSIGNED',
          title: 'New lead assigned',
          body: `${lead.fullName ?? lead.phone ?? lead.id}`,
          entityType: 'Lead',
          entityId: lead.id
        });
      }
    }

    // Persist the assistant reply as an OUT message (simulation).
    await prisma.message.create({
      data: {
        tenantId,
        leadId: lead.id,
        direction: 'OUT',
        channel: body.channel,
        body: draft.message,
        raw: { botId: bot?.id ?? null, simulated: true }
      }
    });
  }

  return { ok: true, leadId: lead.id, triage, draft } as const;
}

// External webhook ingestion (no cookie/dev headers) secured by WEBHOOK_SECRET.
routes.post(
  '/webhooks/ingest/message',
  asyncHandler(async (req, res) => {
    const expected = process.env.WEBHOOK_SECRET;
    const provided = req.header('x-webhook-secret') ?? '';
    const requireSecret = process.env.NODE_ENV === 'production';

    if ((requireSecret || expected) && (!expected || provided !== expected)) {
      throw new HttpError(401, 'Unauthorized');
    }

    const webhookSchema = z
      .object({ tenantId: z.string().min(1) })
      .merge(ingestMessageBodySchema)
      .refine((v) => Boolean(v.customerMessage ?? v.text), {
        path: ['customerMessage'],
        message: 'Required'
      });

    const body = webhookSchema.parse(req.body);
    const { tenantId, ...rest } = body;

    const ingestBody = ingestMessageSchema.parse(rest);
    const out = await handleIngestMessage({ tenantId, body: ingestBody });
    res.json(out);
  })
);

// Channel ingestion (generic webhook entrypoint)
// This simulates WhatsApp Web / 3rd-party inbound messages into our system.
routes.post(
  '/ingest/message',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const body = ingestMessageSchema.parse(req.body);
    const out = await handleIngestMessage({ tenantId, body });
    res.json(out);
  })
);
