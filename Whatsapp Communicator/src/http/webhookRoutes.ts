import { Router } from 'express';
import type { WhatsAppCommunicator } from '../whatsapp/WhatsAppCommunicator.js';

export function buildWebhookRoutes(communicator: WhatsAppCommunicator) {
  const router = Router();

  router.post('/sak', async (req, res) => {
    const result = await communicator.handleIncomingWebhook({
      headers: req.headers as any,
      getHeader: (name: string) => req.get(name) ?? undefined,
      rawBody: req.rawBody,
      body: req.body,
    });

    res.status(result.status).send(result.body);
  });

  return router;
}
