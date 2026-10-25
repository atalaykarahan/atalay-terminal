#!/bin/bash
# A new version for everyone: raises CFBundleVersion by one and sets the version, builds the app (Apple Silicon +
# Intel) with its .dmg for new users (scripts/make-dmg.sh), then publishes it as an in-app update for everyone else
# (scripts/publish.sh: a GitHub release, recorded in the API).
#   scripts/release.sh 0.5.1 $'first change\nsecond change'   (one line per change: the app lists them)
#   ATALAY_API_URL=http://127.0.0.1:4800 scripts/release.sh …   to try it against the local API
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION="${1:?usage: scripts/release.sh <version> [notes]}"
PLIST=Resources/Info.plist
BUILD=$(( $(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$PLIST") + 1 ))
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD" -c "Set :CFBundleShortVersionString $VERSION" "$PLIST"
scripts/make-dmg.sh
scripts/publish.sh "${2:-}"
