#!/bin/bash

# Simulate a WhatsApp message webhook from SAK API
curl -X POST http://localhost:4000/api/webhooks/sak \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: sha256=$(echo -n '{"event":"message.received","sessionId":"66522fff-614c-4307-9bd7-0a38c5ee13d9","from_number":"1234567890","text":"hello test","pushName":"Test User","messageId":"msg123","timestamp":1703328000}' | openssl dgst -sha256 -hmac "8bb6c4ecd3720a6a811f3055e168a5ac4494a2a96bd8c5e4fd0e7e029dc1168d" -binary | xxd -p -c 256)" \
  -d '{
    "event": "message.received",
    "sessionId": "66522fff-614c-4307-9bd7-0a38c5ee13d9",
    "from_number": "1234567890",
    "text": "hello test",
    "pushName": "Test User",
    "messageId": "msg123",
    "timestamp": 1703328000
  }'
