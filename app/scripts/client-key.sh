#!/bin/bash
# The key released builds sign their API calls with (Sources/AtalayTerminal/ClientKey.swift; the API checks it in
# src/clientauth.ts). It lives in ~/.atalay-terminal/client-key, never in the repository: this makes it once and
# registers it with the API (scripts/release.sh runs it every time; registering it again changes nothing).
#   scripts/client-key.sh                                        production
#   ATALAY_API_URL=http://127.0.0.1:4800 scripts/client-key.sh   the local API, with ~/.atalay-terminal/client-key-staging
# A key that leaked: retire it (DELETE /v1/admin/client-keys/<id>), delete the file and release again.
set -euo pipefail
cd "$(dirname "$0")/.."

API="${ATALAY_API_URL:-https://terminal-api.atalaykarahan.com}"
LOCAL=0
case "$API" in http://127.0.0.1* | http://localhost*) LOCAL=1 ;; esac
TOKEN="${ATALAY_ADMIN_TOKEN:-}"
if [ -z "$TOKEN" ]; then
  if [ $LOCAL = 1 ]; then TOKEN="$(sed -n 's/^ADMIN_TOKEN=//p' ../api/.env 2>/dev/null)"
  else TOKEN="$(cat ~/.atalay-terminal/admin-token 2>/dev/null || true)"; fi
fi
[ -n "$TOKEN" ] || { echo "no admin token for $API" >&2; exit 1; }

FILE="$HOME/.atalay-terminal/client-key"
[ $LOCAL = 1 ] && FILE="$FILE-staging"
FILE="${ATALAY_CLIENT_KEY_FILE:-$FILE}"
if [ ! -f "$FILE" ]; then
  mkdir -p "$(dirname "$FILE")"
  (umask 077 && printf 'k%s:%s\n' "$(openssl rand -hex 4)" "$(openssl rand -hex 32)" > "$FILE")
fi
ID=$(cut -d: -f1 "$FILE")

# The key and the admin token go through stdin and a file descriptor, not the command line (others can read arguments).
auth() { printf 'authorization: Bearer %s\n' "$TOKEN"; }
python3 - "$FILE" "$(hostname -s) $(date +%F)" <<'PY' |
import json, sys
kid, secret = open(sys.argv[1]).read().strip().split(':')
print(json.dumps({"secret": secret, "label": sys.argv[2]}))
PY
  curl -fsS -X PUT "$API/v1/admin/client-keys/$ID" -H @<(auth) -H 'content-type: application/json' --data-binary @- >/dev/null
echo "client key $ID registered with $API"
