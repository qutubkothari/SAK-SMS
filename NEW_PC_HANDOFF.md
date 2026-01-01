# SAK AI Enquiry Handler — New PC Handoff (Jan 2026)

## Repo
- GitHub (origin): https://github.com/qutubkothari/SAK-SMS
- Default branch in this workspace: `master`

## Production EC2 (Current)
- Public IP: `13.201.185.222`
- SSH user: `ubuntu`
- PEM key filename: `sak-sms-2026.pem`
  - IMPORTANT: the private key must NOT be committed to GitHub.
  - This repo already ignores `*.pem` via `.gitignore`; copy the key manually to the new PC.
  - Current location: root directory of workspace

### Common SSH commands
From Windows PowerShell:
```powershell
ssh -i "sak-sms-2026.pem" -o StrictHostKeyChecking=accept-new ubuntu@13.201.185.222
```

Tail API logs (PM2):
```bash
tail -n 200 /home/ubuntu/.pm2/logs/sak-api-out.log
```

## What the app is
Monorepo:
- `apps/api`: Node.js + TypeScript + Express API (Prisma + Postgres)
- `apps/web`: Vite + React admin UI
- `packages/shared`: shared TS utilities
- Infra on EC2: Nginx reverse proxy + PM2 + Docker Compose (Postgres)

### High-level flow (EMAIL via Gmail Pub/Sub)
1. Gmail `watch` pushes events to Google Pub/Sub.
2. Pub/Sub pushes HTTPS webhook to API: `POST /api/webhooks/gmail?tenantId=<TENANT_ID>`
3. API consumes incremental changes using Gmail `users.history.list` (historyId cursor stored in DB).
4. Each changed message is fetched (`users.messages.get`), filtered (spam/newsletter + keyword allowlist), deduped, ingested as a Lead, optionally AI-replied, then marked read.

## Key production endpoints
- Health: `GET /api/health` (should return `{ ok: true }`)
- Gmail Pub/Sub webhook: `POST /api/webhooks/gmail?tenantId=...`
- Safe debug status (no Gmail calls by default): `GET /api/admin/gmail-debug`
  - To force live Gmail calls: `GET /api/admin/gmail-debug?force=1` (avoid using during 429 windows)

## Key configuration (env)
### Gmail
- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REFRESH_TOKEN`
- `GMAIL_PUBSUB_TOPIC` (format: `projects/<project>/topics/<topic>`)
- `GMAIL_REDIRECT_URI` (used for OAuth setup)

### Email ingestion filtering
- `EMAIL_ENQUIRY_KEYWORDS`
  - Comma/newline-separated allowlist of product keywords.
  - If set, ingestion becomes “keywords-only”.
- `EMAIL_ENQUIRY_REQUIRE_KEYWORDS`
  - Default behavior: require keyword match when keywords list is non-empty.

### Tenant
- `DEFAULT_TENANT_ID`

### Legacy IMAP polling (disabled in production)
- IMAP polling is automatically disabled if Gmail Pub/Sub is configured.
- Override:
  - `EMAIL_POLL_ENABLED=true` to force-enable IMAP polling
  - `EMAIL_POLL_ENABLED=false` to force-disable

## Database / Prisma
- DB: Postgres (Docker on EC2)
- Gmail cursor state persisted in `GmailSyncState` (per tenant):
  - `tenantId` (unique)
  - `emailAddress` (optional)
  - `lastHistoryId`
  - `updatedAt`

Useful query helper:
- `deploy/ec2/dbcheck.sql` prints:
  - recent `GmailSyncState`
  - EMAIL Leads
  - EMAIL Messages

## Deployment
Two ways are commonly used:

### 1) From your PC (recommended)
Script: `deploy/ec2/deploy-from-local.ps1`
- Uploads deploy helpers
- Runs server-side deploy script

Example:
```powershell
pwsh -File .\deploy\ec2\deploy-from-local.ps1 \
  -Server 13.201.185.222 \
  -User ubuntu \
  -AppDir /opt/sak-ai-enquiry-handler \
  -Branch master \
  -RepoUrl https://github.com/qutubkothari/SAK-SMS.git \
  -KeyPath ".\sak-sms-2026.pem"
