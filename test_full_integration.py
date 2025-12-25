#!/usr/bin/env python3
"""
Test WhatsApp message sending via CRM API (correct port)
"""

import requests
import json

API_URL = "http://localhost:4000"
PHONE = "+917737845253"

print("=" * 70)
print("🧪 Testing CRM WhatsApp Integration")
print("=" * 70)

# Step 1: Send a test webhook to simulate incoming message
print("\n1️⃣ Simulating incoming WhatsApp message...")
webhook_payload = {
    "event": "message.received",
    "sessionId": "3116b145-8208-42d5-8be8-f22ef1ecfd62",
    "data": {
        "from": "917737845253",
        "name": "Test User",
        "message": {
            "text": "Hello! I want to test the CRM integration.",
            "timestamp": "2025-12-25T12:00:00Z"
        }
    }
}

try:
    webhook_response = requests.post(
        f"{API_URL}/api/webhooks/sak",
        json=webhook_payload,
        headers={"x-webhook-secret": "78f48d937b10551a8dec917ff869cc31ad842c3db18eaacac34563537cd73fe5"},
        timeout=10
    )
    print(f"   Status: {webhook_response.status_code}")
    if webhook_response.status_code == 200:
        print("   ✅ Webhook processed - Lead should be created/updated")
    else:
        print(f"   Response: {webhook_response.text}")
        
except Exception as e:
    print(f"   ❌ Error: {str(e)}")

# Step 2: List leads to find the one we just created
print("\n2️⃣ Finding lead by phone number...")
try:
    leads_response = requests.get(
        f"{API_URL}/api/leads",
        params={"limit": 100},
        timeout=10
    )
    
    if leads_response.status_code == 200:
        leads_data = leads_response.json()
        leads = leads_data.get('leads', [])
        
        # Find lead with matching phone
        matching_lead = None
        for lead in leads:
            if lead.get('phone') and '7737845253' in lead['phone']:
                matching_lead = lead
                break
        
        if matching_lead:
            lead_id = matching_lead['id']
            print(f"   ✅ Found lead: {matching_lead.get('name', 'Unknown')} (ID: {lead_id})")
            print(f"   Phone: {matching_lead.get('phone', 'N/A')}")
            print(f"   Score: {matching_lead.get('score', 0)}")
            
            # Step 3: Send WhatsApp message through CRM
            print(f"\n3️⃣ Sending WhatsApp reply via CRM API...")
            
            message_payload = {
                "channel": "WHATSAPP",
                "content": "🎉 *CRM Integration Test Successful!*\n\n✅ This message was sent through the CRM's `/leads/{id}/send-message` endpoint.\n\n🔹 Your lead was received\n🔹 AI scored your message\n🔹 WhatsApp reply sent automatically\n\nTwo-way communication is working! 💬"
            }
            
            send_response = requests.post(
                f"{API_URL}/api/leads/{lead_id}/send-message",
                json=message_payload,
                timeout=10
            )
            
            print(f"   Status: {send_response.status_code}")
            
            if send_response.status_code == 200:
                result = send_response.json()
                print(f"   ✅ Message sent successfully!")
                print(f"   Response: {json.dumps(result, indent=2)}")
                print(f"\n   📱 Check WhatsApp on {PHONE}")
            else:
                print(f"   ❌ Failed: {send_response.text}")
                
        else:
            print(f"   ⚠️ No lead found for {PHONE}")
            print(f"   Total leads in system: {len(leads)}")
            
    else:
        print(f"   ❌ Failed to list leads: {leads_response.status_code}")
        
except Exception as e:
    print(f"   ❌ Error: {str(e)}")

print("\n" + "=" * 70)
print("✅ Test Complete! Check your WhatsApp for the message.")
print("=" * 70)
