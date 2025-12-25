import hmac
import hashlib
import json
import requests

payload = {
    "event": "message.received",
    "sessionId": "66522fff-614c-4307-9bd7-0a38c5ee13d9",
    "from_number": "+917737845253",
    "text": "Test: Need pricing for 18 inch heavy duty exhaust fan",
    "pushName": "Test Customer",
    "messageId": "test-msg-002"
}

payload_str = json.dumps(payload)
print(f"Payload: {payload_str}")
secret = "8bb6c4ecd3720a6a811f3055e168a5ac4494a2a96bd8c5e4fd0e7e029dc1168d"
signature = hmac.new(secret.encode(), payload_str.encode(), hashlib.sha256).hexdigest()

print(f"Sending webhook with signature: {signature[:20]}...")
response = requests.post(
    "http://localhost:4000/api/webhooks/sak",
    json=payload,
    headers={"x-webhook-signature": signature}
)

print(f"Status: {response.status_code}")
print(f"Response: {response.text}")
