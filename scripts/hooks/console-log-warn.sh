#!/usr/bin/env bash
# Post-edit hook: JS/TS ファイル内の console.log / debugger 検出
# stdin: JSON { "tool_name": "Edit|Write", "tool_input": { "file_path": "..." }, "tool_result": "..." }
# PostToolUse はブロック不可。警告のみ。

set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# JS/TS ファイル以外はスキップ
if ! echo "$FILE_PATH" | grep -qE '\.(js|jsx|ts|tsx|mjs|cjs)$'; then
  exit 0
fi

# ファイルが存在しない場合はスキップ
if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# console.log / debugger の検出
FOUND=$(grep -nE '^\s*(console\.(log|debug|warn|error|info)|debugger)\b' "$FILE_PATH" 2>/dev/null || true)

if [ -n "$FOUND" ]; then
  COUNT=$(echo "$FOUND" | wc -l)
  echo "{\"decision\":\"allow\",\"reason\":\"${FILE_PATH} に console/debugger 文が ${COUNT} 箇所あります。本番コードの場合は削除を検討してください。\"}"
fi

exit 0
