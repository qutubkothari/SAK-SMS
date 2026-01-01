#!/usr/bin/env bash
set -euo pipefail

APP_DIR=${APP_DIR:-/opt/sak-ai-enquiry-handler}
BRANCH=${BRANCH:-main}
REPO_URL=${REPO_URL:-""}

echo "==> Deploying into $APP_DIR (branch: $BRANCH)"

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node is not installed on the EC2 instance. Run deploy/ec2/bootstrap.sh once (recommended)." >&2
  exit 1
fi

if [ ! -d "$APP_DIR/.git" ]; then
  if [ -z "$REPO_URL" ]; then
    echo "ERROR: $APP_DIR is not initialized and REPO_URL is not set." >&2
    echo "Fix: run deploy/ec2/bootstrap.sh once OR set REPO_URL (e.g. https://github.com/qutubkothari/SAK-SMS.git)." >&2
    exit 1
  fi
  echo "==> First-time clone"
  mkdir -p "$APP_DIR"
  git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"

echo "==> Updating code"
git fetch --all --prune
# If the runner pushed a specific SHA, it will be checked out via reset later.
git checkout "$BRANCH" >/dev/null 2>&1 || true
git reset --hard "origin/$BRANCH"

echo "==> Installing dependencies"
# Use npm ci for reproducible installs
npm ci

echo "==> Ensuring DB (optional)"
# If Docker is installed, bring up postgres/redis. If not, continue.
if command -v docker >/dev/null 2>&1; then
  # Prefer compose plugin, then docker-compose.
  if docker compose version >/dev/null 2>&1; then
    docker compose up -d
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose up -d
  else
    echo "WARN: docker is present but compose is missing; skipping db:up"
  fi
else
  echo "WARN: docker not installed; skipping db:up"
fi

echo "==> Prisma generate + migrate deploy"
# Requires apps/api/.env (DATABASE_URL) to exist on the server.
( cd apps/api && npm run prisma:generate )
( cd apps/api && npm run prisma:deploy )

echo "==> Building"
# tsc/vite builds can OOM on small instances; set a bigger Node heap just for build.
# But don't exceed a safe fraction of system memory (can lock up small EC2 instances).
DEFAULT_BUILD_HEAP_MB=3072
BUILD_HEAP_MB=${NODE_BUILD_HEAP_MB:-$DEFAULT_BUILD_HEAP_MB}

if [ -r /proc/meminfo ]; then
  MEM_MB=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
  # Use up to ~75% of RAM for V8 heap to leave room for OS + other processes.
  SAFE_MB=$(( MEM_MB * 75 / 100 ))
  if [ -n "${MEM_MB:-}" ] && [ "$MEM_MB" -gt 0 ] && [ "$SAFE_MB" -gt 256 ]; then
    if [ "$BUILD_HEAP_MB" -gt "$SAFE_MB" ]; then
      echo "==> Adjusting build heap: requested ${BUILD_HEAP_MB}MB, system ${MEM_MB}MB -> using ${SAFE_MB}MB"
      BUILD_HEAP_MB=$SAFE_MB
    fi
  fi
fi
if [ -n "${NODE_OPTIONS:-}" ]; then
  export NODE_OPTIONS="$NODE_OPTIONS --max-old-space-size=$BUILD_HEAP_MB"
else
  export NODE_OPTIONS="--max-old-space-size=$BUILD_HEAP_MB"
fi

npm run -ws build

echo "==> Publish web to Nginx"
if command -v sudo >/dev/null 2>&1; then
  WEB_ROOT=${WEB_ROOT:-/var/www/html}
  NGINX_SITE_NAME=${NGINX_SITE_NAME:-sak-sms}
  NGINX_SITE_CONF=${NGINX_SITE_CONF:-deploy/ec2/nginx-site.conf}

  sudo mkdir -p "$WEB_ROOT"
  # Replace contents atomically-ish
  sudo rm -rf "$WEB_ROOT"/*
  sudo cp -r apps/web/dist/* "$WEB_ROOT"/

  if [ -f "$NGINX_SITE_CONF" ]; then
    sudo cp "$NGINX_SITE_CONF" "/etc/nginx/sites-available/$NGINX_SITE_NAME"
    sudo ln -sf "/etc/nginx/sites-available/$NGINX_SITE_NAME" "/etc/nginx/sites-enabled/$NGINX_SITE_NAME"

    # On shared servers, don't disable other sites by default.
    if [ "${REMOVE_DEFAULT_SITE:-0}" = "1" ]; then
      sudo rm -f /etc/nginx/sites-enabled/default || true
    fi

    sudo nginx -t
    sudo systemctl reload nginx || sudo systemctl restart nginx
  else
    echo "WARN: $NGINX_SITE_CONF not found; skipping nginx config update" >&2
  fi
else
  echo "WARN: sudo not available; skipping Nginx publish/config" >&2
fi

echo "==> Restarting processes"
# Prefer pm2 if available.
if command -v pm2 >/dev/null 2>&1; then
  pm2 startOrRestart deploy/ec2/pm2.config.cjs --update-env
  pm2 save
  echo "==> pm2 restart done"
  exit 0
fi

echo "WARN: pm2 is not installed; falling back to nohup. Install pm2 (recommended): npm i -g pm2" >&2

# Fallback: basic nohup (no log rotation). Not recommended long-term.
mkdir -p .logs

# API
API_PID_FILE=.logs/api.pid
WEB_PID_FILE=.logs/web.pid

if [ -f "$API_PID_FILE" ]; then
  oldpid=$(cat "$API_PID_FILE" || true)
  if [ -n "${oldpid:-}" ] && kill -0 "$oldpid" >/dev/null 2>&1; then
    kill "$oldpid" || true
    sleep 1
  fi
fi

if [ -f "$WEB_PID_FILE" ]; then
  oldpid=$(cat "$WEB_PID_FILE" || true)
  if [ -n "${oldpid:-}" ] && kill -0 "$oldpid" >/dev/null 2>&1; then
    kill "$oldpid" || true
    sleep 1
  fi
fi

nohup node apps/api/dist/index.js > .logs/api.out.log 2>&1 &
echo $! > "$API_PID_FILE"

echo "==> Started API (4000) via nohup; web is served by Nginx on :80"
