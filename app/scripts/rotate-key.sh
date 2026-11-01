#!/bin/bash
# Puts a key file aside so the next scripts/client-key.sh makes a fresh one: every release ships a key of its own, and a
# key pulled out of an installed app works only until releases move on (scripts/retire-keys.sh revokes the old ones a
# month later). The old key stays live meanwhile, for the apps that haven't updated yet.
#   scripts/rotate-key.sh ~/.atalay-terminal/client-key
set -euo pipefail
FILE="${1:?usage: scripts/rotate-key.sh <key file>}"
[ -f "$FILE" ] || exit 0
ARCHIVE="$HOME/.atalay-terminal/client-keys"
mkdir -p "$ARCHIVE"
chmod 700 "$ARCHIVE"
ID=$(cut -d: -f1 "$FILE")
mv "$FILE" "$ARCHIVE/$ID"
# When it was replaced, which is what retire-keys.sh counts from.
touch "$ARCHIVE/$ID"
echo "client key $ID put aside"
