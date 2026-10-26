#!/bin/bash
# Builds "build/Atalay's Terminal.app" (release).
#   ./build-app.sh            build only
#   ./build-app.sh --open     build and launch
#   ./build-app.sh --install  also copy into ~/Applications
#   OUT=build/release ./build-app.sh   build somewhere else (scripts/release.sh does, so build/ keeps running)
#   UNIVERSAL=1 ./build-app.sh         Apple Silicon + Intel in one app (for releases and the shared .dmg)
#   STAGING=1 ./build-app.sh --open    the staging build, to try the next version next to the installed app:
#                                      "Atalay's Terminal Staging" in build/staging, its own bundle id and terminals,
#                                      an icon with a STAGING sash, the local API
set -euo pipefail
cd "$(dirname "$0")"

swift build -c release
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
APP="${OUT:-build${STAGING:+/staging}}/$NAME.app"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
if [ "${UNIVERSAL:-}" = 1 ]; then
  # Command Line Tools can't build both architectures at once: a second build for Intel, joined with lipo.
  X86=(swift build -c release --triple x86_64-apple-macosx13.0 --scratch-path .build-x86_64)
  "${X86[@]}"
  lipo -create "$BIN" "$("${X86[@]}" --show-bin-path)/atalay-terminal" -output "$APP/Contents/MacOS/atalay-terminal"
else
  cp "$BIN" "$APP/Contents/MacOS/atalay-terminal"
fi
cp Resources/Info.plist "$APP/Contents/Info.plist"
if [ "${STAGING:-}" = 1 ]; then
  P="$APP/Contents/Info.plist"
  V=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$P")
  plutil -replace CFBundleIdentifier -string com.atalaykarahan.atalay-terminal.staging "$P"
  plutil -replace CFBundleName -string "$NAME" "$P"
  plutil -replace CFBundleDisplayName -string "$NAME" "$P"
  plutil -replace CFBundleShortVersionString -string "$V-staging" "$P"
  plutil -replace AtalayAPIURL -string http://127.0.0.1:4800 "$P"
fi
cp -R Resources/web "$APP/Contents/Resources/web"
cp "$ICON" "$APP/Contents/Resources/AppIcon.icns"
codesign --force --deep --sign - "$APP" >/dev/null
echo "built $APP"

if [[ " $* " == *" --install "* ]]; then
  mkdir -p "$HOME/Applications"
  rm -rf "$HOME/Applications/$NAME.app"
  cp -R "$APP" "$HOME/Applications/"
  echo "installed ~/Applications/$NAME.app"
fi
if [[ " $* " == *" --open "* ]]; then open "$APP"; fi
