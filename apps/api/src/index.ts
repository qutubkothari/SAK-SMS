import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { routes } from './routes.js';
import { errorHandler } from './http.js';
import { sakWebhookRouter } from './whatsapp/sakWebhook.js';
import { configureEmail, pollEmails } from './services/email.js';
import { handleIngestMessage } from './routes.js';
import { prisma } from './db.js';

const app = express();
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));

// Middleware to capture raw body for webhook signature verification
app.use('/api/webhooks', express.raw({ type: 'application/json', limit: '2mb' }), (req, res, next) => {
  (req as any).rawBody = req.body;
  req.body = JSON.parse(req.body.toString('utf8'));
  next();
});

app.use(express.json({ limit: '2mb' }));

app.use('/api/webhooks', sakWebhookRouter);
app.use(routes);
app.use(errorHandler);

// Configure email service if credentials are provided
if (process.env.IMAP_HOST && process.env.SMTP_HOST) {
  configureEmail({
    imap: {
      host: process.env.IMAP_HOST,
      port: Number(process.env.IMAP_PORT || 993),
      secure: process.env.IMAP_SECURE !== 'false',
      auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || '',
      },
    },
    smtp: {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || '',
      },
    },
  });

  // Start polling for emails every 5 minutes
  const pollInterval = Number(process.env.EMAIL_POLL_INTERVAL_MINUTES || 5);
  
  const pollEmailsTask = async () => {
    try {
      console.log('[Email] Starting email poll...');
      // Get the default tenant ID from env or first tenant
      let defaultTenantId = process.env.DEFAULT_TENANT_ID;
      if (!defaultTenantId) {
        const tenant = await prisma.tenant.findFirst();
        defaultTenantId = tenant?.id;
      }

      if (!defaultTenantId) {
        console.warn('[Email] No tenant found for email ingestion');
        return;
      }

      let emailCount = 0;
      await pollEmails(async (email) => {
        emailCount++;
        console.log(`[Email] Received email from ${email.from}: ${email.subject}`);
        await handleIngestMessage({
          tenantId: defaultTenantId,
          body: {
            channel: 'EMAIL',
            fullName: email.fromName,
            email: email.from,
            customerMessage: email.text,
            externalId: email.messageId,
          },
        });
      });
      console.log(`[Email] Poll complete. Processed ${emailCount} new emails.`);
    } catch (error) {
      console.error('[Email] Polling error:', error);
    }
  };

  // Poll immediately on startup
  pollEmailsTask();
  
  // Then poll at regular intervals
  setInterval(pollEmailsTask, pollInterval * 60 * 1000);

  console.log(`[Email] Service configured (polling every ${pollInterval} minutes)`);
}

// Configure Gmail Pub/Sub if credentials are provided
if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_REFRESH_TOKEN) {
  const { configureGmail, startGmailWatch } = await import('./services/gmailPubSub.js');
  
  configureGmail({
    clientId: process.env.GMAIL_CLIENT_ID,
    clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
    redirectUri: process.env.GMAIL_REDIRECT_URI || 'http://localhost:4000/admin/gmail-callback',
    refreshToken: process.env.GMAIL_REFRESH_TOKEN,
    pubSubTopic: process.env.GMAIL_PUBSUB_TOPIC || '',
  });

  function parseRetryAfterMsFromMessage(message: string): number | undefined {
    const match = String(message || '').match(/Retry after\s+([0-9]{4}-[0-9]{2}-[0-9]{2}T[^\s]+)/i);
    if (match?.[1]) {
      const parsed = Date.parse(match[1]);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return undefined;
  }

  const startWatchWithRetry = async (attempt: number = 1) => {
    try {
      const watch = await startGmailWatch();
      if (watch?.historyId) {
        // Seed per-tenant history cursor so the first Pub/Sub notifications can be consumed via history.list.
        let defaultTenantId = process.env.DEFAULT_TENANT_ID;
        if (!defaultTenantId) {
          const firstTenant = await prisma.tenant.findFirst({ select: { id: true } });
          defaultTenantId = firstTenant?.id;
        }

        if (defaultTenantId) {
          const existing = await prisma.gmailSyncState.findUnique({ where: { tenantId: defaultTenantId } });
          if (!existing) {
            await prisma.gmailSyncState.create({
              data: {
                tenantId: defaultTenantId,
                lastHistoryId: String(watch.historyId),
                updatedAt: new Date(),
              },
            });
            console.log(`[Gmail] Seeded GmailSyncState for tenant ${defaultTenantId} at historyId ${watch.historyId}`);
          }
        }
      }
      console.log('[Gmail] Pub/Sub watch started - will receive real-time notifications');
    } catch (error: any) {
      const status = error?.code ?? error?.response?.status;
      const retryAtMs = parseRetryAfterMsFromMessage(error?.message || '') ?? parseRetryAfterMsFromMessage(error?.cause?.message || '');

      if (status === 429 && retryAtMs && attempt <= 5) {
        const delayMs = Math.max(5_000, retryAtMs - Date.now());
        console.warn(`[Gmail] Watch start rate-limited; retrying in ${Math.ceil(delayMs / 1000)}s (attempt ${attempt})`);
        setTimeout(() => {
          startWatchWithRetry(attempt + 1).catch((e) => console.error('[Gmail] Watch retry failed:', e?.message || e));
        }, delayMs);
        return;
      }

      console.error('[Gmail] Failed to start watch:', error.message);
      console.error('[Gmail] Make sure Pub/Sub topic is configured and permissions are granted');
    }
  };

  // Start watching Gmail inbox for push notifications
  startWatchWithRetry().catch((e) => console.error('[Gmail] Watch start failed:', e?.message || e));
}

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}`);
});
