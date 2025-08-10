#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"

echo "🏗️  Building Admin UI (production)"
cd "$ROOT_DIR/pleasantcovedesign/admin-ui"
npm ci || npm install
npm run build

echo "📦 Building Server"
cd "$ROOT_DIR/pleasantcovedesign/server"
npm ci || npm install
npm run build

echo "📁 Ensuring UI build is included in server dist"
UI_DIST="$ROOT_DIR/pleasantcovedesign/admin-ui/dist/client"
SERVER_CLIENT_DIST="$ROOT_DIR/pleasantcovedesign/server/dist/client"
mkdir -p "$SERVER_CLIENT_DIST"
rsync -a --delete "$UI_DIST/" "$SERVER_CLIENT_DIST/"

echo "✅ Build complete. UI available at server/dist/client"

