import type { SendTextRequest } from './types.js';

export type SakAuth =
  | { mode: 'session'; apiKey: string }
  | { mode: 'user'; apiKey: string; sessionId: string };

export class SakApiClient {
  constructor(private readonly baseUrl: string) {}

  async sendText(auth: SakAuth, payload: SendTextRequest): Promise<void> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': auth.apiKey,
    };

    if (auth.mode === 'user') {
      headers['x-session-id'] = auth.sessionId;
    }

    const res = await fetch(`${this.baseUrl}/messages/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`SAK send failed: ${res.status} ${res.statusText} ${text}`.trim());
    }
  }
}
