#!/usr/bin/env python3
"""
Test sending WhatsApp message through CRM API
"""

import requests
import json

CRM_URL = "http://13.203.69.128:3001"
PHONE = "917737845253"

print("=" * 60)
print("Testing WhatsApp Integration Through CRM")
print("=" * 60)

# Step 1: Check if lead exists for this phone number
print("\n1️⃣ Checking for existing lead...")
try:
    # Search leads by phone
    response = requests.get(
        f"{CRM_URL}/api/leads",
        params={"search": PHONE},
        timeout=10
    )
    print(f"   Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        leads = data.get('leads', [])
        
        if leads:
            lead = leads[0]
            lead_id = lead['id']
            print(f"   ✅ Found lead: {lead['name']} (ID: {lead_id})")
            print(f"   Phone: {lead.get('phone', 'N/A')}")
            
            # Step 2: Send message through CRM
            print("\n2️⃣ Sending WhatsApp message through CRM API...")
            
            message_data = {
                "channel": "WHATSAPP",
                "content": "🤖 Test message from CRM Dashboard!\n\n✅ This message was sent through the CRM's send-message endpoint.\n\nYour WhatsApp integration is fully operational! 🎉"
            }
            
            send_response = requests.post(
                f"{CRM_URL}/api/leads/{lead_id}/send-message",
                json=message_data,
                timeout=10
            )
            
            print(f"   Status: {send_response.status_code}")
            print(f"   Response:")
            print(json.dumps(send_response.json(), indent=2))
            
            if send_response.status_code == 200:
                print("\n   ✅ Message sent successfully through CRM!")
                print(f"   📱 Check WhatsApp: +{PHONE}")
            else:
                print(f"\n   ❌ Failed to send message")
                
        else:
            print(f"   ⚠️ No lead found for phone: {PHONE}")
            print("   Creating lead first...")
            
            # Create lead
            lead_data = {
                "name": "Test Lead",
                "phone": f"+{PHONE}",
                "channel": "WHATSAPP",
                "message": "Initial test contact"
            }
            
            create_response = requests.post(
                f"{CRM_URL}/api/leads",
                json=lead_data,
                timeout=10
            )
            
            if create_response.status_code == 201:
                new_lead = create_response.json()
                lead_id = new_lead['id']
                print(f"   ✅ Created lead ID: {lead_id}")
                
                # Now send message
                print("\n2️⃣ Sending WhatsApp message...")
                message_data = {
                    "channel": "WHATSAPP",
                    "content": "🤖 Test message from CRM Dashboard!\n\n✅ Your lead was just created and this is the first message.\n\nWhatsApp integration working! 🎉"
                }
                
                send_response = requests.post(
                    f"{CRM_URL}/api/leads/{lead_id}/send-message",
                    json=message_data,
                    timeout=10
                )
                
                print(f"   Status: {send_response.status_code}")
                print(f"   Response:")
                print(json.dumps(send_response.json(), indent=2))
                
    else:
        print(f"   ❌ Failed to query leads: {response.status_code}")
        
except Exception as e:
    print(f"   ❌ ERROR: {str(e)}")

print("\n" + "=" * 60)
print("Test Complete!")
print("=" * 60)
