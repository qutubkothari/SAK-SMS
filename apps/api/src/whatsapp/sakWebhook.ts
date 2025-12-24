import crypto from 'crypto';
import { Router } from 'express';
import type { Request, Response } from 'express';
import { asyncHandler } from '../http.js';
import { prisma } from '../db.js';

type SakWebhookEvent = {
  event: string;
  sessionId: string;
  from?: string;
  from_jid?: string;
  from_number?: string;
  wa_id?: string;
  messageId?: string;
  timestamp?: number;
  type?: string;
  text?: string;
  pushName?: string;
};

const SESSION_ID = process.env.SAK_SESSION_ID || '';
const WEBHOOK_SECRET = process.env.SAK_WEBHOOK_SECRET || '';

export const sakWebhookRouter = Router();

sakWebhookRouter.post(
  '/sak',
  asyncHandler(async (req: Request, res: Response) => {
    const payload = req.body as SakWebhookEvent;

    // Only process message.received events for our session
    if (!payload?.sessionId || payload?.event !== 'message.received') {
      res.json({ ok: true });
      return;
    }

    if (payload.sessionId !== SESSION_ID) {
      res.json({ ok: true });
      return;
    }

    // Verify webhook signature
    const sigHeader = req.get('x-webhook-signature') || req.get('X-Webhook-Signature') || '';
    const provided = sigHeader.replace(/^sha256=/i, '').trim();
    
    if (!provided || !WEBHOOK_SECRET) {
      res.status(401).json({ error: 'missing signature' });
      return;
    }

    const raw = (req as any).rawBody || Buffer.from(JSON.stringify(req.body || {}));
    const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(raw).digest('hex');
    const a = Buffer.from(provided, 'hex');
    const b = Buffer.from(expected, 'hex');
    
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      res.status(401).json({ error: 'invalid signature' });
      return;
    }

    // Extract message data
    const phoneNumber = payload.from_number || payload.wa_id || '';
    const message = payload.text || '';
    const senderName = payload.pushName || '';

    if (!phoneNumber || !message) {
      res.json({ ok: true });
      return;
    }

    // Get the first tenant (or you can add session-to-tenant mapping later)
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      console.error('No tenant found');
      res.json({ ok: true });
      return;
    }
    
    console.log(`WhatsApp message received from ${phoneNumber} (${senderName}): ${message.substring(0, 50)}...`);
    
    try {
      // Import and call the ingest handler directly
      const { handleIngestMessage } = await import('../routes.js');
      
      await handleIngestMessage({
        tenantId: tenant.id,
        body: {
          channel: 'WHATSAPP' as const,
          phone: phoneNumber,
          fullName: senderName || undefined,
          customerMessage: message,
          externalId: payload.messageId,
        }
      });
      
      console.log(`Successfully ingested WhatsApp message from ${phoneNumber}`);
    } catch (error) {
      console.error('Error ingesting WhatsApp message:', error);
    }

    res.json({ ok: true });
  })
);
