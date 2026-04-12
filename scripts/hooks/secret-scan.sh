#!/usr/bin/env bash
# Pre-commit hook: ステージングファイルのシークレット検出
# stdin: JSON { "tool_name": "Bash", "tool_input": { "command": "..." } }
# exit 0 = allow, exit 2 = block

set -euo pipefail

INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# git commit コマンド以外はスキップ
if ! echo "$CMD" | grep -qE 'git\s+commit'; then
  exit 0
fi

# ステージングされたファイルを取得
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null || true)
if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

# シークレットパターン
PATTERNS=(
  'AKIA[0-9A-Z]{16}'                          # AWS Access Key
  'sk-[a-zA-Z0-9]{20,}'                       # OpenAI / Stripe Secret Key
  'sk-ant-[a-zA-Z0-9-]{20,}'                  # Anthropic API Key
  'ghp_[a-zA-Z0-9]{36}'                       # GitHub Personal Token
  'gho_[a-zA-Z0-9]{36}'                       # GitHub OAuth Token
  'xox[bpors]-[a-zA-Z0-9-]+'                  # Slack Token
  'password\s*[:=]\s*["\x27][^\x27"]{8,}'     # Hardcoded password
  'secret\s*[:=]\s*["\x27][^\x27"]{8,}'       # Hardcoded secret
)

PATTERN=$(IFS='|'; echo "${PATTERNS[*]}")
FOUND=""

for file in $STAGED_FILES; do
  if [ -f "$file" ]; then
    MATCHES=$(grep -nE "$PATTERN" "$file" 2>/dev/null || true)
    if [ -n "$MATCHES" ]; then
      FOUND="${FOUND}${file}:\n${MATCHES}\n\n"
    fi
  fi
done

if [ -n "$FOUND" ]; then
  MSG=$(printf "シークレット漏洩の可能性を検出しました:\n%b環境変数またはシークレットマネージャーを使用してください。" "$FOUND")
  echo "{\"decision\":\"block\",\"reason\":$(echo "$MSG" | jq -Rs .)}"
  exit 2
fi

exit 0
