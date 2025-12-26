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

  // Start watching Gmail inbox for push notifications
  try {
    await startGmailWatch();
    console.log('[Gmail] Pub/Sub watch started - will receive real-time notifications');
  } catch (error: any) {
    console.error('[Gmail] Failed to start watch:', error.message);
    console.error('[Gmail] Make sure Pub/Sub topic is configured and permissions are granted');
  }
}

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}`);
});
