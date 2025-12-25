import os
import psycopg2
from datetime import datetime

# Load DATABASE_URL from .env
env_path = '/opt/sak-ai-enquiry-handler/apps/api/.env'
with open(env_path) as f:
    for line in f:
        if line.startswith('DATABASE_URL='):
            db_url = line.strip().split('=', 1)[1]
            break

# Connect and query
conn = psycopg2.connect(db_url)
cur = conn.cursor()

# Check lead
cur.execute('''
    SELECT id, "fullName", phone, channel, status, heat, score, "createdAt"
    FROM "Lead"
    WHERE phone = %s
    ORDER BY "createdAt" DESC
    LIMIT 1
''', ('+917737845253',))

lead = cur.fetchone()

if not lead:
    print('❌ No lead found for +917737845253')
else:
    print('\n✅ Lead Found:')
    print(f'ID: {lead[0]}')
    print(f'Name: {lead[1]}')
    print(f'Phone: {lead[2]}')
    print(f'Channel: {lead[3]}')
    print(f'Status: {lead[4]}')
    print(f'Heat: {lead[5]}')
    print(f'Score: {lead[6]}')
    print(f'Created: {lead[7]}')
    
    # Check messages
    cur.execute('''
        SELECT direction, body, channel, status, "createdAt"
        FROM "Message"
        WHERE "leadId" = %s
        ORDER BY "createdAt" DESC
        LIMIT 5
    ''', (lead[0],))
    
    messages = cur.fetchall()
    print(f'\n📨 Messages ({len(messages)}):')
    for i, msg in enumerate(messages):
        print(f'\n{i+1}. {msg[0]} message ({msg[4]}):')
        print(f'   Body: {msg[1][:100]}')
        print(f'   Channel: {msg[2]}')
        print(f'   Status: {msg[3]}')

cur.close()
conn.close()
