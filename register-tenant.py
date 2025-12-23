import requests

payload = {
    "tenantId": "1",
    "name": "Default Tenant",
    "sessionId": "66522fff-614c-4307-9bd7-0a38c5ee13d9",
    "apiKey": "47a514a955e5c53a39bb5d7506841a7e79b8e1e000a7a2d8c80533c769e27058",
    "webhookSecret": "8bb6c4ecd3720a6a811f3055e168a5ac4494a2a96bd8c5e4fd0e7e029dc1168d",
    "crmWebhookUrl": "http://13.203.69.128/api/ingest/message",
    "mode": "session",
    "apiKeyMode": "session"
}

r = requests.post('http://localhost:3001/api/admin/tenants', json=payload, headers={'x-admin-token': 'change-me-now'})
print(f"Status: {r.status_code}")
print(r.text)
