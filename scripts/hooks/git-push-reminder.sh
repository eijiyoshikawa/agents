#!/usr/bin/env bash
# Pre-push hook: push 前のリマインド
# stdin: JSON { "tool_name": "Bash", "tool_input": { "command": "..." } }
# exit 0 = allow (warn only)

set -euo pipefail

INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# git push コマンド以外はスキップ
if ! echo "$CMD" | grep -qE 'git\s+push'; then
  exit 0
fi

# force push の検出
if echo "$CMD" | grep -qE '\-\-force|\-f'; then
  echo "{\"decision\":\"allow\",\"reason\":\"Force push を検出しました。共有ブランチへの force push は他の開発者の変更を上書きする可能性があります。\"}"
  exit 0
fi

# push 先のブランチ確認
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
UNPUSHED=$(git log --oneline "@{upstream}..HEAD" 2>/dev/null | wc -l || echo "0")

if [ "$UNPUSHED" -gt 0 ]; then
  echo "{\"decision\":\"allow\",\"reason\":\"ブランチ '${BRANCH}' から ${UNPUSHED} コミットを push します。\"}"
fi

exit 0
