import { ImapFlow } from 'imapflow';
import { simpleParser, ParsedMail } from 'mailparser';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface EmailConfig {
  imap: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
}

interface IncomingEmail {
  from: string;
  fromName?: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  messageId: string;
  date: Date;
}

let emailConfig: EmailConfig | null = null;
let smtpTransporter: Transporter | null = null;
let imapClient: ImapFlow | null = null;
let isPolling = false;

export function configureEmail(config: EmailConfig) {
  emailConfig = config;
  
  // Create SMTP transporter
  smtpTransporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: config.smtp.auth,
  });
  
  console.log('Email service configured');
}

export function getEmailConfig(): EmailConfig | null {
  return emailConfig;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!smtpTransporter || !emailConfig) {
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const info = await smtpTransporter.sendMail({
      from: params.from || emailConfig.smtp.auth.user,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html || params.text,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function parseEmailMessage(source: Buffer): Promise<IncomingEmail | null> {
  try {
    const parsed: ParsedMail = await simpleParser(source);
    
    const fromAddress = parsed.from?.value?.[0];
    if (!fromAddress?.address) return null;

    return {
      from: fromAddress.address,
      fromName: fromAddress.name || undefined,
      to: parsed.to?.value?.[0]?.address || '',
      subject: parsed.subject || '(no subject)',
      text: parsed.text || parsed.html || '',
      html: parsed.html || undefined,
      messageId: parsed.messageId || `${Date.now()}@local`,
      date: parsed.date || new Date(),
    };
  } catch (error) {
    console.error('Failed to parse email:', error);
    return null;
  }
}

export async function pollEmails(
  onNewEmail: (email: IncomingEmail) => Promise<void>
): Promise<void> {
  if (!emailConfig) {
    console.warn('Email service not configured; skipping poll');
    return;
  }

  if (isPolling) {
    console.log('[Email Poll] Already active, skipping');
    return;
  }

  isPolling = true;
  let timeoutId: NodeJS.Timeout | null = null;

  try {
    console.log('[Email Poll] Connecting to IMAP server...');
    console.log(`[Email Poll] Host: ${emailConfig.imap.host}:${emailConfig.imap.port}`);
    console.log(`[Email Poll] User: ${emailConfig.imap.auth.user}`);
    
    imapClient = new ImapFlow({
      host: emailConfig.imap.host,
      port: emailConfig.imap.port,
      secure: emailConfig.imap.secure,
      auth: emailConfig.imap.auth,
      logger: false,
    });

    // Force abort connection if Gmail throttles for too long
    timeoutId = setTimeout(() => {
      console.warn('[Email Poll] Connection timeout - Gmail throttling detected, aborting');
      if (imapClient) {
        try {
          imapClient.logout();
        } catch (e) {
          // Ignore close errors
        }
        imapClient = null;
      }
    }, 20000);

    await imapClient.connect();
    
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    
    console.log('[Email Poll] Connected to IMAP server');

    // Open INBOX
    const mailbox = await imapClient.mailboxOpen('INBOX');
    console.log(
      `[Email Poll] Opened INBOX: ${mailbox.exists} total messages, ${mailbox.unseen || 0} unseen`
    );

    // Fetch only UNSEEN messages
    if (mailbox.unseen && mailbox.unseen > 0) {
      console.log(`[Email Poll] Fetching ${mailbox.unseen} unseen message(s)...`);
      let processedCount = 0;
      
      for await (const message of imapClient.fetch('UNSEEN', {
        envelope: true,
        source: true,
        flags: true,
      })) {
        console.log(
          `[Email Poll] Processing email seq:${message.seq} uid:${message.uid}`
        );
        
        const email = await parseEmailMessage(message.source);
        if (email) {
          try {
            await onNewEmail(email);
            processedCount++;
            // Mark as seen after successful processing
            await imapClient.messageFlagsAdd(message.seq, ['\\Seen']);
            console.log(
              `[Email Poll] Successfully processed and marked as seen: seq:${message.seq}`
            );
          } catch (error) {
            console.error(
              `[Email Poll] Failed to process email seq:${message.seq}:`,
              error
            );
          }
        }
      }
      
      console.log(`[Email Poll] Processed ${processedCount} new email(s)`);
    } else {
      console.log('[Email Poll] No unseen messages');
    }

    await imapClient.logout();
    console.log('[Email Poll] Completed successfully');
  } catch (error) {
    console.error('[Email Poll] Error:', error);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    isPolling = false;
    imapClient = null;
  }
}

export async function startEmailIdleMonitor(
  onNewEmail: (email: IncomingEmail) => Promise<void>
): Promise<void> {
  if (!emailConfig) {
    console.warn('Email service not configured; cannot start IDLE monitor');
    return;
  }

  if (isPolling) {
    console.log('Email monitoring already active');
    return;
  }

  isPolling = true;

  try {
    imapClient = new ImapFlow({
      host: emailConfig.imap.host,
      port: emailConfig.imap.port,
      secure: emailConfig.imap.secure,
      auth: emailConfig.imap.auth,
      logger: false,
    });

    await imapClient.connect();
    console.log('Connected to IMAP server for IDLE monitoring');

    const lock = await imapClient.getMailboxLock('INBOX');
    try {
      // Process existing unseen messages first
      for await (const message of imapClient.fetch('UNSEEN', {
        envelope: true,
        source: true,
        flags: true,
      })) {
        const email = await parseEmailMessage(message.source);
        if (email) {
          try {
            await onNewEmail(email);
            await imapClient.messageFlagsAdd(message.seq, ['\\Seen']);
          } catch (error) {
            console.error('Failed to process email:', error);
          }
        }
      }
    } finally {
      lock.release();
    }

    // Set up IDLE listener for new messages
    imapClient.on('exists', async () => {
      const lock = await imapClient!.getMailboxLock('INBOX');
      try {
        for await (const message of imapClient!.fetch('UNSEEN', {
          envelope: true,
          source: true,
          flags: true,
        })) {
          const email = await parseEmailMessage(message.source);
          if (email) {
            try {
              await onNewEmail(email);
              await imapClient!.messageFlagsAdd(message.seq, ['\\Seen']);
            } catch (error) {
              console.error('Failed to process new email:', error);
            }
          }
        }
      } finally {
        lock.release();
      }
    });

    // Start IDLE
    await imapClient.idle();
    console.log('IDLE monitoring active');
  } catch (error) {
    console.error('Email IDLE monitor error:', error);
    isPolling = false;
    if (imapClient) {
      try {
        await imapClient.logout();
      } catch {}
      imapClient = null;
    }
  }
}

export async function stopEmailMonitor(): Promise<void> {
  if (imapClient) {
    try {
      await imapClient.logout();
      console.log('Stopped email monitor');
    } catch (error) {
      console.error('Error stopping email monitor:', error);
    }
    imapClient = null;
  }
  isPolling = false;
}
