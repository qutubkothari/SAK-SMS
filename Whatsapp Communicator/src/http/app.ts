import express from 'express';
import type { AppConfig } from '../config.js';
import { buildAdminRoutes } from './adminRoutes.js';
import { buildWebhookRoutes } from './webhookRoutes.js';
import type { WhatsAppCommunicator } from '../whatsapp/WhatsAppCommunicator.js';

export function buildApp(params: {
  config: AppConfig;
  communicator: WhatsAppCommunicator;
}) {
  const app = express();

  // Capture raw body for webhook signature validation
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as any).rawBody = buf;
      },
    })
  );

  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.use('/api/webhooks', buildWebhookRoutes(params.communicator));
  app.use('/api/admin', buildAdminRoutes({
    adminToken: params.config.ADMIN_TOKEN,
    tenants: params.communicator.getTenantRepository(),
  }));

  return app;
}
