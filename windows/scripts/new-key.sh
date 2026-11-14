#!/bin/bash
# A fresh key for the Windows app's builds, run on the Mac that holds the admin token before a Windows release: the old
# key is put aside (app/scripts/retire-keys.sh revokes it a month later, though the API stops it
# 24 hours after the next Windows release) and the new one registered with the API. The key
# stays on your own machines, never on GitHub: copy ~/.atalay-terminal/client-key-windows to the Windows PC and build
# there (README). It never shows on screen.
set -euo pipefail
cd "$(dirname "$0")/../../app"
FILE="$HOME/.atalay-terminal/client-key-windows"
scripts/rotate-key.sh "$FILE"
ATALAY_CLIENT_KEY_FILE="$FILE" ATALAY_CLIENT_KEY_LABEL="windows $(date +%F)" ATALAY_CLIENT_KEY_PLATFORM=windows \
  scripts/client-key.sh
# The key and its two decoys (client-key.sh made and registered them) on the clipboard, joined by commas, for the
# Windows PC's scripts/clientkey.js --save.
{ cat "$FILE"; cat "$FILE.decoys"; } | paste -sd, - | tr -d '\n' | pbcopy
echo "new key in $FILE, copied with its decoys: paste it on the Windows PC (README)"
