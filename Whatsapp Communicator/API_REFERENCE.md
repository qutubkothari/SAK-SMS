# API Reference - SAK WhatsApp API

## Installation (Self-Hosted)

### Prerequisites
- Docker + Docker Compose
- A domain pointed at your server (optional)

### Run
```bash
docker compose up -d --build
```

### Verify
```bash
curl -sS http://localhost:3000/health
```

## Base URL

- Self-hosted example: `http://wapi.saksolution.com/api/v1`
- Default/example in this doc: `https://api.sakwhatsapp.com/api/v1`

## Authentication

All endpoints except `/auth/register` and `/auth/login` require authentication.

### User Authentication (JWT)
Include JWT token in Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### API Key Authentication
Include API key in `x-api-key` header.

This API supports **two** API-key modes:

1) **Legacy per-session API key** (current dashboard/session key)
- Send only: `x-api-key: <session_api_key>`
- Session is inferred from the key.

2) **Stable user API key** (recommended for client integrations)
- Create once using `POST /auth/api-keys` (requires JWT)
- Send:
  - `x-api-key: <user_api_key>`
  - `x-session-id: <sessionId>` (or `sessionId` in body/query)

The stable user key does **not** change unless you rotate it; your `sessionId` can stay the same.
```
x-api-key: YOUR_SESSION_API_KEY
```

---

## 🔑 User API Keys (Stable)

These endpoints let a logged-in user create/list stable API keys.

### POST /auth/api-keys
Create a new API key for the current user (returned **once**).

**Headers:** `Authorization: Bearer TOKEN`

**Request Body:**
```json
{ "name": "my-client-app" }
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "my-client-app",
    "key": "<RAW_KEY_SHOWN_ONCE>",
    "lastFour": "abcd",
    "createdAt": "2025-12-14T00:00:00.000Z"
  }
}
```

### GET /auth/api-keys
List API keys for the current user (raw key is never returned).

**Headers:** `Authorization: Bearer TOKEN`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "keys": [
      {
        "id": "uuid",
        "name": "my-client-app",
        "last_four": "abcd",
        "is_active": true,
        "created_at": "2025-12-14T00:00:00.000Z",
        "last_used_at": null,
        "expires_at": null
      }
    ]
  }
}
```

## 🔐 Authentication Endpoints

### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe" // optional
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "plan": "free"
    }
  }
}
```

### POST /auth/login
Login to existing account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "plan": "free"
    }
  }
}
```

### GET /auth/me
Get current user information.

**Headers:** `Authorization: Bearer TOKEN`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "plan": "free",
      "created_at": "2025-12-12T00:00:00.000Z"
    }
  }
}
```

---

## 📱 Session Management

### POST /sessions
Create a new WhatsApp session.

**Headers:** `Authorization: Bearer TOKEN`

**Request Body:**
```json
{
  "name": "My Business WhatsApp"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "sessionId": "abc-123-def-456",
    "apiKey": "sak_1234567890abcdef...",
    "name": "My Business WhatsApp",
    "status": "pending",
    "message": "Scan QR code to connect"
  }
}
```

### GET /sessions
Get all sessions for current user.

**Headers:** `Authorization: Bearer TOKEN`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "session_id": "abc-123",
        "name": "My Business",
        "status": "connected",
        "phone_number": "919876543210",
        "last_connected_at": "2025-12-12T00:00:00.000Z",
        "created_at": "2025-12-10T00:00:00.000Z"
      }
    ]
  }
}
```

### GET /sessions/:sessionId/status
Get session connection status.

**Headers:** `Authorization: Bearer TOKEN`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "sessionId": "abc-123",
    "name": "My Business",
    "connected": true,
    "phoneNumber": "919876543210",
    "lastConnectedAt": "2025-12-12T00:00:00.000Z"
  }
}
```

### GET /sessions/:sessionId/qr
Get QR code for session connection.

