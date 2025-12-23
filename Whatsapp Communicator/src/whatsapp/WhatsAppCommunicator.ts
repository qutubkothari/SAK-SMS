import type { PrismaClient } from '@prisma/client';
import { SakApiClient } from './SakApiClient.js';
import { TenantRepository } from './TenantRepository.js';
import { WebhookVerifier } from './WebhookVerifier.js';
import { MessageRouter } from './MessageRouter.js';
import type { SakWebhookEvent } from './types.js';

export class WhatsAppCommunicator {
  private readonly tenants: TenantRepository;
  private readonly sak: SakApiClient;
  private readonly verifier = new WebhookVerifier();
  private readonly router = new MessageRouter();

  constructor(params: { prisma: PrismaClient; sakBaseUrl: string }) {
    this.tenants = new TenantRepository(params.prisma);
    this.sak = new SakApiClient(params.sakBaseUrl);
  }

  async handleIncomingWebhook(req: {
    headers: Record<string, string | string[] | undefined>;
    getHeader: (name: string) => string | undefined;
    rawBody: Buffer | undefined;
    body: unknown;
  }): Promise<{ status: number; body: unknown }> {
    const payload = req.body as SakWebhookEvent;

    if (!payload?.sessionId || payload?.event !== 'message.received') {
      return { status: 200, body: { ok: true } };
    }

    const tenant = await this.tenants.getBySessionId(payload.sessionId);
    if (!tenant || !tenant.isActive) {
      return { status: 200, body: { ok: true } };
    }

    // Verify signature using the tenant's webhook secret
    // This is implemented in the Express route where we have the Request object;
    // here we do a minimal verification using passed in header getter.
    const sigHeader = req.getHeader('x-webhook-signature') ?? req.getHeader('X-Webhook-Signature') ?? '';
    const provided = sigHeader.replace(/^sha256=/i, '').trim();
    if (!provided) {
      return { status: 401, body: 'missing signature' };
    }

    const raw = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
    const crypto = await import('crypto');
    const expected = crypto.createHmac('sha256', tenant.webhookSecret).update(raw).digest('hex');
    const a = Buffer.from(provided, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { status: 401, body: 'invalid signature' };
    }

    // Decide reply (STRICT: only 2 commands)
    const decision = this.router.decideReply(payload.text);
    if (!decision.shouldReply) {
      return { status: 200, body: { ok: true } };
    }

    const to = payload.from_number || payload.wa_id || '';
    if (!to) {
      return { status: 200, body: { ok: true } };
    }

    if (tenant.apiKeyMode === 'session') {
      await this.sak.sendText({ mode: 'session', apiKey: tenant.apiKey }, { to, text: decision.replyText });
    } else {
      await this.sak.sendText(
        { mode: 'user', apiKey: tenant.apiKey, sessionId: tenant.sessionId },
        { to, text: decision.replyText }
      );
    }

    return { status: 200, body: { ok: true } };
  }

  getTenantRepository(): TenantRepository {
    return this.tenants;
  }

  getWebhookVerifier(): WebhookVerifier {
    return this.verifier;
  }
}
