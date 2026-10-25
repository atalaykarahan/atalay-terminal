#!/bin/bash
# Builds "build/Atalay's Terminal.app" (release).
#   ./build-app.sh            build only
#   ./build-app.sh --open     build and launch
#   ./build-app.sh --install  also copy into ~/Applications
#   OUT=build/release ./build-app.sh   build somewhere else (scripts/release.sh does, so build/ keeps running)
#   UNIVERSAL=1 ./build-app.sh         Apple Silicon + Intel in one app (for releases and the shared .dmg)
set -euo pipefail
cd "$(dirname "$0")"

swift build -c release
BIN="$(swift build -c release --show-bin-path)/atalay-terminal"
# The icon is redrawn when the logo or its drawing script changed.
if [ ! -f build/AppIcon.icns ] || [ tools/icon-logo.png -nt build/AppIcon.icns ] || [ tools/make-icon.swift -nt build/AppIcon.icns ]; then
  ./tools/make-icon.sh
fi

APP="${OUT:-build}/Atalay's Terminal.app"
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
cp -R Resources/web "$APP/Contents/Resources/web"
cp build/AppIcon.icns "$APP/Contents/Resources/AppIcon.icns"
codesign --force --deep --sign - "$APP" >/dev/null
echo "built $APP"

if [[ " $* " == *" --install "* ]]; then
  mkdir -p "$HOME/Applications"
  rm -rf "$HOME/Applications/Atalay's Terminal.app"
  cp -R "$APP" "$HOME/Applications/"
  echo "installed ~/Applications/Atalay's Terminal.app"
fi
if [[ " $* " == *" --open "* ]]; then open "$APP"; fi
