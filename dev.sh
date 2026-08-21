#!/bin/bash
set -e
cd "$(dirname "$0")"

pkill -f "src/index.ts" 2>/dev/null || true
pkill -f "ngrok http" 2>/dev/null || true
trap 'kill $(jobs -p) 2>/dev/null' EXIT

(cd server && bun run dev) &
ngrok http 3001 --log=stdout > /tmp/ngrok.log 2>&1 &

echo "waiting for ngrok tunnel..."
for i in $(seq 1 20); do
  URL=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null | jq -r '.tunnels[] | select(.proto=="https") | .public_url' 2>/dev/null || true)
  [ -n "$URL" ] && break
  sleep 1
done
[ -z "$URL" ] && { echo "ngrok didn't come up -- check /tmp/ngrok.log (authtoken configured?)"; exit 1; }

echo "backend tunneled at: $URL"
sed -i '' "s#^EXPO_PUBLIC_SERVER_URL=.*#EXPO_PUBLIC_SERVER_URL=$URL#" mobile/.env

cd mobile && bunx expo start --dev-client
