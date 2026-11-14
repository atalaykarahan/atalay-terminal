#!/bin/bash
# Revokes the keys put aside by scripts/rotate-key.sh more than <days> ago (30 by default). Bookkeeping only: the API
# already stopped them (no XP 10 minutes after the next release went out, dead after 24 hours: src/clientauth.ts), so
# the apps still signing with them get "update required" either way. Production only; scripts/release.sh runs it.
#   scripts/retire-keys.sh [days]
set -euo pipefail
DAYS="${1:-30}"
API="https://terminal-api.atalaykarahan.com"
ARCHIVE="$HOME/.atalay-terminal/client-keys"
[ -d "$ARCHIVE" ] || exit 0
TOKEN="$(cat ~/.atalay-terminal/admin-token 2>/dev/null || true)"
[ -n "$TOKEN" ] || { echo "no admin token for $API" >&2; exit 1; }
# The admin token goes through a file descriptor, not the command line (others can read arguments).
auth() { printf 'authorization: Bearer %s\n' "$TOKEN"; }
find "$ARCHIVE" -type f -mtime "+$DAYS" | while read -r f; do
  ID=$(basename "$f")
  CODE=$(curl -sS -o /dev/null -w '%{http_code}' -X DELETE "$API/v1/admin/client-keys/$ID" -H @<(auth))
  # Revoked now, or already gone: its file goes too.
  if [ "$CODE" = 200 ] || [ "$CODE" = 404 ]; then
    rm -f "$f"
    echo "client key $ID retired"
  else
    echo "client key $ID: API answered $CODE, kept" >&2
  fi
done
