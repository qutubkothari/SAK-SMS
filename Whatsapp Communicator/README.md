# WhatsApp Communicator (multi-tenant, no-frontend)

Minimal Node/TypeScript webhook receiver + auto-replier for **SAK WhatsApp API**.

## Webhook URL
Configure SAK session webhook to point to:

- `http://<EC2_PUBLIC_IP>:3001/api/webhooks/sak` (direct)
- or `https://<YOUR_DOMAIN>/api/webhooks/sak` (behind Nginx/SSL)

## Strict replies
Only these 2 commands are handled:
- `hi` → `hello`
- `كيف حالك` (also `كيف حالك؟`) → `كيف حالك؟`

All other messages are ignored (no reply).

## Setup (local / EC2)
1) Create `.env` from `.env.example`
2) Install + init DB:
- `npm i`
- `npm run prisma:generate`
- `npm run db:push`
3) Start:
- `npm run dev`

## Deploy changes to EC2
From this repo root on Windows:
- `npm run deploy:ec2`

This uploads the current code to EC2 `13.200.246.122`, installs deps, runs Prisma (`db:push`), builds, and restarts the PM2 process.

## Add a tenant (store your session keys in DB)
Use the admin API (protected by `x-admin-token`).

Create tenant:
- `POST /api/admin/tenants`

Body example:
```json
{
  "name": "primary-number",
  "sessionId": "af2bbc2d-323d-4429-b653-455393d9f9e2",
  "apiKeyMode": "session",
  "apiKey": "a636b4e1746fe74e72b61d54f2b40516942bc9bd44c96a7fb33f79b89bc2ad06",
  "webhookSecret": "<SECRET_FROM_SAK_WEBHOOK_CREATE_RESPONSE>",
  "phoneNumber": "918484830021"
}
```

List tenants:
- `GET /api/admin/tenants`

Notes:
- `webhookSecret` is returned by SAK when you create the webhook (or create the session with `webhook` field).
- Webhook signature verification is done per-tenant using that stored secret.
