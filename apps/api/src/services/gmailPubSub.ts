import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

interface GmailConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  refreshToken: string;
  pubSubTopic: string;
}

let gmailClient: any = null;
let oauth2Client: OAuth2Client | null = null;
let gmailConfig: GmailConfig | null = null;

let gmailListBlockedUntilMs = 0;
let gmailHistoryBlockedUntilMs = 0;

export function getGmailRateLimitStatus(): {
  listUnreadBlockedUntilMs: number;
  historyBlockedUntilMs: number;
} {
  return {
    listUnreadBlockedUntilMs: gmailListBlockedUntilMs,
    historyBlockedUntilMs: gmailHistoryBlockedUntilMs,
  };
}

function parseRetryAfterMs(error: any): number | undefined {
  const now = Date.now();

  const retryAfterHeader = error?.response?.headers?.['retry-after'] ?? error?.response?.headers?.['Retry-After'];
  if (retryAfterHeader) {
    const asNumber = Number(retryAfterHeader);
    if (Number.isFinite(asNumber) && asNumber > 0) {
      return now + Math.floor(asNumber * 1000);
    }
    const asDate = Date.parse(String(retryAfterHeader));
    if (Number.isFinite(asDate)) {
      return asDate;
    }
  }

  const causeMessage = error?.cause?.message || error?.[Symbol.for('cause')]?.message;
  const message = String(causeMessage || error?.message || '');
  const match = message.match(/Retry after\s+([0-9]{4}-[0-9]{2}-[0-9]{2}T[^\s]+)/i);
  if (match?.[1]) {
    const parsed = Date.parse(match[1]);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

export function configureGmail(config: GmailConfig) {
  gmailConfig = config;

  // Create OAuth2 client
  oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri
  );

  // Set refresh token
  oauth2Client.setCredentials({
    refresh_token: config.refreshToken,
  });

  // Create Gmail client
  gmailClient = google.gmail({ version: 'v1', auth: oauth2Client });

  console.log('[Gmail] Service configured with Pub/Sub');
}

/**
 * Start watching Gmail inbox for new messages
 * Sets up push notifications to Pub/Sub topic
 */
export async function startGmailWatch(): Promise<{ historyId?: string; expiration?: string }> {
  if (!gmailClient || !gmailConfig) {
    throw new Error('Gmail service not configured');
  }

  try {
    console.log('[Gmail] Starting inbox watch...');
    
    const response = await gmailClient.users.watch({
      userId: 'me',
      requestBody: {
        topicName: gmailConfig.pubSubTopic,
        labelIds: ['INBOX', 'UNREAD'],
      },
    });

    console.log('[Gmail] Watch started successfully');
    console.log('[Gmail] Expiration:', new Date(parseInt(response.data.expiration)));
    console.log('[Gmail] History ID:', response.data.historyId);

    return {
      historyId: response.data.historyId ? String(response.data.historyId) : undefined,
      expiration: response.data.expiration ? String(response.data.expiration) : undefined,
    };
  } catch (error: any) {
    console.error('[Gmail] Failed to start watch:', error.message);
    throw error;
  }
}

/**
 * Stop watching Gmail inbox
 */
export async function stopGmailWatch(): Promise<void> {
  if (!gmailClient) {
    throw new Error('Gmail service not configured');
  }

  try {
    await gmailClient.users.stop({
      userId: 'me',
    });
    console.log('[Gmail] Watch stopped');
  } catch (error: any) {
    console.error('[Gmail] Failed to stop watch:', error.message);
    throw error;
  }
}

/**
 * List unread Gmail messages
 */
export async function listUnreadGmailMessages(maxResults: number = 10): Promise<any[]> {
  if (!gmailClient) {
    throw new Error('Gmail service not configured');
  }

  try {
    const now = Date.now();
    if (now < gmailListBlockedUntilMs) {
      const err: any = new Error(
        `[Gmail] Rate limited; retry after ${new Date(gmailListBlockedUntilMs).toISOString()}`
      );
      err.code = 429;
      err.retryAfterMs = gmailListBlockedUntilMs;
      throw err;
    }

    const response = await gmailClient.users.messages.list({
      userId: 'me',
      q: 'is:unread in:inbox',
      maxResults,
    });

    return response.data.messages || [];
  } catch (error: any) {
    const status = error?.code ?? error?.response?.status;
    if (status === 429) {
      const retryAfterMs = parseRetryAfterMs(error);
      if (retryAfterMs) {
        gmailListBlockedUntilMs = Math.max(gmailListBlockedUntilMs, retryAfterMs);
        (error as any).retryAfterMs = gmailListBlockedUntilMs;
      } else {
        // Conservative default backoff when Gmail doesn't give a usable retry time.
        gmailListBlockedUntilMs = Math.max(gmailListBlockedUntilMs, Date.now() + 10 * 60 * 1000);
        (error as any).retryAfterMs = gmailListBlockedUntilMs;
      }
    }
    console.error('[Gmail] Failed to list messages:', error.message);
    throw error;
  }
}

/**
 * List message IDs changed since a given Gmail history ID.
 * This is the recommended way to consume Pub/Sub notifications without polling.
 */
export async function listGmailHistoryMessageIds(params: {
  startHistoryId: string;
  labelId?: string;
  maxPages?: number;
}): Promise<{ messageIds: string[] }> {
  if (!gmailClient) {
    throw new Error('Gmail service not configured');
  }

  const startHistoryId = String(params.startHistoryId || '').trim();
  if (!startHistoryId) {
    throw new Error('startHistoryId is required');
  }

  try {
    const now = Date.now();
    if (now < gmailHistoryBlockedUntilMs) {
      const err: any = new Error(
        `[Gmail] Rate limited; retry after ${new Date(gmailHistoryBlockedUntilMs).toISOString()}`
      );
      err.code = 429;
      err.retryAfterMs = gmailHistoryBlockedUntilMs;
      throw err;
    }

    const messageIds = new Set<string>();
    let pageToken: string | undefined = undefined;
    let pages = 0;
    const maxPages = Math.max(1, Number(params.maxPages ?? 10));

    while (true) {
      pages++;
      if (pages > maxPages) {
        break;
      }

      const response: any = await gmailClient.users.history.list({
        userId: 'me',
        startHistoryId,
        pageToken,
        labelId: params.labelId,
        historyTypes: ['messageAdded', 'labelAdded'],
        maxResults: 500,
      });

      const history = response.data.history || [];
      for (const h of history) {
        const added = h.messagesAdded || [];
        for (const a of added) {
          const id = a?.message?.id;
          if (id) messageIds.add(String(id));
        }

        const labelAdded = h.labelsAdded || [];
        for (const la of labelAdded) {
          const id = la?.message?.id;
          if (id) messageIds.add(String(id));
        }
      }

      pageToken = response.data.nextPageToken || undefined;
      if (!pageToken) {
        break;
      }
    }

    return { messageIds: Array.from(messageIds) };
  } catch (error: any) {
    const status = error?.code ?? error?.response?.status;
    if (status === 429) {
      const retryAfterMs = parseRetryAfterMs(error);
      if (retryAfterMs) {
        gmailHistoryBlockedUntilMs = Math.max(gmailHistoryBlockedUntilMs, retryAfterMs);
        (error as any).retryAfterMs = gmailHistoryBlockedUntilMs;
      } else {
        gmailHistoryBlockedUntilMs = Math.max(gmailHistoryBlockedUntilMs, Date.now() + 10 * 60 * 1000);
        (error as any).retryAfterMs = gmailHistoryBlockedUntilMs;
      }
    }

    console.error('[Gmail] Failed to list history:', error.message);
    throw error;
  }
}

/**
 * Fetch email by message ID
 */
export async function fetchGmailMessage(messageId: string): Promise<any> {
  if (!gmailClient) {
    throw new Error('Gmail service not configured');
  }

  try {
    const response = await gmailClient.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    const message = response.data;
    
    // Parse headers
    const headers = message.payload.headers;
    const getHeader = (name: string) => 
      headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    // Extract email body
    let body = '';
    let htmlBody = '';

    function extractBody(part: any) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        body = Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        htmlBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
      }

      if (part.parts) {
        part.parts.forEach(extractBody);
      }
    }

    if (message.payload.parts) {
      message.payload.parts.forEach(extractBody);
    } else if (message.payload.body?.data) {
      body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
    }

    // Parse from address
    const fromHeader = getHeader('from');
    const fromMatch = fromHeader.match(/<(.+?)>/) || fromHeader.match(/(.+)/);
    const fromEmail = fromMatch ? fromMatch[1] : fromHeader;
    const fromName = fromHeader.replace(/<.+?>/, '').trim() || fromEmail;

    return {
      messageId: message.id,
      threadId: message.threadId,
      from: fromEmail,
      fromName,
      to: getHeader('to'),
      subject: getHeader('subject'),
      date: getHeader('date'),
      text: body || htmlBody.replace(/<[^>]*>/g, ''), // Strip HTML tags if no plain text
      html: htmlBody,
      snippet: message.snippet,
      labels: message.labelIds || [],
    };
  } catch (error: any) {
    console.error('[Gmail] Failed to fetch message:', error.message);
    throw error;
  }
}

