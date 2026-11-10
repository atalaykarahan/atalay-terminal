#!/bin/bash
# Writes Resources/web/sounds.js from Resources/web/sounds/*.m4a: the recorded sounds in base64 for sfx.js (the header it
# writes says why). Run after adding or changing a sound.
set -euo pipefail
cd "$(dirname "$0")/../Resources/web"
{
  echo "'use strict';"
  echo
  echo "// The recorded sounds of sounds/*.m4a in base64 (written by app/scripts/sounds-js.sh), for sfx.js to play through"
  echo "// Web Audio: a page loaded from the app's folder can't read one of its files (no fetch or XHR from file://), and an"
  echo "// <audio> element is what macOS takes for music (Now Playing): its play key then played a badge's sound again."
  echo "window.__SOUNDS = {"
  for f in sounds/*.m4a; do
    printf "  '%s': '%s',\n" "$(basename "$f" .m4a)" "$(base64 -i "$f" | tr -d '\n')"
  done
  echo "};"
} > sounds.js
