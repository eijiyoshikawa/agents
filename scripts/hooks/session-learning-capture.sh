#!/usr/bin/env bash
# Stop hook: セッション終了時に学習キャプチャのリマインドを出力
# PostToolUse で使用。一定回数のツール呼び出し後にリマインドを表示。
# stdin: JSON
# exit 0 always (informational only)

set -euo pipefail

INPUT=$(cat)

LEARNINGS_DIR="learnings/sessions"
TODAY=$(date +%Y-%m-%d)

# learnings ディレクトリが存在しない場合はスキップ
if [ ! -d "$LEARNINGS_DIR" ]; then
  exit 0
fi

# 今日のセッションログが未作成かチェック
EXISTING=$(find "$LEARNINGS_DIR" -name "${TODAY}_*.json" 2>/dev/null | head -1)

if [ -z "$EXISTING" ]; then
  echo "{\"decision\":\"allow\",\"reason\":\"本日のセッション学習ログが未作成です。セッション終了前に learnings/sessions/${TODAY}_{topic}.json に学んだパターン・決定事項を記録してください。テンプレート: learnings/README.md\"}"
fi

exit 0
