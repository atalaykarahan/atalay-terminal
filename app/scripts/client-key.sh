#!/bin/bash
# The key released builds sign their API calls with (Sources/AtalayTerminal/ClientKey.swift; the API checks it in
# src/clientauth.ts). It lives in ~/.atalay-terminal/client-key, never in the repository: this makes it when there's
# none and registers it with the API (registering it again changes nothing). scripts/release.sh puts the old one aside
# first (scripts/rotate-key.sh), so every release has a key of its own; ATALAY_CLIENT_KEY_LABEL names it.
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
python3 - "$FILE" "${ATALAY_CLIENT_KEY_LABEL:-$(hostname -s) $(date +%F)}" "${ATALAY_CLIENT_KEY_PLATFORM:-mac}" <<'PY' |
import json, sys
kid, secret = open(sys.argv[1]).read().strip().split(':')
print(json.dumps({"secret": secret, "label": sys.argv[2], "platform": sys.argv[3]}))
PY
  curl -fsS -X PUT "$API/v1/admin/client-keys/$ID" -H @<(auth) -H 'content-type: application/json' --data-binary @- >/dev/null
echo "client key $ID registered with $API"

# Two decoys: shaped like the key and built into the app beside it (build-app.sh), never used by it. Kept in
# <key file>.decoys, made with the key and registered as decoys; they stay registered when the key is retired.
DECOYS="$FILE.decoys"
if [ ! -f "$DECOYS" ]; then
  (umask 077 && for _ in 1 2; do printf 'k%s:%s\n' "$(openssl rand -hex 4)" "$(openssl rand -hex 32)"; done > "$DECOYS")
fi
while IFS=: read -r DID DSECRET; do
  printf '{"secret":"%s","label":"decoy beside %s","decoy":true}' "$DSECRET" "$ID" |
    curl -fsS -X PUT "$API/v1/admin/client-keys/$DID" -H @<(auth) -H 'content-type: application/json' --data-binary @- >/dev/null
done < "$DECOYS"
# An API from before decoys (migrations/022) takes them as plain keys: then they're revoked at once and nothing is built.
BAD=$(curl -fsS "$API/v1/admin/client-keys" -H @<(auth) | python3 -c '
import json, sys
keys = {k["id"]: k for k in json.load(sys.stdin)["keys"]}
print(" ".join(l.split(":")[0] for l in open(sys.argv[1]) if l.strip() and not keys.get(l.split(":")[0], {}).get("decoy")))
' "$DECOYS")
if [ -n "$BAD" ]; then
  for DID in $BAD; do curl -fsS -X DELETE "$API/v1/admin/client-keys/$DID" -H @<(auth) >/dev/null; done
  echo "$API doesn't know decoys yet (deploy the API first): they were revoked" >&2
  exit 1
fi
echo "its 2 decoys registered with $API"
