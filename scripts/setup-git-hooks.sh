#!/bin/sh
# 空コミット禁止の git hooks を有効化する（clone ごとに1回実行）
#   bash scripts/setup-git-hooks.sh
set -e
cd "$(git rev-parse --show-toplevel)"
git config core.hooksPath .githooks
chmod +x .githooks/*
echo "✔ core.hooksPath=.githooks を設定しました（pre-commit / pre-push で空コミットを拒否します）"
