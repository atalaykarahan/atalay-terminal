#!/bin/bash
# Development run, like `npm run dev`: a debug build straight from the sources, against the local API
# (api/: docker compose up). The dashboard page loads Resources/web directly, so ⌘R shows web edits without a
# rebuild. Its terminals live in their own sessions (atld-…), apart from the installed app's, so both can run.
set -euo pipefail
cd "$(dirname "$0")"
export ATALAY_API_URL="${ATALAY_API_URL:-http://127.0.0.1:4800}"
exec swift run atalay-terminal "$@"