/**
 * Mark message as read
 */
export async function markGmailMessageAsRead(messageId: string): Promise<void> {
  if (!gmailClient) {
    throw new Error('Gmail service not configured');
  }

  try {
    await gmailClient.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        removeLabelIds: ['UNREAD'],
      },
    });
    console.log(`[Gmail] Marked message ${messageId} as read`);
  } catch (error: any) {
    console.error('[Gmail] Failed to mark message as read:', error.message);
  }
}

/**
 * Send email via Gmail API
 */
export async function sendGmailMessage(params: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!gmailClient) {
    return { success: false, error: 'Gmail service not configured' };
  }

  try {
    // Construct RFC 2822 formatted email
    const lines = [
      `To: ${params.to}`,
      `Subject: ${params.subject}`,
      'Content-Type: text/plain; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      params.text,
    ];

    const email = lines.join('\r\n');
    const encodedEmail = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await gmailClient.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail,
      },
    });

    console.log(`[Gmail] Sent email to ${params.to}, messageId: ${response.data.id}`);
    return { success: true, messageId: response.data.id };
  } catch (error: any) {
    console.error('[Gmail] Failed to send email:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get authorization URL for OAuth2 flow
 * Use this to get the initial refresh token
 */
export function getGmailAuthUrl(): string {
  if (!oauth2Client) {
    throw new Error('OAuth2 client not configured');
  }

  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });
}

/**
 * Exchange authorization code for tokens
 * Use this after user authorizes via the auth URL
 */
export async function getGmailTokensFromCode(code: string): Promise<any> {
  if (!oauth2Client) {
    throw new Error('OAuth2 client not configured');
  }

  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}
