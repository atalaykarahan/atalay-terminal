#!/bin/bash
# Makes the installer to share: build/Atalay's Terminal <version>.dmg, holding the app (Apple Silicon + Intel) and an
# Applications shortcut to drag it onto. The app isn't notarized yet, so the image also says how to open it the
# first time.
set -euo pipefail
cd "$(dirname "$0")/.."

UNIVERSAL=1 OUT=build/release ./build-app.sh
VERSION=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' Resources/Info.plist)
STAGE=build/dmg
rm -rf "$STAGE" && mkdir -p "$STAGE"
cp -R "build/release/Atalay's Terminal.app" "$STAGE/"
ln -s /Applications "$STAGE/Applications"
cat > "$STAGE/Nasil acilir - How to open.txt" <<'TXT'
Atalay's Terminal - kurulum

1. Atalay's Terminal'i yanindaki Applications klasorune surukle.
2. Applications'tan ac. macOS "dogrulanamadi" derse: Sistem Ayarlari > Gizlilik ve Guvenlik >
   en altta "Yine de Ac" (bir kez gerekir; uygulama henuz Apple'a notarize edilmedi).
   Olmazsa Terminal'de:  xattr -dr com.apple.quarantine "/Applications/Atalay's Terminal.app"
3. macOS 13 veya ustu ve Claude Code (claude komutu) gerekir. Guncellemeler uygulamanin icinden tek tikla gelir.


Atalay's Terminal - install

1. Drag Atalay's Terminal onto the Applications folder next to it.
2. Open it from Applications. If macOS says it can't be verified: System Settings > Privacy & Security >
   "Open Anyway" at the bottom (needed once; the app isn't notarized by Apple yet).
   Or in Terminal:  xattr -dr com.apple.quarantine "/Applications/Atalay's Terminal.app"
3. Needs macOS 13 or later and Claude Code (the claude command). Updates arrive inside the app with one click.
TXT
DMG="build/Atalay's Terminal $VERSION.dmg"
rm -f "$DMG"
hdiutil create -volname "Atalay's Terminal" -srcfolder "$STAGE" -ov -format UDZO "$DMG" >/dev/null
rm -rf "$STAGE"
echo "made $DMG"
