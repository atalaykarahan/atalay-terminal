#!/bin/bash
# The certificate the app is signed with (build-app.sh), so its signature stays the same from build to build and macOS
# keeps the permissions given to it across updates. It lives in the login keychain, with a copy in
# ~/.atalay-terminal/signing.p12 (its password next to it, signing.pass; both chmod 600, never in the repository): on
# another Mac, or after the keychain lost it, this puts the same one back. A new one would cost every user the
# permissions once more, so it's made only when there's no copy at all.
#   scripts/signing-identity.sh
set -euo pipefail
NAME=${ATALAY_SIGN_ID:-"Atalay's Terminal"}
KEYCHAIN="$HOME/Library/Keychains/login.keychain-db"
P12="$HOME/.atalay-terminal/signing.p12" PASSFILE="$HOME/.atalay-terminal/signing.pass"
if security find-identity -p codesigning "$KEYCHAIN" | grep -qF "\"$NAME\"" \
   || { security find-certificate -c "$NAME" "$KEYCHAIN" >/dev/null 2>&1 \
        && security find-key -l "$NAME" "$KEYCHAIN" >/dev/null 2>&1; }; then
  echo "\"$NAME\" is in the keychain already"
  exit 0
fi
if [ ! -f "$P12" ]; then
  WORK=$(mktemp -d)
  trap 'rm -rf "$WORK"' EXIT
  (umask 077
   openssl req -x509 -newkey rsa:2048 -sha256 -days 7300 -nodes -keyout "$WORK/key.pem" -out "$WORK/cert.pem" -subj "/CN=$NAME" \
     -addext "basicConstraints=critical,CA:false" -addext "keyUsage=critical,digitalSignature" -addext "extendedKeyUsage=critical,codeSigning" 2>/dev/null
   mkdir -p "$(dirname "$P12")"
   openssl rand -hex 24 | tr -d '\n' > "$PASSFILE"
   openssl pkcs12 -export -legacy -inkey "$WORK/key.pem" -in "$WORK/cert.pem" -name "$NAME" -out "$P12" -passout "file:$PASSFILE")
  chmod 600 "$P12" "$PASSFILE"
  echo "made a new certificate: $P12"
fi
security import "$P12" -k "$KEYCHAIN" -P "$(cat "$PASSFILE")" -T /usr/bin/codesign >/dev/null
echo "\"$NAME\" put in the keychain"
