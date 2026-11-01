#!/bin/bash
# A fresh key for the Windows app's builds, run on the Mac that holds the admin token before a Windows release: the old
# key is put aside (app/scripts/retire-keys.sh revokes it a month later) and the new one registered with the API. The key
# stays on your own machines, never on GitHub: copy ~/.atalay-terminal/client-key-windows to the Windows PC and build
# there (README). It never shows on screen.
set -euo pipefail
cd "$(dirname "$0")/../../app"
FILE="$HOME/.atalay-terminal/client-key-windows"
scripts/rotate-key.sh "$FILE"
ATALAY_CLIENT_KEY_FILE="$FILE" ATALAY_CLIENT_KEY_LABEL="windows $(date +%F)" scripts/client-key.sh
echo "new key in $FILE: copy it to the Windows PC (README)"