```

Notes:
- `deploy/ec2/remote-deploy.sh` sets `NODE_OPTIONS=--max-old-space-size=3072` during build to avoid OOM on small instances.
- Nginx serves web from `/var/www/html` and proxies `/api/*` to `127.0.0.1:4000`.

### 2) From EC2 (manual)
```bash
cd /opt/sak-ai-enquiry-handler
git fetch --all --prune
git reset --hard origin/master
npm ci
( cd apps/api && npm run prisma:generate )
( cd apps/api && npm run prisma:deploy )
NODE_OPTIONS="--max-old-space-size=3072" npm run -ws build
pm2 startOrRestart deploy/ec2/pm2.config.cjs --update-env
pm2 save
```

## What we achieved (Dec 2025 → Jan 2026)
### Gmail ingestion reliability
- Replaced IMAP-style polling ingestion with Gmail API + Pub/Sub webhook flow.
- Implemented incremental sync using Pub/Sub `historyId` + Gmail `users.history.list`.
- Persisted cursor per tenant in DB (`GmailSyncState`) to avoid reprocessing and to survive restarts.
- Added backoff/coalescing so webhook does not amplify Gmail 429 rate limits.
- Debug endpoint made safe-by-default: `/api/admin/gmail-debug` does not call Gmail unless `?force=1`.

### Data quality
- Stronger spam/newsletter filtering.
- Optional strict keyword allowlist for enquiries via `EMAIL_ENQUIRY_KEYWORDS`.
- Deduplication by `(tenantId, channel=EMAIL, externalId=Message-ID)`.

### Reply quality
- AI prompt input improved: includes `From + Subject + Message` (bounded length) so replies are not identical.
- Email replies are sent only when a draft is generated and not escalated.

### Ops / deployment
- Deployment reliability improved (OOM-safe build heap; fail-fast deploy script).
- Legacy IMAP polling disabled when Gmail Pub/Sub is configured (reduces noise and confusion).

## Current known blocker / pending work
### Gmail 429 throttling is still blocking sync in production
Symptoms:
- Webhook receives notifications.
- Logs show “Fetching history since <cursor> -> <new historyId>”.
- But Gmail returns 429 during `users.history.list`, so:
  - DB cursor may not advance
  - No EMAIL leads/messages get created

What to do next:
1. Wait out the `Retry-After` window shown in `/api/admin/gmail-debug` (`historyBlockedUntilMs`).
2. Send a fresh test email that includes the required keywords.
3. Watch logs for:
   - `Found X changed message(s) from history`
   - `Processing enquiry: ...`
4. Run DB check:
   - `GmailSyncState.lastHistoryId` should advance
   - EMAIL `Lead` rows should appear

If 429 persists for hours/days:
- Confirm the Google Cloud project quota for Gmail API is sufficient.
- Confirm the OAuth client/project used for the refresh token matches the project with quota.
- Consider reducing history pages (`maxPages`) temporarily.
- Consider adding stronger rate limiting across restarts (persist backoff in DB) if needed.

## New PC setup checklist
1. Install:
   - Git
   - Node.js (LTS)
   - Docker Desktop (optional but recommended)
   - VS Code
2. Clone:
```bash
git clone https://github.com/qutubkothari/SAK-SMS.git
cd SAK-SMS
```
3. Restore secrets:
   - Copy `sak-sms-2.pem` to a safe path (not inside the repo)
   - Put production `.env` values in the EC2 server (do not commit)
4. Deploy using the PowerShell script (see Deployment section).

## Notes / safety
- Do not commit secrets (`*.pem`, `.env`, refresh tokens).
- If you suspect the PEM key was ever pushed to GitHub, rotate it immediately in AWS and update your local copy.
