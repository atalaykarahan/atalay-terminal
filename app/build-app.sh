#!/bin/bash
# Builds "build/Orbiterm.app" (release).
#   ./build-app.sh            build only
#   ./build-app.sh --open     build and launch
#   ./build-app.sh --install  also copy into ~/Applications
#   OUT=build/release ./build-app.sh   build somewhere else (scripts/release.sh does, so build/ keeps running)
#   UNIVERSAL=1 ./build-app.sh         Apple Silicon + Intel in one app (for releases and the shared .dmg)
#   STAGING=1 ./build-app.sh --open    the staging build, to try the next version next to the installed app:
#                                      "Orbiterm Staging", built straight into ~/Applications (its only copy,
#                                      so Spotlight and the Dock always open the latest), its own bundle id and
#                                      terminals, an icon with a STAGING sash, the next version's number, the local API
set -euo pipefail
cd "$(dirname "$0")"
[[ " $* " == *" --staging "* ]] && STAGING=1 || true

# Released builds sign their API calls (Sources/AtalayTerminal/ClientKey.swift) with a key that never enters the
# repository: ~/.atalay-terminal/client-key (scripts/client-key.sh makes it), client-key-staging for STAGING=1. It's
# written into a gitignored source file here; a build without one (anyone building from source) can't sign.
KEYFILE="${ATALAY_CLIENT_KEY_FILE:-$HOME/.atalay-terminal/client-key${STAGING:+-staging}}"
GEN=Sources/AtalayTerminal/ClientKey+Build.swift
# With the key, the SHA-256 of every page file goes into the program too (WebIntegrity.swift): the app signs nothing
# while its pages aren't these.
MANIFEST=Sources/AtalayTerminal/WebManifest+Build.swift
FLAGS=()
if [ -f "$KEYFILE" ]; then
  python3 - "$KEYFILE" "$GEN" <<'PY'
import os, random, sys
# The key, and its decoys (scripts/client-key.sh) in a random order: `slot` says which one is the key.
real = open(sys.argv[1]).read().strip()
keys = [real]
if os.path.exists(sys.argv[1] + '.decoys'):
    keys += [l.strip() for l in open(sys.argv[1] + '.decoys') if l.strip()]
random.SystemRandom().shuffle(keys)
nums = lambda b: ', '.join(str(x) for x in b)
entries = ''
for k in keys:
    kid, secret = k.split(':')
    key = bytes.fromhex(secret)
    mask = os.urandom(len(key))
    data = bytes(a ^ b for a, b in zip(key, mask))
    entries += f'        (id: "{kid}", mask: [UInt8]([{nums(mask)}]), data: [UInt8]([{nums(data)}])),\n'
with open(sys.argv[2], 'w') as f:
    f.write('// Written by build-app.sh; never committed (.gitignore). See ClientKey.swift.\n'
            'extension ClientKey {\n'
            '    static let embedded: [(id: String, mask: [UInt8], data: [UInt8])] = [\n' + entries + '    ]\n'
            f'    static let slot = {keys.index(real)}\n'
            '}\n')
PY
  python3 - Resources/web "$MANIFEST" <<'PY'
import hashlib, os, sys
root, out = sys.argv[1], sys.argv[2]
files = {}
for d, _, names in os.walk(root):
    for n in names:
        if n == '.DS_Store':
            continue
        p = os.path.join(d, n)
        rel = os.path.relpath(p, root)
        assert '"' not in rel and '\\' not in rel, rel
        with open(p, 'rb') as f:
            files[rel] = hashlib.sha256(f.read()).hexdigest()
with open(out, 'w') as f:
    f.write('// Written by build-app.sh; never committed (.gitignore). See WebIntegrity.swift.\n'
            'extension WebIntegrity {\n'
            '    static let manifest: [String: String] = [\n'
            + ''.join(f'        "{k}": "{v}",\n' for k, v in sorted(files.items())) +
            '    ]\n'
            '}\n')
PY
  FLAGS=(-Xswiftc -DCLIENT_KEY)
else
  rm -f "$GEN" "$MANIFEST"
fi

# (Bash 3.2 calls an empty array unbound, hence the ${FLAGS[@]+…} form.)
swift build -c release ${FLAGS[@]+"${FLAGS[@]}"}
BIN="$(swift build -c release --show-bin-path)/atalay-terminal"
# The icon is redrawn when the logo or its drawing script changed.
if [ ! -f build/AppIcon.icns ] || [ tools/icon-logo.png -nt build/AppIcon.icns ] || [ tools/make-icon.swift -nt build/AppIcon.icns ]; then
  ./tools/make-icon.sh
