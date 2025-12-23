# SAK WhatsApp API — Self‑Hosted Integration Guide (EC2)

Target audience: a team building a **multi‑session WhatsApp chatbot** that generates QR codes inside their own product.

Environment in this guide:
- **SAK API Host**: `3.109.55.6` (AWS EC2)
- **API Prefix**: `/api/v1`
- **Example Webhook Receiver URL (YOUR APP)**: `https://3.109.55.6/api/webhooks/sak`

> Note on HTTPS with an IP: A real TLS certificate (Let’s Encrypt) typically requires a domain name, not a bare IP. For testing, use HTTP (or a temporary public HTTPS URL like a tunnel). Once your domain is ready, switch to `https://yourdomain.com/...`.

---

## 1) Base API URL (self-hosted)

Depending on your reverse proxy setup:

### Option A — Direct to Node (dev/testing)
- Base URL: `http://3.109.55.6:5000/api/v1`

### Option B — Behind Nginx on port 80/443 (recommended)
- Base URL: `http://3.109.55.6/api/v1`
- After domain+SSL: `https://yourdomain.com/api/v1`

Health check:
- `GET /health` (no auth)

---

## 2) Authentication & API Credentials

SAK API supports **two credential types**:

### A) JWT (User login token)
Used for user dashboard style actions and creating user API keys.
- Header: `Authorization: Bearer <JWT>`
- Obtain via:
  - `POST /api/v1/auth/register`
  - `POST /api/v1/auth/login`

### B) API Keys
There are **two** API key levels.

#### 1) User-level API key ("master key")
Used to manage sessions without a JWT (good for SaaS backends).
- Header: `x-api-key: <USER_API_KEY>`
- Create (JWT required; key shown once):
  - `POST /api/v1/auth/api-keys`
- List (JWT required; does NOT return the raw key):
  - `GET /api/v1/auth/api-keys`

#### 2) Session API key (per WhatsApp session)
Returned when you create a session. Best for messaging.
- Header: `x-api-key: <SESSION_API_KEY>`

---

## 3) Multi-session Model

- Each WhatsApp device/account connection is a **session**.
- Each session has:
  - `sessionId` (UUID v4)
  - `apiKey` (session API key)
  - `status` (`pending`, `connected`, `disconnected`)

Your app should store at least:
- `sessionId`
- `sessionApiKey`
- your own `userId` mapping

---

## 4) Session Management Endpoints

All session-management endpoints accept **either**:
- JWT: `Authorization: Bearer ...`
- OR user-level API key: `x-api-key: <USER_API_KEY>`

### 4.1 Create session (creates a new WhatsApp connection)
- `POST /api/v1/sessions`

Request body:
```json
{
  "name": "Customer 123",
  "webhook": {
    "url": "https://3.109.55.6/api/webhooks/sak",
    "events": ["message.received"]
  }
}
```

Response:
```json
{
  "success": true,
  "data": {
    "sessionId": "<uuid>",
    "apiKey": "<SESSION_API_KEY>",
    "name": "Customer 123",
    "status": "pending",
    "message": "Scan QR code to connect",
    "webhook": {
      "id": "<uuid>",
      "url": "https://3.109.55.6/api/webhooks/sak",
      "events": ["message.received"],
      "secret": "<WEBHOOK_SECRET>"
    }
  }
}
```

Notes:
- `apiKey` is the **session API key**.
- If you include `webhook`, SAK will store it and send signed webhook events.

### 4.2 List sessions
- `GET /api/v1/sessions`

### 4.3 Get session status (connected/disconnected)
- `GET /api/v1/sessions/:sessionId/status`

Response:
```json
{
  "success": true,
  "data": {
    "sessionId": "...",
    "name": "...",
    "connected": true,
    "phoneNumber": "918484830021",
    "lastConnectedAt": "2025-12-20T...Z"
  }
}
```

### 4.4 Get QR code for a session (poll)
- `GET /api/v1/sessions/:sessionId/qr`

Response:
```json
{
  "success": true,
  "data": {
    "qrCode": "<qr-string-or-null>",
    "connected": false,
    "message": "QR not ready yet, retry shortly"
  }
}
```

How to use:
- After creating a session, poll this endpoint until `qrCode` is not `null`.
- Show the returned `qrCode` string using a QR library in your UI.

### 4.5 Disconnect + delete session
- `DELETE /api/v1/sessions/:sessionId`

---

## 5) Messaging Endpoints

All messaging endpoints require `x-api-key`.

You can authenticate in **two ways**:

### Option A (simple): Use the session API key
- `x-api-key: <SESSION_API_KEY>`

### Option B (SaaS/master): Use user API key + tell which session
- `x-api-key: <USER_API_KEY>`
- `x-session-id: <SESSION_ID>`

### 5.1 Send text message
- `POST /api/v1/messages/send`

Body:
```json
{
  "to": "+919876543210",
  "text": "Hello from SAK"
}
```

### 5.2 Send image
- `POST /api/v1/messages/send-image` (multipart/form-data)
- Fields:
  - `to`: string
  - `caption`: string (optional)
  - `image`: file

### 5.3 Send document
- `POST /api/v1/messages/send-document` (multipart/form-data)
- Fields:
  - `to`: string
  - `caption`: string (optional)
  - `document`: file

### 5.4 Send video
- `POST /api/v1/messages/send-video` (multipart/form-data)
- Fields:
  - `to`: string
  - `caption`: string (optional)
  - `video`: file

### 5.5 Message history (API-stored)
- `GET /api/v1/messages/history?limit=50&offset=0`

