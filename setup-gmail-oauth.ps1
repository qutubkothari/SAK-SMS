# Gmail OAuth2 Setup Script
# Run this after creating OAuth2 credentials in Google Cloud Console

Write-Host "Gmail OAuth2 Configuration Helper" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""

# Step 1: Get OAuth2 credentials
Write-Host "Step 1: Create OAuth2 Credentials" -ForegroundColor Yellow
Write-Host "1. In the opened browser, click 'CREATE CREDENTIALS' -> 'OAuth client ID'"
Write-Host "2. Application type: 'Web application'"
Write-Host "3. Name: 'SAK Email Integration'"
Write-Host "4. Authorized redirect URIs: http://13.203.69.128/admin/gmail-callback"
Write-Host "5. Click 'CREATE'"
Write-Host ""

$clientId = Read-Host "Enter your OAuth2 Client ID"
$clientSecret = Read-Host "Enter your OAuth2 Client Secret"

Write-Host ""
Write-Host "Step 2: Updating server environment..." -ForegroundColor Yellow

# Update .env file on server
$envUpdates = @"
# Gmail API Configuration
GMAIL_CLIENT_ID=$clientId
GMAIL_CLIENT_SECRET=$clientSecret
GMAIL_REDIRECT_URI=http://13.203.69.128/admin/gmail-callback
GMAIL_PUBSUB_TOPIC=projects/sak-sms-email/topics/gmail-notifications
DEFAULT_TENANT_ID=tenant_default
"@

# Backup and update .env
ssh -i sak-sms-2.pem ubuntu@13.203.69.128 "cd /opt/sak-ai-enquiry-handler/apps/api && sudo cp .env .env.backup && sudo tee -a .env > /dev/null << 'EOF'
$envUpdates
EOF"

Write-Host "Environment variables updated!" -ForegroundColor Green
Write-Host ""

Write-Host "Step 3: Get Refresh Token" -ForegroundColor Yellow
Write-Host "1. Visit: http://13.203.69.128/admin/gmail-auth-url"
Write-Host "2. Copy the authUrl and open it in your browser"
Write-Host "3. Sign in with kutubkothari@gmail.com"
Write-Host "4. Grant all requested permissions"
Write-Host "5. You'll be redirected with your tokens"
Write-Host ""

Start-Process "http://13.203.69.128/admin/gmail-auth-url"

Write-Host "Press any key after you've obtained the refresh token..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

$refreshToken = Read-Host "Enter your Refresh Token"

# Add refresh token to .env
ssh -i sak-sms-2.pem ubuntu@13.203.69.128 "cd /opt/sak-ai-enquiry-handler/apps/api && sudo sed -i '/^GMAIL_REFRESH_TOKEN=/d' .env && echo 'GMAIL_REFRESH_TOKEN=$refreshToken' | sudo tee -a .env > /dev/null"

Write-Host ""
Write-Host "Step 4: Restarting API..." -ForegroundColor Yellow
ssh -i sak-sms-2.pem ubuntu@13.203.69.128 "sudo pm2 restart sak-api"

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "Step 5: Checking Gmail initialization..." -ForegroundColor Yellow
ssh -i sak-sms-2.pem ubuntu@13.203.69.128 "sudo pm2 logs sak-api --lines 50 --nostream | grep -i gmail"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Gmail Pub/Sub Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Configuration Summary:" -ForegroundColor Cyan
Write-Host "  Project: sak-sms-email"
Write-Host "  Topic: projects/sak-sms-email/topics/gmail-notifications"
Write-Host "  Webhook: http://13.203.69.128/webhooks/gmail"
Write-Host "  Email: kutubkothari@gmail.com"
Write-Host ""
Write-Host "Note: For production, configure HTTPS for push notifications." -ForegroundColor Yellow
Write-Host "Currently using pull subscription due to HTTP limitation."
Write-Host ""
