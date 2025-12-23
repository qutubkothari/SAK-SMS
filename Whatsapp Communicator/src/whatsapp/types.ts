export type SakWebhookEvent = {
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

export type SendTextRequest = {
  to: string;
  text: string;
};
