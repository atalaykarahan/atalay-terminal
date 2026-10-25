#!/bin/bash
# Publishes the app in build/release as an in-app update: zips it and signs the zip with the release key
# (~/.atalay-terminal/release-key, see scripts/sign.swift). For production the zip and the .dmg go to a GitHub release
# on the public releases repo, and the API only records the version, the zip's link, SHA-256, signature and notes; a
# local API keeps the zip itself. Every installed copy with an older build shows the update within a minute, and
# installs only a zip whose signature checks out.
#   scripts/publish.sh ["what changed"]      notes: one line per change (they show as a list in the app)
#   ATALAY_API_URL        API to publish to (default: production)
#   ATALAY_ADMIN_TOKEN    the API's ADMIN_TOKEN (default: ~/.atalay-terminal/admin-token, or ../api/.env for a local API)
#   ATALAY_RELEASES_REPO  GitHub repo for the files (default: atalaykarahan/atalay-terminal-releases)
set -euo pipefail
cd "$(dirname "$0")/.."

NOTES="${1:-}"
API="${ATALAY_API_URL:-https://terminal-api.atalaykarahan.com}"
REPO="${ATALAY_RELEASES_REPO:-atalaykarahan/atalay-terminal-releases}"
LOCAL=0
case "$API" in http://127.0.0.1* | http://localhost*) LOCAL=1 ;; esac
TOKEN="${ATALAY_ADMIN_TOKEN:-}"
if [ -z "$TOKEN" ]; then
  if [ $LOCAL = 1 ]; then TOKEN="$(sed -n 's/^ADMIN_TOKEN=//p' ../api/.env 2>/dev/null)"
  else TOKEN="$(cat ~/.atalay-terminal/admin-token 2>/dev/null || true)"; fi
fi
[ -n "$TOKEN" ] || { echo "no admin token for $API: save it in ~/.atalay-terminal/admin-token" >&2; exit 1; }

APP="build/release/Atalay's Terminal.app"
[ -d "$APP" ] || { echo "nothing to publish: build it first (scripts/release.sh does)" >&2; exit 1; }
VERSION=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$APP/Contents/Info.plist")
BUILD=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$APP/Contents/Info.plist")
ZIP="build/atalay-terminal-$VERSION-$BUILD.zip"
rm -f "$ZIP"
ditto -c -k --keepParent "$APP" "$ZIP"
SHA=$(shasum -a 256 "$ZIP" | cut -d' ' -f1)
SIG=$(swift scripts/sign.swift sign "$ZIP")

# The token goes in through a file descriptor, not the command line (other processes can read arguments).
auth() { printf 'authorization: Bearer %s\n' "$TOKEN"; }
if [ $LOCAL = 1 ]; then
  curl -fsS -X PUT "$API/v1/downloads/$(basename "$ZIP")" -H @<(auth) -H 'content-type: application/zip' -T "$ZIP" >/dev/null
  WHERE=(file "$(basename "$ZIP")")
else
  # The zip for updates and the .dmg for new users, on a release page anyone can download from.
  FILES=("$ZIP")
  DMG="build/Atalay's Terminal $VERSION.dmg"
  [ -f "$DMG" ] && FILES+=("$DMG")
  TITLE="Atalay's Terminal $VERSION"
  gh release create "v$VERSION" "${FILES[@]}" --repo "$REPO" --title "$TITLE" --notes "${NOTES:-$TITLE}"
  URL="https://github.com/$REPO/releases/download/v$VERSION/$(basename "$ZIP")"
  # Registered only once the file can really be downloaded (a public repo, the upload done).
  curl -fsSL -r 0-0 -o /dev/null "$URL" || { echo "can't download $URL: is $REPO public?" >&2; exit 1; }
  WHERE=(url "$URL")
fi
BODY=$(python3 -c 'import json, sys; b, v, s, g, n, k, w = sys.argv[1:]; print(json.dumps({"build": int(b), "version": v, "sha256": s, "signature": g, "notes": n, k: w}))' \
  "$BUILD" "$VERSION" "$SHA" "$SIG" "$NOTES" "${WHERE[@]}")
curl -fsS -X POST "$API/v1/releases" -H @<(auth) -H 'content-type: application/json' -d "$BODY" >/dev/null
echo "published $VERSION ($BUILD) to $API"
