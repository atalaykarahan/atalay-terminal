#!/bin/bash
# Makes the installer to share: build/Orbiterm <version>.dmg, holding the app (Apple Silicon + Intel) and an
# Applications shortcut to drag it onto. The app isn't notarized yet, so the image also says how to open it the
# first time.
set -euo pipefail
cd "$(dirname "$0")/.."

UNIVERSAL=1 OUT=build/release ./build-app.sh
VERSION=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' Resources/Info.plist)
STAGE=build/dmg
rm -rf "$STAGE" && mkdir -p "$STAGE"
cp -R "build/release/Orbiterm.app" "$STAGE/"
ln -s /Applications "$STAGE/Applications"
cat > "$STAGE/Nasil acilir - How to open.txt" <<'TXT'
Orbiterm - kurulum

1. Orbiterm'i yanindaki Applications klasorune surukle.
2. Applications'tan ac. macOS "dogrulanamadi" derse: Sistem Ayarlari > Gizlilik ve Guvenlik >
   en altta "Yine de Ac" (bir kez gerekir; uygulama henuz Apple'a notarize edilmedi).
   Olmazsa Terminal'de:  xattr -dr com.apple.quarantine "/Applications/Orbiterm.app"
3. macOS 13 veya ustu ve Claude Code (claude komutu) gerekir. Guncellemeler uygulamanin icinden tek tikla gelir.


Orbiterm - install

1. Drag Orbiterm onto the Applications folder next to it.
2. Open it from Applications. If macOS says it can't be verified: System Settings > Privacy & Security >
   "Open Anyway" at the bottom (needed once; the app isn't notarized by Apple yet).
   Or in Terminal:  xattr -dr com.apple.quarantine "/Applications/Orbiterm.app"
3. Needs macOS 13 or later and Claude Code (the claude command). Updates arrive inside the app with one click.
TXT
DMG="build/Orbiterm $VERSION.dmg"
rm -f "$DMG"
hdiutil create -volname "Orbiterm" -srcfolder "$STAGE" -ov -format UDZO "$DMG" >/dev/null
rm -rf "$STAGE"
echo "made $DMG"
