#!/bin/bash
set -euo pipefail

# Only run in Claude Code on the web (remote) sessions; no-op locally.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Install dependencies so the build / type-check work in the session.
# `npm install` respects the committed package-lock.json and is cache-friendly.
echo "[session-start] Installing npm dependencies..."
npm install --no-audit --no-fund

echo "[session-start] Dependencies ready."
