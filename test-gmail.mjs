import { ImapFlow } from './node_modules/imapflow/lib/imap-flow.js';

const client = new ImapFlow({
  host: 'imap.gmail.com',
  port: 993,
  secure: true,
  auth: {
    user: 'kutubkothari@gmail.com',
    pass: 'qpxvosidrwaufrle'
  },
  logger: {
    debug: (msg) => console.log('[DEBUG]', msg),
    info: (msg) => console.log('[INFO]', msg),
    warn: (msg) => console.warn('[WARN]', msg),
    error: (msg) => console.error('[ERROR]', msg)
  }
});

console.log('=== Gmail IMAP Connection Test ===');
console.log('User: kutubkothari@gmail.com');
console.log('Host: imap.gmail.com:993');
console.log('Attempting connection...\n');

const timeout = setTimeout(() => {
  console.error('\n✗ CONNECTION TIMEOUT (15 seconds)');
  console.error('Gmail may be silently blocking the connection.');
  console.error('Check Gmail security alerts for blocked sign-in attempts.');
  process.exit(1);
}, 15000);

try {
  await client.connect();
  clearTimeout(timeout);
  console.log('\n✓ Connected successfully!');
  
  const mailbox = await client.mailboxOpen('INBOX');
  console.log(`✓ INBOX opened: ${mailbox.exists} total messages, ${mailbox.unseen || 0} unseen\n`);
  
  await client.logout();
  console.log('✓ Test completed successfully!');
  process.exit(0);
} catch (err) {
  clearTimeout(timeout);
  console.error('\n✗ CONNECTION FAILED');
  console.error('Error:', err.message);
  console.error('Code:', err.code);
  console.error('Response:', err.response);
  console.error('ResponseText:', err.responseText);
  
  if (err.authenticationFailed || err.message?.includes('auth')) {
    console.error('\n🔒 AUTHENTICATION ERROR');
    console.error('Possible causes:');
    console.error('1. App password is incorrect or expired');
    console.error('2. IMAP access not enabled in Gmail settings');
    console.error('3. 2-Step Verification not set up properly');
    console.error('4. Google blocked sign-in from this IP (check Gmail security alerts)');
  }
  
  process.exit(1);
}
