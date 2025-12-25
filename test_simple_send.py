#!/usr/bin/env python3
"""
Simple direct test: Send WhatsApp via CRM using internal DB query
"""

import requests
import json

print("=" * 70)
print("📱 Testing WhatsApp Send via CRM API")
print("=" * 70)

# Direct API call - find existing lead with this phone and send message
phone = "917737845253"

print(f"\n🔍 Step 1: Search for lead with phone containing '{phone}'...")

try:
    # Try to find lead via different methods
    response = requests.get(
        "http://localhost:4000/api/leads?limit=100",
        timeout=10
    )
    
    if response.status_code == 404:
        print("   ℹ️  /api/leads endpoint not found, trying admin endpoint...")
        
        # Try admin endpoint
        response = requests.get(
            "http://localhost:4000/api/admin/leads",
            headers={"x-admin-token": "change-me-now"},
            timeout=10
        )
    
    if response.status_code == 200:
        data = response.json()
        leads = data.get('leads', data if isinstance(data, list) else [])
        
        print(f"   ✅ Got {len(leads)} leads")
        
        # Find matching lead
        matching_lead = None
        for lead in leads:
            lead_phone = str(lead.get('phone', ''))
            if phone in lead_phone or phone.replace('+', '') in lead_phone:
                matching_lead = lead
                break
        
        if matching_lead:
            lead_id = matching_lead['id']
            lead_name = matching_lead.get('name', 'Unknown')
            print(f"   ✅ Found lead: {lead_name} (ID: {lead_id})")
            print(f"      Phone: {matching_lead.get('phone')}")
            
            # Send message
            print(f"\n💬 Step 2: Sending WhatsApp message to lead {lead_id}...")
            
            message_data = {
                "channel": "WHATSAPP",
                "content": "🎉 *Full Integration Test*\n\n✅ Message sent from CRM API\n📱 WhatsApp delivery confirmed\n🤖 Two-way communication working!\n\nReply to test incoming messages. 💬"
            }
            
            send_resp = requests.post(
                f"http://localhost:4000/api/leads/{lead_id}/send-message",
                json=message_data,
                timeout=15
            )
            
            print(f"   Status: {send_resp.status_code}")
            
            if send_resp.status_code == 200:
                result = send_resp.json()
                print(f"   ✅ SUCCESS! Message sent to WhatsApp")
                print(f"   Response: {json.dumps(result, indent=2)}")
                print(f"\n📱 Check phone +{phone} for the message!")
            elif send_resp.status_code == 401:
                print(f"   ❌ Authentication required")
                print(f"   Response: {send_resp.text}")
            else:
                print(f"   ❌ Failed with status {send_resp.status_code}")
                print(f"   Response: {send_resp.text}")
        else:
            print(f"   ⚠️  No lead found with phone {phone}")
            print(f"   Available leads: {[l.get('phone') for l in leads[:5]]}")
    else:
        print(f"   ❌ Failed to get leads: Status {response.status_code}")
        print(f"   Response: {response.text[:200]}")
        
except Exception as e:
    print(f"   ❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 70)
