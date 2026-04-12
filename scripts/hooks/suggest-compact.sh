#!/usr/bin/env bash
# Strategic Compact Hook — 戦略的コンパクション提案
# PreToolUse (Edit|Write) で実行。ツール呼び出し回数をカウントし、
# 一定回数（50回）を超えたらコンパクションを提案する。
#
# カウンターは /tmp/claude-compact-counter-{pid_hash} に保存。
# exit 0 always (informational only)

set -o pipefail

INPUT=$(cat)

# カウンターファイル（セッションごとにユニーク）
COUNTER_DIR="/tmp"
COUNTER_FILE="$COUNTER_DIR/claude-compact-counter"
THRESHOLD=50

# カウンターの読み取り/更新
CURRENT=0
if [ -f "$COUNTER_FILE" ]; then
  CURRENT=$(cat "$COUNTER_FILE" 2>/dev/null || echo 0)
fi
CURRENT=$((CURRENT + 1))
echo "$CURRENT" > "$COUNTER_FILE"

# 閾値チェック（50回ごとにリマインド）
if [ $((CURRENT % THRESHOLD)) -eq 0 ]; then
  echo "{\"decision\":\"allow\",\"reason\":\"ツール呼び出しが ${CURRENT} 回に達しました。論理的な区切り（リサーチ完了・マイルストーン完了・デバッグ完了など）であれば /compact の実行を推奨します。ただし実装途中では実行しないでください（変数名・ファイルパス等のコンテキストを失います）。\"}"
fi

exit 0
