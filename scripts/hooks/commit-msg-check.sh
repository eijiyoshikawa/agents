#!/usr/bin/env bash
# Pre-commit hook: Conventional Commits フォーマット検証
# stdin: JSON { "tool_name": "Bash", "tool_input": { "command": "..." } }
# exit 0 = allow (warn only), exit 2 = block

set -euo pipefail

INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# git commit コマンド以外はスキップ
if ! echo "$CMD" | grep -qE 'git\s+commit'; then
  exit 0
fi

# -m フラグからメッセージを抽出（HEREDOCの場合はスキップ）
MSG=$(echo "$CMD" | grep -oP '(?<=-m\s["\x27])[^"\x27]+' 2>/dev/null | head -1 || true)

# メッセージが取得できない場合（HEREDOC等）はスキップ
if [ -z "$MSG" ]; then
  exit 0
fi

# Conventional Commits パターン
VALID_TYPES="feat|fix|refactor|test|docs|style|chore|perf|ci|build|revert"
if ! echo "$MSG" | grep -qE "^($VALID_TYPES)(\(.+\))?!?:"; then
  echo "{\"decision\":\"allow\",\"reason\":\"コミットメッセージが Conventional Commits 規約に準拠していません。推奨形式: <type>(<scope>): <description>  有効なtype: $VALID_TYPES\"}"
fi

exit 0
