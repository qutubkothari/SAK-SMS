import hmac
import hashlib
import json
import requests
from datetime import datetime

now = datetime.now()
payload = {
    "event": "message.received",
    "sessionId": "66522fff-614c-4307-9bd7-0a38c5ee13d9",
    "from_number": "+919876543210",
    "text": f"Real enquiry at {now.isoformat()}: Need 2000 CFM kitchen exhaust fan with 2HP motor",
    "pushName": "Mustafa Test",
    "messageId": f"msg-{now.timestamp()}"
}

payload_str = json.dumps(payload)
secret = "8bb6c4ecd3720a6a811f3055e168a5ac4494a2a96bd8c5e4fd0e7e029dc1168d"
signature = hmac.new(secret.encode(), payload_str.encode(), hashlib.sha256).hexdigest()

print(f"Sending test from +919876543210...")
print(f"Message: {payload['text'][:80]}...")

response = requests.post(
    "http://localhost:4000/api/webhooks/sak",
    json=payload,
    headers={"x-webhook-signature": signature}
)

print(f"\nStatus: {response.status_code}")
print(f"Response: {response.text}")

if response.status_code == 200:
    print("\n✅ Message successfully sent to CRM!")
    print("Check your dashboard at http://13.203.69.128")