Important:
- This history is from the API database (messages SAK recorded). It does **not** import WhatsApp’s full historical chats.
- For full inbound chat history in your product, store inbound messages from **webhooks** in your own DB.

---

## 6) Phone Number Format

For outbound `to`:
- Digits only are accepted (non-digits are stripped).
- If you send a 10-digit number and it does not start with `91`, the API auto-prefixes **India country code `91`**.

Examples (all valid):
- `+919876543210`
- `919876543210`
- `9876543210` (will become `91 + 9876543210`)

If the final digit count is < 8 or > 15, the API rejects it.

---

## 7) Webhooks (Incoming Messages)

### 7.1 Register webhook
There are two ways:

**A) During session creation** (recommended): include `webhook.url` and optional `webhook.events` in `POST /sessions`.

**B) After session creation (JWT required)**
- `POST /api/v1/webhooks`
- Header: `Authorization: Bearer <JWT>`

Body:
```json
{
  "sessionId": "<SESSION_ID>",
  "url": "https://3.109.55.6/api/webhooks/sak",
  "events": ["message.received"]
}
```

Response includes `secret` (save it securely):
```json
{
  "success": true,
  "data": {
    "webhookId": "...",
    "url": "...",
    "secret": "<WEBHOOK_SECRET>",
    "events": ["message.received"]
  }
}
```

### 7.2 Webhook events actually emitted
Currently emitted by the gateway:
- `message.received`

Note:
- The API supports configuring an `events` list, and the `/webhooks/test` endpoint can send test events, but at runtime the gateway currently delivers **incoming messages** (`message.received`).

### 7.3 Webhook payload format (message.received)
Example:
```json
{
  "event": "message.received",
  "sessionId": "<SESSION_ID>",
  "from": "918484862949@s.whatsapp.net",
  "from_jid": "918484862949@s.whatsapp.net",
  "from_number": "+918484862949",
  "wa_id": "918484862949",
  "messageId": "3EB0...",
  "timestamp": 1734672000,
  "type": "conversation",
  "text": "hi",
  "pushName": "Customer Name"
}
```

### 7.4 Webhook security (signature verification)
SAK sends signed webhook requests:
- `X-Webhook-Signature: sha256=<hex_hmac>`
- `X-Webhook-Event: message.received`

Signature algorithm:
- `hex_hmac = HMAC_SHA256(secret, raw_request_body_as_string)`

#### Node.js (Express) verification example (recommended)
```js
import express from 'express';
import crypto from 'crypto';

const app = express();

// Capture raw body for HMAC verification
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));

function safeEqual(a, b) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

app.post('/api/webhooks/sak', (req, res) => {
  const secret = process.env.SAK_WEBHOOK_SECRET; // store per session if multi-tenant
  const sigHeader = req.get('X-Webhook-Signature') || '';
  const provided = sigHeader.replace('sha256=', '');

  const raw = req.rawBody || Buffer.from(JSON.stringify(req.body));
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');

  if (!safeEqual(provided, expected)) {
    return res.status(401).send('invalid signature');
  }

  // Verified payload
  const payload = req.body;
  // TODO: store payload in your DB

  res.json({ ok: true });
});

app.listen(3001);
```

### 7.5 Test webhook delivery
- `POST /api/v1/webhooks/test`
- Auth: `x-api-key: <SESSION_API_KEY>` (or user-key + `x-session-id`)

Body:
```json
{
  "event": "message.received",
  "message": "SAK webhook live test"
}
```

---

## 8) Rate Limits (self-hosted defaults)

Defaults (can be configured via environment variables):
- General API: **100 requests/minute** per IP
- Auth endpoints: **5 requests/minute** per IP
- API key messaging: **1000 requests/minute** per IP

Environment variables:
- `RATE_LIMIT_WINDOW_MS` (default 60000)
- `RATE_LIMIT_MAX_REQUESTS` (default 100)

---

## 9) Pricing / Costs

Self-hosted deployments typically do not enforce per-message billing inside the API code. Any pricing is part of your commercial plan / service agreement.

---

## 10) Copy/paste Examples

### 10.1 Create session (JWT)
```bash
curl -X POST "http://3.109.55.6:5000/api/v1/sessions" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Customer 123","webhook":{"url":"http://3.109.55.6:3001/api/webhooks/sak","events":["message.received"]}}'
```

### 10.2 Poll QR
```bash
curl -X GET "http://3.109.55.6:5000/api/v1/sessions/<SESSION_ID>/qr" \
  -H "Authorization: Bearer <JWT>"
```

### 10.3 Send text (session API key)
```bash
curl -X POST "http://3.109.55.6:5000/api/v1/messages/send" \
  -H "x-api-key: <SESSION_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"to":"+919876543210","text":"Hello"}'
```

### 10.4 Send text (user API key + session)
```bash
curl -X POST "http://3.109.55.6:5000/api/v1/messages/send" \
  -H "x-api-key: <USER_API_KEY>" \
  -H "x-session-id: <SESSION_ID>" \
  -H "Content-Type: application/json" \
  -d '{"to":"9876543210","text":"Hello"}'
```

---

## 11) Common Errors

- `401 NO_TOKEN`: missing JWT on JWT-only routes
- `401 NO_API_KEY`: missing `x-api-key` on API-key routes
- `400 SESSION_ID_REQUIRED`: you used a user-level API key for messaging but did not provide `x-session-id` / `sessionId`
- `403 SESSION_LIMIT_REACHED`: user plan session cap reached
- `INVALID_PHONE_NUMBER`: invalid `to` length after cleaning

