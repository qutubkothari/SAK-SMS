import requests
import hmac
import hashlib
import json
import time

# Test payload - exact format
payload = {
    "event": "message.received",
    "sessionId": "b41a47f9-b58f-4aaa-9af0-2f7c65e7e95a",
    "from_number": "917737845253",
    "text": "Test message from new WhatsApp session",
    "pushName": "Test User",
    "messageId": "test_msg_" + str(int(time.time())),
    "timestamp": int(time.time())
}

# Calculate signature using the exact JSON string that will be sent
webhook_secret = "b39c29c41efe4215ed8bb69db17147e1922bdd574b185c3965f0d6b9f561b3e9"
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

