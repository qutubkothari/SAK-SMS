#!/usr/bin/env bash
set -euo pipefail

HOST_IP="${HOST_IP:-13.200.246.122}"
USER_NAME="${USER_NAME:-ubuntu}"
KEY_PATH="${KEY_PATH:-./sak-whatsapp-communicator.pem}"
REMOTE_DIR="${REMOTE_DIR:-~/whatsapp-communicator}"
APP_NAME="${APP_NAME:-whatsapp-communicator}"

TMP_TAR="/tmp/whatsapp-communicator-$(date +%Y%m%d-%H%M%S).tgz"

tar -czf "$TMP_TAR" --exclude="node_modules" --exclude="dist" --exclude=".env" --exclude="prisma/dev.db" --exclude="prisma/prisma/dev.db" .

scp -i "$KEY_PATH" "$TMP_TAR" "$USER_NAME@$HOST_IP:~/whatsapp-communicator.tgz"

ssh -i "$KEY_PATH" "$USER_NAME@$HOST_IP" "set -e; \
  mkdir -p $REMOTE_DIR; \
  if [ -f $REMOTE_DIR/.env ]; then cp $REMOTE_DIR/.env /tmp/whatsapp-communicator.env; fi; \
  if [ -f $REMOTE_DIR/prisma/prisma/dev.db ]; then mkdir -p /tmp/whatsapp-communicator-prisma/prisma/prisma && cp $REMOTE_DIR/prisma/prisma/dev.db /tmp/whatsapp-communicator-prisma/prisma/prisma/dev.db; fi; \
  if [ -f $REMOTE_DIR/prisma/dev.db ]; then mkdir -p /tmp/whatsapp-communicator-prisma/prisma && cp $REMOTE_DIR/prisma/dev.db /tmp/whatsapp-communicator-prisma/prisma/dev.db; fi; \
  rm -rf $REMOTE_DIR/*; \
  tar -xzf ~/whatsapp-communicator.tgz -C $REMOTE_DIR; \
  if [ -f /tmp/whatsapp-communicator.env ]; then cp /tmp/whatsapp-communicator.env $REMOTE_DIR/.env; fi; \
  if [ -f /tmp/whatsapp-communicator-prisma/prisma/prisma/dev.db ]; then mkdir -p $REMOTE_DIR/prisma/prisma && cp /tmp/whatsapp-communicator-prisma/prisma/prisma/dev.db $REMOTE_DIR/prisma/prisma/dev.db; fi; \
  if [ -f /tmp/whatsapp-communicator-prisma/prisma/dev.db ]; then mkdir -p $REMOTE_DIR/prisma && cp /tmp/whatsapp-communicator-prisma/prisma/dev.db $REMOTE_DIR/prisma/dev.db; fi; \
  cd $REMOTE_DIR; \
  npm i; \
  npm run prisma:generate; \
  npm run db:push; \
  npm run build; \
  pm2 delete $APP_NAME 2>/dev/null || true; \
  pm2 start dist/index.js --name $APP_NAME; \
  pm2 save"

echo "Done. Public health check: http://$HOST_IP/health"
