import requests
import hmac
import hashlib
import json

# Test payload - exact format
payload = {
    "event": "message.received",
    "sessionId": "66522fff-614c-4307-9bd7-0a38c5ee13d9",
    "from_number": "9876543210",
    "text": "Hello from WhatsApp test",
    "pushName": "Test User",
    "messageId": "test_msg_123",
    "timestamp": 1703328000
}

# Calculate signature using the exact JSON string that will be sent
webhook_secret = "8bb6c4ecd3720a6a811f3055e168a5ac4494a2a96bd8c5e4fd0e7e029dc1168d"
payload_bytes = json.dumps(payload).encode('utf-8')
signature = hmac.new(
    webhook_secret.encode('utf-8'),
    payload_bytes,
    hashlib.sha256
).hexdigest()

# Send request
url = "http://localhost:4000/api/webhooks/sak"
headers = {
    "Content-Type": "application/json",
    "x-webhook-signature": f"sha256={signature}"
}

print(f"Testing webhook: {url}")
print(f"Payload bytes: {payload_bytes}")
print(f"Signature: sha256={signature}")
print()

response = requests.post(url, data=payload_bytes, headers=headers)
print(f"Status: {response.status_code}")
print(f"Response: {response.text}")