**Headers:** `Authorization: Bearer TOKEN`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "qrCode": "2@abc123...",
    "message": "Scan this QR code with WhatsApp"
  }
}
```

### DELETE /sessions/:sessionId
Disconnect and delete session.

**Headers:** `Authorization: Bearer TOKEN`

**Response (200):**
```json
{
  "success": true,
  "message": "Session disconnected and deleted"
}
```

---

## 💬 Messaging

### POST /messages/send
Send a text message.

**Headers:**
- `x-api-key: YOUR_API_KEY`
- `x-session-id: YOUR_SESSION_ID` (required if using a stable user API key)

**Request Body:**
```json
{
  "to": "919876543210",
  "text": "Hello from SAK WhatsApp API!"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "messageId": "3EB0C...",
    "status": "sent"
  }
}
```

### POST /messages/send-image
Send an image with optional caption.

**Headers:** 
- `x-api-key: YOUR_API_KEY`
- `x-session-id: YOUR_SESSION_ID` (required if using a stable user API key)
- `Content-Type: multipart/form-data`

**Form Data:**
- `to`: "919876543210"
- `caption`: "Check this out!" (optional)
- `image`: File upload

**Response (200):**
```json
{
  "success": true,
  "data": {
    "messageId": "3EB0C...",
    "status": "sent"
  }
}
```

### POST /messages/send-document
Send a document with optional caption.

**Headers:**
- `x-api-key: YOUR_API_KEY`
- `x-session-id: YOUR_SESSION_ID` (required if using a stable user API key)
- `Content-Type: multipart/form-data`

**Form Data:**
- `to`: "919876543210"
- `caption`: "Important document" (optional)
- `document`: File upload

Notes:
- The API passes through the uploaded file `mimetype` to WhatsApp.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "messageId": "3EB0C...",
    "status": "sent"
  }
}
```

### POST /messages/send-video
Send a video with optional caption.

**Headers:**
- `x-api-key: YOUR_API_KEY`
- `x-session-id: YOUR_SESSION_ID` (required if using a stable user API key)
- `Content-Type: multipart/form-data`

**Form Data:**
- `to`: "919876543210"
- `caption`: "Optional caption" (optional)
- `video`: File upload

**Response (200):**
```json
{
  "success": true,
  "data": {
    "messageId": "3EB0C...",
    "status": "sent"
  }
}
```

### GET /messages/history
Get message history for session.

**Headers:** `x-api-key: YOUR_API_KEY`

**Query Parameters:**
- `limit`: Number of messages (default: 50)
- `offset`: Offset for pagination (default: 0)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "message_id": "3EB0C...",
        "to_number": "919876543210",
        "message_type": "text",
        "status": "sent",
        "created_at": "2025-12-12T00:00:00.000Z"
      }
    ]
  }
}
```

---

## 🔔 Webhooks

### POST /webhooks
Create a new webhook.

**Headers:** `Authorization: Bearer TOKEN`

**Request Body:**
```json
{
  "sessionId": "abc-123",
  "url": "https://your-domain.com/webhook",
  "events": [
    "message.received",
    "session.connected",
    "session.disconnected"
  ]
}
```

**Notes on events:**
- Recommended canonical event name: `message.received`
- Aliases accepted by the API: `message` (treated as `message.received`), `session` (treated as `session.status`)

**Response (201):**
```json
{
  "success": true,
  "data": {
    "webhookId": "webhook-uuid",
    "url": "https://your-domain.com/webhook",
    "secret": "webhook_secret_for_verification",
    "events": ["message.received", "session.connected"]
  }
}
```

### GET /webhooks
Get all webhooks.

**Headers:** `Authorization: Bearer TOKEN`

**Query Parameters:**
- `sessionId`: Filter by session (optional)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "webhooks": [
      {
        "id": "webhook-uuid",
        "session_id": "abc-123",
        "url": "https://your-domain.com/webhook",
        "events": ["message.received"],
        "is_active": true,
        "failed_attempts": 0,
        "created_at": "2025-12-12T00:00:00.000Z"
      }
    ]
  }
}
```

### PUT /webhooks/:webhookId
Update webhook configuration.

**Headers:** `Authorization: Bearer TOKEN`

