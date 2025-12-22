#!/usr/bin/env bash
set -euo pipefail

# One-time provisioning helper (run on the EC2 instance).
# Assumes Ubuntu/Debian. You can run this as: sudo bash deploy/ec2/bootstrap.sh

APP_DIR=${APP_DIR:-/opt/sak-ai-enquiry-handler}
REPO_URL=${REPO_URL:-""}
BRANCH=${BRANCH:-main}

if [ -z "$REPO_URL" ]; then
  echo "ERROR: Set REPO_URL (e.g. https://github.com/<owner>/<repo>.git)" >&2
  exit 1
fi

apt-get update -y
apt-get install -y git ca-certificates curl nginx

# Node.js 20 (NodeSource)
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# pm2 for process management
if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi

mkdir -p "$APP_DIR"

if [ ! -d "$APP_DIR/.git" ]; then
  git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$APP_DIR"
else
  cd "$APP_DIR"
  git fetch --all --prune
  git checkout "$BRANCH" || true
  git reset --hard "origin/$BRANCH"
fi

cd "$APP_DIR"

echo "==> Install deps + initial build"
npm ci
npm run -ws build

echo "==> Configure Nginx (port 80)"
mkdir -p /var/www/sak-sms
cp -r apps/web/dist/* /var/www/sak-sms/

cp deploy/ec2/nginx-site.conf /etc/nginx/sites-available/sak-sms
ln -sf /etc/nginx/sites-available/sak-sms /etc/nginx/sites-enabled/sak-sms
rm -f /etc/nginx/sites-enabled/default || true
nginx -t
systemctl enable nginx
systemctl restart nginx

echo "==> Done. Next: create apps/api/.env (DATABASE_URL etc) and run deploy/ec2/remote-deploy.sh"