fi

NAME="Orbiterm"
ICON=build/AppIcon.icns
if [ "${STAGING:-}" = 1 ]; then
  NAME="Orbiterm Staging"
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
# The app goes out without its local symbols (Swift's names for its own types and functions): it doesn't need them to
# run, they're 40% of the binary, and they named where its key sits. A hang sample (Watchdog.swift) then shows the app's
# own frames as addresses, so build/symbols keeps each build's debug symbols, taken before they go, to read one against:
# atos -o build/symbols/<that build>.dSYM -l <load address> <address>. (Emir Çoban's.)
mkdir -p build/symbols
dsymutil "$APP/Contents/MacOS/atalay-terminal" -o "build/symbols/atalay-terminal-$(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' Resources/Info.plist)${STAGING:+-staging}${UNIVERSAL:+-universal}.dSYM"
strip -x "$APP/Contents/MacOS/atalay-terminal"
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
  # Plain http to the local API is for staging only; the released app reaches its API over https alone.
  /usr/libexec/PlistBuddy -c 'Add :NSAppTransportSecurity dict' -c 'Add :NSAppTransportSecurity:NSAllowsLocalNetworking bool true' "$P"
fi
cp -R Resources/web "$APP/Contents/Resources/web"
cp "$ICON" "$APP/Contents/Resources/AppIcon.icns"
# The token savers (TokenSavers.swift): rtk, fetched by scripts/fetch-rtk.sh (a pinned release, checked against its
# checksums) the first time a Mac builds, and caveman's rules.
[ -x vendor/rtk/rtk ] || scripts/fetch-rtk.sh || true
cp -R Resources/caveman "$APP/Contents/Resources/caveman"
if [ -x vendor/rtk/rtk ]; then
  mkdir -p "$APP/Contents/Resources/bin"
  cp vendor/rtk/rtk "$APP/Contents/Resources/bin/rtk"
  cp vendor/rtk/LICENSE "$APP/Contents/Resources/bin/rtk-LICENSE"
else
  echo "build-app: no rtk to put in (scripts/fetch-rtk.sh failed), rtk will be off" >&2
fi
# Signed with the app's own certificate (scripts/signing-identity.sh puts it in the keychain) the signature stays the same
# from build to build, so macOS keeps the permissions given to the app (screen recording, accessibility) across its
# updates; without it, an ad-hoc signature, which every build changes, and the permissions go with each update.
SIGN_ID=${ATALAY_SIGN_ID:-"Atalay's Terminal"}
# A self-signed development identity can have a usable certificate and private key while `find-identity` excludes it
# from its "valid" trust list. It still gives this app the same designated identity on every staging build, which keeps
# macOS permissions and shortcuts attached to the app. Falling back to ad-hoc here changes that identity every build.
KEYCHAIN="$HOME/Library/Keychains/login.keychain-db"
if security find-identity -p codesigning 2>/dev/null | grep -qF "\"$SIGN_ID\"" \
   || { security find-certificate -c "$SIGN_ID" "$KEYCHAIN" >/dev/null 2>&1 \
        && security find-key -l "$SIGN_ID" "$KEYCHAIN" >/dev/null 2>&1; }; then
  SIGN="$SIGN_ID"
else
  SIGN=-
fi
# With the hardened runtime: macOS then loads no library into the app that Apple or its signer didn't sign and ignores
# DYLD_* variables, so nothing can be slipped into the running app; Orbiterm.entitlements lets it still send Apple
# events (closing iTerm2 tabs, ITerm.swift). It keeps the designated identity, so permissions stay.
codesign --force --deep --options runtime --entitlements Orbiterm.entitlements --sign "$SIGN" "$APP" >/dev/null
echo "built $APP"

if [[ " $* " == *" --install "* ]] && [ "$APP" != "$HOME/Applications/$NAME.app" ]; then
  mkdir -p "$HOME/Applications"
  rm -rf "$HOME/Applications/$NAME.app"
  cp -R "$APP" "$HOME/Applications/"
  echo "installed ~/Applications/$NAME.app"
fi
if [[ " $* " == *" --open "* ]]; then
  pkill -f "$APP/Contents/MacOS/atalay-terminal" 2>/dev/null || true
  sleep 0.3
  open "$APP"
fi
