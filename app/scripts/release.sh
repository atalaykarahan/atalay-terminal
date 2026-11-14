#!/bin/bash
# A new version for everyone: raises CFBundleVersion by one and sets the version, builds the app (Apple Silicon +
# Intel) with its .dmg for new users (scripts/make-dmg.sh), then publishes it as an in-app update for everyone else
# (scripts/publish.sh: a GitHub release, recorded in the API).
#   scripts/release.sh 0.5.1 $'first change\nsecond change'   (one line per change: the app lists them)
#   ATALAY_API_URL=http://127.0.0.1:4800 scripts/release.sh …   to try it against the local API
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION="${1:?usage: scripts/release.sh <version> [notes]}"
# The key the build signs its API calls with, registered with that API before anyone has the build
# (scripts/client-key.sh; a local API pairs with the staging key). For production every release gets a fresh one
# (scripts/rotate-key.sh). Once the release is out the key goes live (below), which ends the Mac keys before it: no XP
# after 10 minutes, dead after 24 hours (API src/clientauth.ts); keys replaced a month ago are revoked for the books.
PRODUCTION=1
case "${ATALAY_API_URL:-}" in
  http://127.0.0.1* | http://localhost*) PRODUCTION=0; export ATALAY_CLIENT_KEY_FILE="$HOME/.atalay-terminal/client-key-staging" ;;
esac
if [ $PRODUCTION = 1 ]; then
  scripts/rotate-key.sh "$HOME/.atalay-terminal/client-key"
  export ATALAY_CLIENT_KEY_LABEL="mac $VERSION"
fi
scripts/client-key.sh
PLIST=Resources/Info.plist
BUILD=$(( $(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$PLIST") + 1 ))
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD" -c "Set :CFBundleShortVersionString $VERSION" "$PLIST"
scripts/make-dmg.sh
scripts/publish.sh "${2:-}"
# The release is visible to installed apps: this build's key goes live, which starts the end of the Mac keys before it.
# Admin token through a file descriptor, as in client-key.sh and publish.sh.
API="${ATALAY_API_URL:-https://terminal-api.atalaykarahan.com}"
TOKEN="${ATALAY_ADMIN_TOKEN:-}"
if [ -z "$TOKEN" ]; then
  if [ $PRODUCTION = 0 ]; then TOKEN="$(sed -n 's/^ADMIN_TOKEN=//p' ../api/.env 2>/dev/null)"
  else TOKEN="$(cat ~/.atalay-terminal/admin-token 2>/dev/null || true)"; fi
fi
KEY_ID=$(cut -d: -f1 "${ATALAY_CLIENT_KEY_FILE:-$HOME/.atalay-terminal/client-key}")
# The release is already out by now, so a failure here only warns: the keys before it go on working until this is done.
if curl -fsS -X PUT "$API/v1/admin/client-keys/$KEY_ID/live" -H @<(printf 'authorization: Bearer %s\n' "$TOKEN") >/dev/null; then
  echo "client key $KEY_ID is live: the keys before it stop earning XP in 10 minutes and end in 24 hours"
else
  echo "warning: the release is out, but client key $KEY_ID couldn't be marked live, so the keys before it keep working;" >&2
  echo "  mark it by hand: PUT $API/v1/admin/client-keys/$KEY_ID/live with the admin token" >&2
fi
if [ $PRODUCTION = 1 ]; then scripts/retire-keys.sh 30; fi
