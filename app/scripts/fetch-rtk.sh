#!/bin/bash
# rtk (github.com/rtk-ai/rtk, Apache-2.0), its open-source build, for the app's token saver: both Macs' binaries of a
# pinned release, checked against the release's checksums, made into one universal binary in vendor/rtk (gitignored),
# with its licence. Run it once before building; build-app.sh puts what's there into the app (and says so if nothing).
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION=1.1.0
OUT=vendor/rtk
if [ -x "$OUT/rtk" ] && "$OUT/rtk" --version 2>/dev/null | grep -q " $VERSION"; then echo "fetch-rtk: rtk $VERSION already in $OUT"; exit 0; fi
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
base="https://github.com/rtk-ai/rtk/releases/download/v$VERSION"
curl -fsSL "$base/checksums.txt" -o "$tmp/checksums.txt"
for arch in aarch64 x86_64; do
  f="rtk-oss-$arch-apple-darwin.tar.gz"
  curl -fsSL "$base/$f" -o "$tmp/$f"
  want=$(awk -v f="$f" '{ n = $2; sub(/^\*/, "", n) } n == f { print $1 }' "$tmp/checksums.txt")
  got=$(shasum -a 256 "$tmp/$f" | awk '{ print $1 }')
  if [ -z "$want" ] || [ "$want" != "$got" ]; then echo "fetch-rtk: $f doesn't match the release's checksum" >&2; exit 1; fi
  mkdir -p "$tmp/$arch"
  tar -xzf "$tmp/$f" -C "$tmp/$arch"
done
pick() { find "$tmp/$1" -type f -perm -u+x -name 'rtk*' | head -1; }
mkdir -p "$OUT"
lipo -create "$(pick aarch64)" "$(pick x86_64)" -output "$OUT/rtk"
chmod +x "$OUT/rtk"
curl -fsSL "https://raw.githubusercontent.com/rtk-ai/rtk/v$VERSION/LICENSE" -o "$OUT/LICENSE"
echo "fetch-rtk: rtk $VERSION in $OUT"
