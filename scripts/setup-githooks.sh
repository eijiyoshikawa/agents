#!/usr/bin/env bash
# git本体フック（空コミット・空push防止）を有効化する。各クローンで1回実行:
#   bash scripts/setup-githooks.sh
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
chmod +x scripts/githooks/* scripts/hooks/*.sh
git config core.hooksPath scripts/githooks
echo "✅ core.hooksPath = scripts/githooks を設定しました（pre-commit / pre-push ガード有効）"
