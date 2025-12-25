import requests
import json

# Configuration from .env
SAK_API_URL = "http://13.201.102.10/api/v1"
SAK_API_KEY = "47a514a955e5c53a39bb5d7506841a7e79b8e1e000a7a2d8c80533c769e27058"
SESSION_ID = "66522fff-614c-4307-9bd7-0a38c5ee13d9"

# Phone number to test (your WhatsApp number)
TEST_PHONE = "917737845253"  # Without + prefix as per docs

def send_whatsapp_message(to, text):
    """Send WhatsApp message using SAK API"""
    url = f"{SAK_API_URL}/messages/send"
    
    headers = {
        "x-api-key": SAK_API_KEY,
        "Content-Type": "application/json"
    }
    
    payload = {
        "to": to,
        "text": text
    }
    
    print(f"📤 Sending WhatsApp message to {to}...")
    print(f"URL: {url}")
    print(f"Message: {text[:50]}...")
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        
        print(f"\n✅ Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.ok:
            print(f"\n🎉 SUCCESS! Message sent to WhatsApp!")
            return response.json()
        else:
            print(f"\n❌ FAILED: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        return None

if __name__ == "__main__":
    # Test message
    message = """🎉 Hello from SAK CRM!

This is a test message to verify WhatsApp integration is working.

✅ Incoming messages: Working
✅ Lead capture: Working  
✅ Outgoing messages: Testing now!

Reply to this message to test two-way communication."""

    result = send_whatsapp_message(TEST_PHONE, message)
    
    if result:
        print("\n" + "="*50)
        print("✅ WhatsApp Integration Test PASSED!")
        print("="*50)
        print("\nCheck your WhatsApp on +917737845253")
        print("You should receive the test message!")
    else:
        print("\n" + "="*50)
        print("❌ WhatsApp Integration Test FAILED")
        print("="*50)
        print("\nPossible issues:")
        print("- SAK API key incorrect")
        print("- Session not connected in web console")
        print("- Phone number format wrong")
