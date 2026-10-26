#!/bin/bash
# Renders build/AppIcon.icns: tools/make-icon.swift draws tools/icon-logo.png on the icon background.
#   tools/make-icon.sh staging   the staging build's icon instead: build/AppIcon-staging.icns
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p build
VARIANT="${1:-}"
SUFFIX="${VARIANT:+-$VARIANT}"
swift tools/make-icon.swift tools/icon-logo.png "build/icon_1024$SUFFIX.png" $VARIANT
ICONSET="build/AppIcon$SUFFIX.iconset"
rm -rf "$ICONSET" && mkdir -p "$ICONSET"
for s in 16 32 128 256 512; do
  sips -z $s $s "build/icon_1024$SUFFIX.png" --out "$ICONSET/icon_${s}x${s}.png" >/dev/null
  sips -z $((s * 2)) $((s * 2)) "build/icon_1024$SUFFIX.png" --out "$ICONSET/icon_${s}x${s}@2x.png" >/dev/null
done
iconutil -c icns "$ICONSET" -o "build/AppIcon$SUFFIX.icns"
rm -rf "$ICONSET"
