#!/bin/bash
# Puts a key file aside so the next scripts/client-key.sh makes a fresh one: every release ships a key of its own, and a
# key pulled out of an installed app works only until releases move on: the API stops its XP 10 minutes after the next
# release goes out and the key itself 24 hours after (scripts/retire-keys.sh then revokes it for the books).
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
# Its decoys stay registered; the next key gets new ones.
rm -f "$FILE.decoys"
echo "client key $ID put aside"
