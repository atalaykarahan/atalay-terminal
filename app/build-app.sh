#!/bin/bash
# Builds "build/Atalay's Terminal.app" (release).
#   ./build-app.sh            build only
#   ./build-app.sh --open     build and launch
#   ./build-app.sh --install  also copy into ~/Applications
#   OUT=build/release ./build-app.sh   build somewhere else (scripts/release.sh does, so build/ keeps running)
#   UNIVERSAL=1 ./build-app.sh         Apple Silicon + Intel in one app (for releases and the shared .dmg)
#   STAGING=1 ./build-app.sh --open    the staging build, to try the next version next to the installed app:
#                                      "Atalay's Terminal Staging", built straight into ~/Applications (its only copy,
#                                      so Spotlight and the Dock always open the latest), its own bundle id and
#                                      terminals, an icon with a STAGING sash, the next version's number, the local API
set -euo pipefail
cd "$(dirname "$0")"

# Released builds sign their API calls (Sources/AtalayTerminal/ClientKey.swift) with a key that never enters the
# repository: ~/.atalay-terminal/client-key (scripts/client-key.sh makes it), client-key-staging for STAGING=1. It's
# written into a gitignored source file here; a build without one (anyone building from source) can't sign.
KEYFILE="${ATALAY_CLIENT_KEY_FILE:-$HOME/.atalay-terminal/client-key${STAGING:+-staging}}"
GEN=Sources/AtalayTerminal/ClientKey+Build.swift
FLAGS=()
if [ -f "$KEYFILE" ]; then
  python3 - "$KEYFILE" "$GEN" <<'PY'
import os, sys
kid, secret = open(sys.argv[1]).read().strip().split(':')
key = bytes.fromhex(secret)
mask = os.urandom(len(key))
data = bytes(a ^ b for a, b in zip(key, mask))
nums = lambda b: ', '.join(str(x) for x in b)
with open(sys.argv[2], 'w') as f:
    f.write('// Written by build-app.sh; never committed (.gitignore). See ClientKey.swift.\n'
            'extension ClientKey {\n'
            f'    static let embedded = (id: "{kid}", mask: [UInt8]([{nums(mask)}]), data: [UInt8]([{nums(data)}]))\n'
            '}\n')
PY
  FLAGS=(-Xswiftc -DCLIENT_KEY)
else
  rm -f "$GEN"
fi

# (Bash 3.2 calls an empty array unbound, hence the ${FLAGS[@]+…} form.)
swift build -c release ${FLAGS[@]+"${FLAGS[@]}"}
BIN="$(swift build -c release --show-bin-path)/atalay-terminal"
# The icon is redrawn when the logo or its drawing script changed.
if [ ! -f build/AppIcon.icns ] || [ tools/icon-logo.png -nt build/AppIcon.icns ] || [ tools/make-icon.swift -nt build/AppIcon.icns ]; then
  ./tools/make-icon.sh
fi

NAME="Atalay's Terminal"
ICON=build/AppIcon.icns
if [ "${STAGING:-}" = 1 ]; then
  NAME="Atalay's Terminal Staging"
  ICON=build/AppIcon-staging.icns
  if [ ! -f "$ICON" ] || [ tools/icon-logo.png -nt "$ICON" ] || [ tools/make-icon.swift -nt "$ICON" ]; then
    ./tools/make-icon.sh staging
  fi
fi
APP="${OUT:-build}/$NAME.app"
[ "${STAGING:-}" = 1 ] && APP="${OUT:-$HOME/Applications}/$NAME.app"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
if [ "${UNIVERSAL:-}" = 1 ]; then
  # Command Line Tools can't build both architectures at once: a second build for Intel, joined with lipo.
  X86=(swift build -c release --triple x86_64-apple-macosx13.0 --scratch-path .build-x86_64 ${FLAGS[@]+"${FLAGS[@]}"})
  "${X86[@]}"
  lipo -create "$BIN" "$("${X86[@]}" --show-bin-path)/atalay-terminal" -output "$APP/Contents/MacOS/atalay-terminal"
else
  cp "$BIN" "$APP/Contents/MacOS/atalay-terminal"
fi
cp Resources/Info.plist "$APP/Contents/Info.plist"
if [ "${STAGING:-}" = 1 ]; then
  P="$APP/Contents/Info.plist"
  V=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$P")
  # The number it goes out as (the next minor), so it never reads like the installed release.
  IFS=. read -r MAJOR MINOR _ <<< "$V"
  plutil -replace CFBundleIdentifier -string com.atalaykarahan.atalay-terminal.staging "$P"
  plutil -replace CFBundleName -string "$NAME" "$P"
  plutil -replace CFBundleDisplayName -string "$NAME" "$P"
  plutil -replace CFBundleShortVersionString -string "$MAJOR.$((MINOR + 1)).0-staging" "$P"
  plutil -replace AtalayAPIURL -string http://127.0.0.1:4800 "$P"
fi
cp -R Resources/web "$APP/Contents/Resources/web"
cp "$ICON" "$APP/Contents/Resources/AppIcon.icns"
codesign --force --deep --sign - "$APP" >/dev/null
echo "built $APP"

if [[ " $* " == *" --install "* ]] && [ "$APP" != "$HOME/Applications/$NAME.app" ]; then
  mkdir -p "$HOME/Applications"
  rm -rf "$HOME/Applications/$NAME.app"
  cp -R "$APP" "$HOME/Applications/"
  echo "installed ~/Applications/$NAME.app"
fi
if [[ " $* " == *" --open "* ]]; then open "$APP"; fi
