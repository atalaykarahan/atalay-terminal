#!/bin/bash
# A fresh key for the Windows app's builds, run on the Mac that holds the admin token before a Windows release: the old
# key is put aside (app/scripts/retire-keys.sh revokes it a month later), the new one registered with the API and stored
# as the GitHub Actions secret the build reads (scripts/clientkey.js). The key never shows on screen.
set -euo pipefail
cd "$(dirname "$0")/../../app"
FILE="$HOME/.atalay-terminal/client-key-windows"
scripts/rotate-key.sh "$FILE"
ATALAY_CLIENT_KEY_FILE="$FILE" ATALAY_CLIENT_KEY_LABEL="windows $(date +%F)" scripts/client-key.sh
tr -d '\n' < "$FILE" | gh secret set ATALAY_CLIENT_KEY --repo atalaykarahan/atalay-terminal
echo "the next Windows build signs with the new key"
