# Gmail Pub/Sub Setup Guide

## Overview
This guide will help you set up Gmail API with Pub/Sub for real-time email notifications. This replaces the IMAP polling approach and eliminates Gmail's throttling issues.

## Prerequisites
- Google Cloud Project
- Gmail account (kutubkothari@gmail.com)
- Domain with public URL (for webhook: http://13.203.69.128/webhooks/gmail)

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Note your Project ID

## Step 2: Enable Gmail API

1. Go to **APIs & Services** → **Library**
2. Search for "Gmail API"
3. Click **Enable**

## Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Choose **Web application**
4. Name it: "SAK Email Integration"
5. Add Authorized redirect URIs:
   - `http://13.203.69.128/admin/gmail-callback`
   - `http://localhost:4000/admin/gmail-callback` (for testing)
6. Click **Create**
7. **Save the Client ID and Client Secret** - you'll need these!

## Step 4: Create Pub/Sub Topic

1. Go to **Pub/Sub** → **Topics**
2. Click **Create Topic**
3. Name: `gmail-notifications`
4. Leave defaults, click **Create**
5. Copy the full topic name: `projects/YOUR_PROJECT_ID/topics/gmail-notifications`

## Step 5: Grant Gmail Permission to Publish

Gmail needs permission to publish to your Pub/Sub topic:

1. Go to your Pub/Sub topic
2. Click **Permissions** tab
3. Click **Add Principal**
4. Add this service account: `gmail-api-push@system.gserviceaccount.com`
5. Role: **Pub/Sub Publisher**
6. Click **Save**

## Step 6: Create Pub/Sub Subscription (Push)

1. Go to **Pub/Sub** → **Subscriptions**
2. Click **Create Subscription**
3. Subscription ID: `gmail-push-subscription`
4. Select topic: `gmail-notifications`
5. Delivery type: **Push**
6. Endpoint URL: `http://13.203.69.128/webhooks/gmail?tenantId=tenant_default`
7. Click **Create**

## Step 7: Configure Environment Variables

Add these to `/opt/sak-ai-enquiry-handler/apps/api/.env`:

```bash
# Gmail API OAuth2
GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-client-secret
GMAIL_REDIRECT_URI=http://13.203.69.128/admin/gmail-callback
GMAIL_REFRESH_TOKEN=  # Leave empty for now, will get in next step
GMAIL_PUBSUB_TOPIC=projects/YOUR_PROJECT_ID/topics/gmail-notifications

# Default tenant for incoming emails
DEFAULT_TENANT_ID=tenant_default
```

## Step 8: Get Refresh Token (One-time OAuth flow)

1. Make sure API is deployed and running with the new config (without GMAIL_REFRESH_TOKEN)

2. Visit this URL in browser:
   ```
   http://13.203.69.128/admin/gmail-auth-url
   ```

3. Copy the `authUrl` from the response

4. Open that URL in browser

5. Sign in with kutubkothari@gmail.com

6. Grant all requested permissions:
   - Read emails
   - Send emails
   - Modify emails (mark as read)

7. You'll be redirected to the callback URL with your tokens

8. **Copy the `refresh_token`** from the response

9. Add it to `.env`:
   ```bash
   GMAIL_REFRESH_TOKEN=your-refresh-token-here
   ```

10. Restart PM2:
    ```bash
    sudo pm2 restart sak-api
    ```

## Step 9: Verify Setup

1. Check PM2 logs:
   ```bash
   sudo pm2 logs sak-api | grep Gmail
   ```

   You should see:
   ```
   [Gmail] Service configured with Pub/Sub
   [Gmail] Watch started successfully
   [Gmail] Expiration: <future date>
   ```

2. Send a test email to kutubkothari@gmail.com

3. Within seconds, you should see in logs:
   ```
   [Gmail Webhook] Received notification
   [Gmail Webhook] Found 1 unread message(s)
   [Gmail Webhook] Processing: sender@example.com - Subject
   [Gmail Webhook] Successfully processed message
   ```

4. Check your web interface - the email should appear as a new lead!

## Troubleshooting

### "Failed to start watch"
- Verify Pub/Sub topic exists and topic name is correct
- Check that `gmail-api-push@system.gserviceaccount.com` has Publisher role

### "Invalid payload" on webhook
- Verify Pub/Sub subscription endpoint URL is correct
- Check that subscription is type "Push" not "Pull"

### No emails received
- Check PM2 logs for errors
- Verify refresh token is valid
- Send test email and check Pub/Sub subscription monitoring

### Watch expired
Gmail watches expire after 7 days. The system should auto-renew, but you can manually renew:
```bash
curl -X POST http://localhost:4000/admin/start-gmail-watch
```

## Security Notes

- Keep Client Secret and Refresh Token confidential
- Refresh tokens don't expire but can be revoked
- Gmail API has generous quotas (1 billion quota units/day)
- Pub/Sub delivery endpoint should use HTTPS in production (consider Cloudflare or nginx SSL)

## Removing Old IMAP Config (Optional)

Once Gmail Pub/Sub is working, you can remove these from `.env`:
```bash
# IMAP_HOST=imap.gmail.com
# IMAP_PORT=993
# IMAP_SECURE=true
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
# EMAIL_USER=kutubkothari@gmail.com
# EMAIL_PASS=qpxvosidrwaufrle
# EMAIL_POLL_INTERVAL_MINUTES=15
```

The Gmail API will handle both receiving and sending emails!