**Request Body:**
```json
{
  "url": "https://new-url.com/webhook",
  "events": ["message.received"],
  "isActive": true
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Webhook updated successfully"
}
```

### DELETE /webhooks/:webhookId
Delete a webhook.

**Headers:** `Authorization: Bearer TOKEN`

**Response (200):**
```json
{
  "success": true,
  "message": "Webhook deleted successfully"
}
```

#### Webhook Payload Example
When an event occurs, your webhook URL will receive:

```json
{
  "event": "message.received",
  "sessionId": "abc-123",
  "from": "919876543210@s.whatsapp.net",
  "messageId": "3EB0C...",
  "timestamp": 1702389234,
  "type": "conversation",
  "text": "Hello!"
}
```

**Headers sent to your webhook:**
- `Content-Type: application/json`
- `X-Webhook-Secret: your_webhook_secret`
- `X-Webhook-Signature: sha256=<hex_hmac_of_raw_json_body>`
- `X-Webhook-Event: message.received`

---

## 📊 Analytics

### GET /analytics/usage
Get usage statistics.

**Headers:** `Authorization: Bearer TOKEN`

**Query Parameters:**
- `startDate`: YYYY-MM-DD (optional)
- `endDate`: YYYY-MM-DD (optional)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "daily": [
      {
        "date": "2025-12-12",
        "messages_sent": 150,
        "messages_received": 75,
        "messages_failed": 2,
        "api_calls": 200
      }
    ],
    "summary": {
      "totalMessagesSent": 5000,
      "totalMessagesReceived": 2500,
      "totalMessagesFailed": 10,
      "totalApiCalls": 6000
    }
  }
}
```

### GET /analytics/sessions
Get session analytics.

**Headers:** `Authorization: Bearer TOKEN`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "session_id": "abc-123",
        "name": "My Business",
        "status": "connected",
        "phone_number": "919876543210",
        "created_at": "2025-12-10T00:00:00.000Z",
        "messageStats": {
          "total": 225,
          "sent": 150,
          "failed": 2
        }
      }
    ]
  }
}
```

### GET /analytics/activity
Get activity logs.

**Headers:** `Authorization: Bearer TOKEN`

**Query Parameters:**
- `limit`: Number of logs (default: 50)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "action": "user.login",
        "metadata": {},
        "ip_address": "192.168.1.1",
        "created_at": "2025-12-12T00:00:00.000Z"
      }
    ]
  }
}
```

---

## 🔧 Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `NO_TOKEN` | 401 | Authentication token missing |
| `INVALID_TOKEN` | 401 | Invalid or expired token |
| `NO_API_KEY` | 401 | API key missing |
| `INVALID_API_KEY` | 403 | Invalid or inactive API key |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `USER_EXISTS` | 409 | User already registered |
| `SESSION_LIMIT_REACHED` | 403 | Plan session limit exceeded |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## 📝 Rate Limiting

- **Default**: 100 requests per minute per user
- **API Key**: 1000 requests per minute per session
- **Auth endpoints**: 5 requests per minute

Rate limit headers in response:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset timestamp

---

## 🔗 SDKs and Examples

### cURL Examples

**Send Message:**
```bash
curl -X POST https://api.sakwhatsapp.com/api/v1/messages/send \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to": "919876543210", "text": "Hello!"}'
```

### Node.js Example
```javascript
const axios = require('axios');

const sendMessage = async () => {
  const response = await axios.post(
    'https://api.sakwhatsapp.com/api/v1/messages/send',
    {
      to: '919876543210',
      text: 'Hello from Node.js!'
    },
    {
      headers: {
        'x-api-key': 'YOUR_API_KEY'
      }
    }
  );
  console.log(response.data);
};
```

### Python Example
```python
import requests

def send_message():
    response = requests.post(
        'https://api.sakwhatsapp.com/api/v1/messages/send',
        json={
            'to': '919876543210',
            'text': 'Hello from Python!'
        },
        headers={
            'x-api-key': 'YOUR_API_KEY'
        }
    )
    print(response.json())
```

---

For more information, visit: https://docs.sakwhatsapp.com
