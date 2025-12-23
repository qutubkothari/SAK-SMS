const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const secret = crypto.randomBytes(32).toString('hex');

console.log('🔐 Setting up AUTH_JWT_SECRET...\n');

// Read existing .env or create new
let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch (e) {
  console.log('Creating new .env file...');
}

// Check if AUTH_JWT_SECRET already exists
if (envContent.includes('AUTH_JWT_SECRET=')) {
  console.log('✓ AUTH_JWT_SECRET already exists in .env');
  console.log('   No changes made.\n');
} else {
  // Add the secret
  const newLine = envContent && !envContent.endsWith('\n') ? '\n' : '';
  fs.appendFileSync(envPath, `${newLine}AUTH_JWT_SECRET=${secret}\n`);
  console.log('✅ Added AUTH_JWT_SECRET to .env');
  console.log('   Secret:', secret.substring(0, 16) + '...\n');
  console.log('⚠️  Please restart the API server for changes to take effect:');
  console.log('   pm2 restart sak-api\n');
}
