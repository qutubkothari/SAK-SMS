import { Router } from 'express';
import { z } from 'zod';
import type { SakApiKeyMode } from '@prisma/client';
import type { TenantRepository } from '../whatsapp/TenantRepository.js';

function requireAdminToken(expected: string) {
  return (req: any, res: any, next: any) => {
    const got = req.get('x-admin-token');
    if (!got || got !== expected) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    next();
  };
}

const tenantCreateSchema = z.object({
  name: z.string().min(1),
  sessionId: z.string().min(4),
  apiKeyMode: z.enum(['session', 'user']),
  apiKey: z.string().min(10),
  webhookSecret: z.string().min(10),
  phoneNumber: z.string().optional(),
});

export function buildAdminRoutes(params: {
  adminToken: string;
  tenants: TenantRepository;
}) {
  const router = Router();

  router.use(requireAdminToken(params.adminToken));

  router.get('/tenants', async (_req, res) => {
    const tenants = await params.tenants.list();
    const safe = tenants.map((t) => ({
      id: t.id,
      name: t.name,
      sessionId: t.sessionId,
      apiKeyMode: t.apiKeyMode,
      phoneNumber: t.phoneNumber,
      isActive: t.isActive,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
    res.json({ tenants: safe });
  });

  router.post('/tenants', async (req, res) => {
    const parsed = tenantCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid body', issues: parsed.error.issues });
    }

    const apiKeyMode = parsed.data.apiKeyMode as SakApiKeyMode;

    const tenant = await params.tenants.create({
      name: parsed.data.name,
      sessionId: parsed.data.sessionId,
      apiKeyMode,
      apiKey: parsed.data.apiKey,
      webhookSecret: parsed.data.webhookSecret,
      phoneNumber: parsed.data.phoneNumber,
    });

    res.status(201).json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        sessionId: tenant.sessionId,
        apiKeyMode: tenant.apiKeyMode,
        phoneNumber: tenant.phoneNumber,
        isActive: tenant.isActive,
      },
    });
  });

  router.post('/tenants/:sessionId/disable', async (req, res) => {
    const sessionId = req.params.sessionId;
    const updated = await params.tenants.setActive(sessionId, false);
    res.json({ sessionId: updated.sessionId, isActive: updated.isActive });
  });

  router.post('/tenants/:sessionId/enable', async (req, res) => {
    const sessionId = req.params.sessionId;
    const updated = await params.tenants.setActive(sessionId, true);
    res.json({ sessionId: updated.sessionId, isActive: updated.isActive });
  });

  return router;
}
