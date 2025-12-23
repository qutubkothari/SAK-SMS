import crypto from 'crypto';
import type { Request } from 'express';

function safeEqualHex(aHex: string, bHex: string): boolean {
  const a = Buffer.from(aHex, 'hex');
  const b = Buffer.from(bHex, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export class WebhookVerifier {
  verifyOrThrow(params: {
    req: Request;
    secret: string;
  }): void {
    const sigHeader = params.req.get('X-Webhook-Signature') || '';
    const provided = sigHeader.replace(/^sha256=/i, '').trim();

    if (!provided) {
      throw new Error('Missing X-Webhook-Signature');
    }

    const raw = params.req.rawBody ?? Buffer.from(JSON.stringify(params.req.body ?? {}));
    const expected = crypto
      .createHmac('sha256', params.secret)
      .update(raw)
      .digest('hex');

    if (!safeEqualHex(provided, expected)) {
      throw new Error('Invalid webhook signature');
    }
  }
}
