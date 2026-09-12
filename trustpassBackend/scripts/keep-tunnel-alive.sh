#!/bin/bash
#
# Keeps a free Cloudflare Quick Tunnel pointed at the local backend,
# and automatically re-syncs NOKIA_NV_REDIRECT_URI + restarts the
# backend whenever the tunnel's address changes (on first start, or
# after any restart/crash). No paid domain, no manual .env editing.
#
# Usage: ./scripts/keep-tunnel-alive.sh
# Stop with Ctrl+C (cleans up the tunnel and backend it started).

set -u

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$BACKEND_DIR/.env"
CALLBACK_PATH="/api/v1/camara/number-verification/callback"
LOCAL_PORT=5001

TUNNEL_LOG="$(mktemp -t trustpass-tunnel.XXXXXX.log)"
BACKEND_LOG="$(mktemp -t trustpass-backend.XXXXXX.log)"

TUNNEL_PID=""
BACKEND_PID=""

cleanup() {
  echo ""
  echo "Stopping tunnel and backend..."
  [ -n "$TUNNEL_PID" ] && kill "$TUNNEL_PID" 2>/dev/null
  [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null
  exit 0
}
trap cleanup INT TERM

update_redirect_uri() {
  local new_url="$1"
  local new_redirect="${new_url}${CALLBACK_PATH}"

  if grep -q "^NOKIA_NV_REDIRECT_URI=" "$ENV_FILE"; then
    sed -i.bak "s|^NOKIA_NV_REDIRECT_URI=.*|NOKIA_NV_REDIRECT_URI=${new_redirect}|" "$ENV_FILE"
    rm -f "${ENV_FILE}.bak"
  else
    echo "NOKIA_NV_REDIRECT_URI=${new_redirect}" >> "$ENV_FILE"
  fi

  echo "✅ NOKIA_NV_REDIRECT_URI updated to: ${new_redirect}"
}

restart_backend() {
  if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null
    wait "$BACKEND_PID" 2>/dev/null
  fi

  echo "Starting backend (npm run dev)..."
  (cd "$BACKEND_DIR" && npm run dev) > "$BACKEND_LOG" 2>&1 &
  BACKEND_PID=$!

  for _ in $(seq 1 20); do
    if curl -s -o /dev/null "http://localhost:${LOCAL_PORT}/api/v1/health"; then
      echo "✅ Backend is up (pid $BACKEND_PID)."
      return 0
    fi
    sleep 1
  done

  echo "⚠️ Backend did not respond to a health check in time; check $BACKEND_LOG"
}

start_tunnel_and_sync() {
  : > "$TUNNEL_LOG"

  echo "Starting cloudflared tunnel -> http://localhost:${LOCAL_PORT} ..."
  cloudflared tunnel --url "http://localhost:${LOCAL_PORT}" --logfile "$TUNNEL_LOG" &
  TUNNEL_PID=$!

  local hostname=""
  for _ in $(seq 1 30); do
    hostname="$(grep -o 'https://[a-zA-Z0-9.-]*trycloudflare\.com' "$TUNNEL_LOG" | head -1)"
    [ -n "$hostname" ] && break
    sleep 1
  done

  if [ -z "$hostname" ]; then
    echo "❌ Could not detect a tunnel URL after 30s. See $TUNNEL_LOG"
    return 1
  fi

  echo "🌐 Tunnel is live: $hostname"
  update_redirect_uri "$hostname"
  restart_backend
}

echo "========================================"
echo " TrustPass free tunnel keeper"
echo "========================================"

start_tunnel_and_sync

# Watch the tunnel process; if it ever dies (crash, network blip,
# Cloudflare recycling it), get a new one and re-sync automatically.
while true; do
  wait "$TUNNEL_PID" 2>/dev/null
  echo ""
  echo "⚠️ Tunnel process exited — restarting and re-syncing..."
  start_tunnel_and_sync
done
