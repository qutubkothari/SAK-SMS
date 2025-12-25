import requests
import json

SAK_API_URL = "http://13.201.102.10/api/v1"

# You need to provide your credentials from the web console
# These should be the credentials you use to login at http://13.201.102.10
EMAIL = input("Enter your SAK WhatsApp API email: ")
PASSWORD = input("Enter your SAK WhatsApp API password: ")

def login():
    """Login to get JWT token"""
    url = f"{SAK_API_URL}/auth/login"
    payload = {
        "email": EMAIL,
        "password": PASSWORD
    }
    
    print(f"🔐 Logging in to SAK WhatsApp API...")
    
    response = requests.post(url, json=payload)
    
    if response.ok:
        data = response.json()
        jwt_token = data['data']['token']
        user = data['data']['user']
        print(f"✅ Logged in as: {user.get('email')}")
        return jwt_token
    else:
        print(f"❌ Login failed: {response.text}")
        return None

def get_sessions(jwt_token):
    """Get list of WhatsApp sessions and their API keys"""
    url = f"{SAK_API_URL}/sessions"
    headers = {
        "Authorization": f"Bearer {jwt_token}"
    }
    
    print(f"\n📱 Fetching WhatsApp sessions...")
    
    response = requests.get(url, headers=headers)
    
    if response.ok:
        data = response.json()
        sessions = data.get('data', [])
        
        print(f"✅ Found {len(sessions)} session(s)\n")
        
        for session in sessions:
            print(f"📌 Session: {session.get('name', 'Unnamed')}")
            print(f"   ID: {session.get('id')}")
            print(f"   Status: {session.get('status')}")
            print(f"   API Key: {session.get('api_key', 'N/A')}")
            print()
        
        return sessions
    else:
        print(f"❌ Failed to get sessions: {response.text}")
        return []

def send_message_with_jwt(jwt_token, api_key, phone, text):
    """Send WhatsApp message"""
    url = f"{SAK_API_URL}/messages/send"
    
    headers = {
        "Authorization": f"Bearer {jwt_token}",
        "x-api-key": api_key,
        "Content-Type": "application/json"
    }
    
    payload = {
        "to": phone,
        "text": text
    }
    
    print(f"📤 Sending WhatsApp message to {phone}...")
    
    response = requests.post(url, headers=headers, json=payload)
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}\n")
    
    return response.ok

if __name__ == "__main__":
    print("="*60)
    print("🚀 SAK WhatsApp API - Send Message Test")
    print("="*60)
    print()
    
    # Step 1: Login
    jwt_token = login()
    if not jwt_token:
        print("\n❌ Cannot proceed without authentication")
        exit(1)
    
    # Step 2: Get sessions and API keys
    sessions = get_sessions(jwt_token)
    if not sessions:
        print("\n❌ No sessions found. Create a session in the web console first.")
        exit(1)
    
    # Step 3: Use first connected session
    connected_session = None
    for session in sessions:
        if session.get('status') == 'connected':
            connected_session = session
            break
    
    if not connected_session:
        print("\n❌ No connected sessions found. Connect your WhatsApp in the web console.")
        print("   Visit: http://13.201.102.10")
        exit(1)
    
    api_key = connected_session.get('api_key')
    print(f"✅ Using connected session: {connected_session.get('name')}")
    print(f"   API Key: {api_key}\n")
    
    # Step 4: Send test message
    TEST_PHONE = "917737845253"
    TEST_MESSAGE = """🎉 Hello from SAK CRM!

This is a test message to verify WhatsApp integration.

✅ Your CRM can now send WhatsApp messages!

Reply to test two-way communication."""
    
    success = send_message_with_jwt(jwt_token, api_key, TEST_PHONE, TEST_MESSAGE)
    
    print("="*60)
    if success:
        print("✅ TEST PASSED! Check WhatsApp on +917737845253")
    else:
        print("❌ TEST FAILED! Check the error message above")
    print("="*60)
