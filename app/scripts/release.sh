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
# (scripts/rotate-key.sh), and keys replaced a month ago are revoked once it's out (below).
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
if [ $PRODUCTION = 1 ]; then scripts/retire-keys.sh 30; fi
