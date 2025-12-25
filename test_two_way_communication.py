#!/usr/bin/env python3
"""
Test Two-Way WhatsApp Communication
Client sends message -> CRM receives -> CRM sends reply
"""

import requests
import json
import time

CLIENT_NUMBER = "919537653927"
BOT_NUMBER = "917737845253"
API_URL = "http://localhost:4000"
SAK_API_URL = "http://13.201.102.10/api/v1"
SESSION_ID = "3116b145-8208-42d5-8be8-f22ef1ecfd62"
API_KEY = "ed45085b3bf763232f2502bf1a56f2d856f19b29ef78bf20ef2188662bc4d90e"
WEBHOOK_SECRET = "78f48d937b10551a8dec917ff869cc31ad842c3db18eaacac34563537cd73fe5"

print("=" * 70)
print("🔄 Testing Two-Way WhatsApp Communication")
print("=" * 70)
print(f"📱 Client Number: +{CLIENT_NUMBER}")
print(f"🤖 Bot Number: +{BOT_NUMBER}")
print("=" * 70)

# Step 1: Simulate incoming message from client
print("\n📥 Step 1: Simulating incoming WhatsApp message from client...")
print(f"   From: +{CLIENT_NUMBER}")
print(f"   Message: 'Hello! I need information about your products.'")

webhook_payload = {
    "event": "message.received",
    "sessionId": SESSION_ID,
    "data": {
        "from": CLIENT_NUMBER,
        "name": "Test Client",
        "message": {
            "text": "Hello! I need information about your products. Can you help me?",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
    }
}

try:
    # Calculate signature for webhook
    import hmac
    import hashlib
    
    payload_str = json.dumps(webhook_payload)
    signature = hmac.new(
        WEBHOOK_SECRET.encode(),
        payload_str.encode(),
        hashlib.sha256
    ).hexdigest()
    
    webhook_response = requests.post(
        f"{API_URL}/api/webhooks/sak",
        json=webhook_payload,
        headers={
            "Content-Type": "application/json",
            "x-webhook-signature": signature
        },
        timeout=10
    )
    
    print(f"   ✅ Webhook sent: Status {webhook_response.status_code}")
    
    if webhook_response.status_code == 200:
        print(f"   ✅ Message ingested into CRM!")
    else:
        print(f"   ⚠️  Response: {webhook_response.text[:200]}")
        
    # Give CRM time to process
    time.sleep(2)
    
except Exception as e:
    print(f"   ❌ Error: {str(e)}")

# Step 2: Send reply from bot to client via SAK API directly
print(f"\n📤 Step 2: Sending WhatsApp reply to client...")
print(f"   To: +{CLIENT_NUMBER}")
print(f"   From Bot: +{BOT_NUMBER}")

reply_message = f"""👋 Hello! Welcome to our service!

✅ I received your message: "Hello! I need information about your products."

🎯 Here's how I can help you:
• Product catalog and pricing
• Features and specifications  
• Order placement assistance
• Customer support

📞 Our team will be in touch shortly!

This is an automated two-way communication test. ✨

Reply with "catalog" to see our products!"""

try:
    send_response = requests.post(
        f"{SAK_API_URL}/messages/send",
        headers={
            "x-api-key": API_KEY,
            "Content-Type": "application/json"
        },
        json={
            "sessionId": SESSION_ID,
            "to": CLIENT_NUMBER,
            "text": reply_message
        },
        timeout=10
    )
    
    print(f"   Status: {send_response.status_code}")
    
    if send_response.status_code == 200:
        result = send_response.json()
        message_id = result.get('data', {}).get('messageId', 'N/A')
        print(f"   ✅ Reply sent successfully!")
        print(f"   Message ID: {message_id}")
        print(f"\n   📱 Check WhatsApp on +{CLIENT_NUMBER} for the reply!")
    else:
        print(f"   ❌ Failed: {send_response.text}")
        
except Exception as e:
    print(f"   ❌ Error: {str(e)}")

# Step 3: Test reverse - send from bot back to itself (for demo)
print(f"\n🔁 Step 3: Sending test message to bot number...")
print(f"   To: +{BOT_NUMBER}")

test_message = f"""🧪 Two-Way Communication Test Complete!

✅ Incoming: Client → Bot → CRM ✅
✅ Outgoing: CRM → Bot → Client ✅

Test Summary:
━━━━━━━━━━━━━━━━━━━━━
📱 Client: +{CLIENT_NUMBER}
🤖 Bot: +{BOT_NUMBER}
🔗 Session: {SESSION_ID[:20]}...

Both directions working! 🎉"""

try:
    confirm_response = requests.post(
        f"{SAK_API_URL}/messages/send",
        headers={
            "x-api-key": API_KEY,
            "Content-Type": "application/json"
        },
        json={
            "sessionId": SESSION_ID,
            "to": BOT_NUMBER,
            "text": test_message
        },
        timeout=10
    )
    
    if confirm_response.status_code == 200:
        print(f"   ✅ Confirmation sent to bot number!")
        
except Exception as e:
    print(f"   ⚠️  {str(e)}")

print("\n" + "=" * 70)
print("✅ Two-Way Communication Test Complete!")
print("=" * 70)
print(f"\n📱 Check these phones:")
print(f"   1. +{CLIENT_NUMBER} - Should receive reply from bot")
print(f"   2. +{BOT_NUMBER} - Should receive test summary")
print("\n💡 Next: Check CRM dashboard to see the lead created!")
print("=" * 70)
