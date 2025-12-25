#!/usr/bin/env python3
"""
Test WhatsApp message sending with new API credentials
"""

import requests
import json

# New credentials
API_KEY = "ed45085b3bf763232f2502bf1a56f2d856f19b29ef78bf20ef2188662bc4d90e"
SESSION_ID = "3116b145-8208-42d5-8be8-f22ef1ecfd62"
API_URL = "http://13.201.102.10/api/v1"

# Test message
PHONE = "917737845253"
MESSAGE = """🎉 Hello from SAK CRM!

✅ Your WhatsApp integration is now working!

This is a test message sent using your new API credentials.

Session ID: 3116b145-8208-42d5-8be8-f22ef1ecfd62

Reply to this message to test two-way communication! 💬"""

print("=" * 60)
print("Testing WhatsApp Message Send with New Credentials")
print("=" * 60)
print(f"API URL: {API_URL}")
print(f"Session ID: {SESSION_ID}")
print(f"API Key: {API_KEY[:20]}...{API_KEY[-20:]}")
print(f"To: {PHONE}")
print("=" * 60)

try:
    response = requests.post(
        f"{API_URL}/messages/send",
        headers={
            "x-api-key": API_KEY,
            "Content-Type": "application/json"
        },
        json={
            "sessionId": SESSION_ID,
            "to": PHONE,
            "text": MESSAGE
        },
        timeout=10
    )
    
    print(f"\n📡 Response Status: {response.status_code}")
    print(f"📄 Response Body:")
    print(json.dumps(response.json(), indent=2))
    
    if response.status_code == 200:
        print("\n✅ SUCCESS! Message sent to WhatsApp!")
        print(f"📱 Check phone number: +{PHONE}")
    else:
        print(f"\n❌ FAILED with status {response.status_code}")
        
except Exception as e:
    print(f"\n❌ ERROR: {str(e)}")

print("=" * 60)
