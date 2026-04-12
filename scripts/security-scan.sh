#!/usr/bin/env bash
# =============================================================================
# Security Scanner — AgentShield ライト版
# ECC (everything-claude-code) の AgentShield を参考に構築
#
# 5つのカテゴリでプロジェクトのセキュリティを監査:
#   1. シークレット検出（全ファイル）
#   2. 設定ファイル監査（.claude/settings.json）
#   3. Hook スクリプト検査
#   4. .gitignore 検証
#   5. エージェントプロンプト検査
#
# 使い方:
#   bash scripts/security-scan.sh          # 通常スキャン（ターミナル出力）
#   bash scripts/security-scan.sh --json   # JSON出力
#   bash scripts/security-scan.sh --report # レポートファイル生成
# =============================================================================

set -o pipefail

# --- 設定 ---
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT_MODE="${1:-terminal}"
REPORT_FILE="$PROJECT_ROOT/security-report.json"
TODAY=$(date +%Y-%m-%d)

# カウンター
CRITICAL=0
HIGH=0
MEDIUM=0
LOW=0
INFO=0
FINDINGS=()

# --- ユーティリティ ---
add_finding() {
  local severity="$1"
  local category="$2"
  local message="$3"
  local file="${4:-}"

  case "$severity" in
    critical) ((CRITICAL++)) || true ;;
    high)     ((HIGH++)) || true ;;
    medium)   ((MEDIUM++)) || true ;;
    low)      ((LOW++)) || true ;;
    info)     ((INFO++)) || true ;;
  esac

  FINDINGS+=("{\"severity\":\"$severity\",\"category\":\"$category\",\"message\":$(echo "$message" | jq -Rs .),\"file\":$(echo "$file" | jq -Rs .)}")

  if [ "$OUTPUT_MODE" = "terminal" ]; then
    local icon=""
    case "$severity" in
      critical) icon="[CRITICAL]" ;;
      high)     icon="[HIGH]    " ;;
      medium)   icon="[MEDIUM]  " ;;
      low)      icon="[LOW]     " ;;
      info)     icon="[INFO]    " ;;
    esac
    echo "  $icon $message"
    [ -n "$file" ] && echo "           -> $file"
  fi
}

# =============================================================================
# カテゴリ 1: シークレット検出
# =============================================================================
scan_secrets() {
  [ "$OUTPUT_MODE" = "terminal" ] && echo ""
  [ "$OUTPUT_MODE" = "terminal" ] && echo "=== 1/5 シークレット検出 ==="

  local patterns=(
    'AKIA[0-9A-Z]{16}'                           # AWS Access Key ID
    'sk-[a-zA-Z0-9]{20,}'                        # OpenAI / Stripe Secret Key
    'sk-ant-[a-zA-Z0-9-]{20,}'                   # Anthropic API Key
    'ghp_[a-zA-Z0-9]{36}'                        # GitHub Personal Access Token
    'gho_[a-zA-Z0-9]{36}'                        # GitHub OAuth Token
    'glpat-[a-zA-Z0-9_-]{20,}'                   # GitLab Personal Access Token
    'xox[bpors]-[a-zA-Z0-9-]+'                   # Slack Token
    'Bearer\s+[a-zA-Z0-9_\-\.]{20,}'            # Bearer Token
    'eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.'   # JWT Token
    'SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}'  # SendGrid API Key
    'rk_live_[a-zA-Z0-9]{20,}'                   # Stripe Restricted Key
    'sq0atp-[a-zA-Z0-9_-]{22}'                   # Square Access Token
  )

  local combined_pattern=$(IFS='|'; echo "${patterns[*]}")
  local found=0

  # .git, node_modules, design-md を除外してスキャン
  while IFS= read -r line; do
    local file=$(echo "$line" | cut -d: -f1)
    local linenum=$(echo "$line" | cut -d: -f2)
    add_finding "critical" "secrets" "シークレットの可能性を検出 (L${linenum})" "$file"
    ((found++)) || true
  done < <(grep -rnE "$combined_pattern" "$PROJECT_ROOT" \
    --include='*.md' --include='*.json' --include='*.js' --include='*.ts' \
    --include='*.py' --include='*.sh' --include='*.yaml' --include='*.yml' \
    --include='*.env*' --include='*.toml' --include='*.cfg' \
    --exclude-dir='.git' --exclude-dir='node_modules' --exclude-dir='design-md' \
    --exclude='security-scan.sh' --exclude='secret-scan.sh' \
    2>/dev/null || true)

  # .env ファイルの存在チェック
  while IFS= read -r envfile; do
    add_finding "high" "secrets" ".env ファイルがリポジトリに存在します" "$envfile"
    ((found++)) || true
  done < <(find "$PROJECT_ROOT" -name '.env' -o -name '.env.local' -o -name '.env.production' \
    -not -path '*/.git/*' -not -path '*/node_modules/*' 2>/dev/null || true)

  if [ "$found" -eq 0 ]; then
    add_finding "info" "secrets" "シークレットは検出されませんでした"
  fi
}

# =============================================================================
# カテゴリ 2: 設定ファイル監査
# =============================================================================
scan_settings() {
  [ "$OUTPUT_MODE" = "terminal" ] && echo ""
  [ "$OUTPUT_MODE" = "terminal" ] && echo "=== 2/5 設定ファイル監査 ==="

  local settings="$PROJECT_ROOT/.claude/settings.json"

  if [ ! -f "$settings" ]; then
    add_finding "medium" "settings" ".claude/settings.json が存在しません。Hooksによるガードレールが未設定です"
    return
  fi

  # JSON の妥当性チェック
  if ! jq empty "$settings" 2>/dev/null; then
    add_finding "high" "settings" "settings.json が不正な JSON です" "$settings"
    return
  fi

  # Hooks が定義されているか
  local hook_count=$(jq '[.hooks // {} | to_entries[].value | length] | add // 0' "$settings" 2>/dev/null)
  if [ "$hook_count" -eq 0 ]; then
    add_finding "medium" "settings" "Hooks が定義されていません。品質ガードレールの導入を推奨します"
  else
    add_finding "info" "settings" "Hooks が ${hook_count} 件定義されています"
  fi

  # PreToolUse にシークレットスキャンHookがあるか
  local has_secret_scan=$(jq '.hooks.PreToolUse // [] | map(select(.description | test("シークレット|secret"; "i"))) | length' "$settings" 2>/dev/null)
  if [ "$has_secret_scan" -eq 0 ]; then
    add_finding "medium" "settings" "PreToolUse にシークレットスキャン Hook がありません"
  fi

  add_finding "info" "settings" "settings.json の監査が完了しました" "$settings"
}

# =============================================================================
# カテゴリ 3: Hook スクリプト検査
# =============================================================================
scan_hooks() {
  [ "$OUTPUT_MODE" = "terminal" ] && echo ""
  [ "$OUTPUT_MODE" = "terminal" ] && echo "=== 3/5 Hook スクリプト検査 ==="

  local hooks_dir="$PROJECT_ROOT/scripts/hooks"

  if [ ! -d "$hooks_dir" ]; then
    add_finding "info" "hooks" "Hook スクリプトディレクトリが存在しません"
    return
  fi

  local hook_count=0
  while IFS= read -r script; do
    ((hook_count++)) || true

    # 実行権限チェック
    if [ ! -x "$script" ]; then
      add_finding "low" "hooks" "実行権限がありません" "$script"
    fi

    # 危険なコマンドパターン検出（jqやset内の正常な$()展開は除外）
    if grep -vE '^\s*#|jq|set\s|local\s|INPUT=|CMD=|MSG=|FOUND=|FILE_PATH=|BRANCH=|UNPUSHED=|EXISTING=' "$script" 2>/dev/null | grep -qE 'eval\s|exec\s' 2>/dev/null; then
      add_finding "high" "hooks" "潜在的なコマンドインジェクションリスク（eval/exec）" "$script"
    fi

    # curl/wget による外部送信検出
    if grep -qE 'curl\s|wget\s' "$script" 2>/dev/null; then
      add_finding "medium" "hooks" "外部通信（curl/wget）を検出。データ漏洩リスクを確認してください" "$script"
    fi

    # rm -rf の検出
    if grep -qE 'rm\s+-rf|rm\s+-fr' "$script" 2>/dev/null; then
      add_finding "high" "hooks" "破壊的操作（rm -rf）を検出" "$script"
    fi

    # set -euo pipefail の確認
    if ! grep -q 'set -euo pipefail\|set -e' "$script" 2>/dev/null; then
      add_finding "low" "hooks" "set -e が未設定。エラー時に処理が続行される可能性があります" "$script"
    fi

  done < <(find "$hooks_dir" -name '*.sh' -type f 2>/dev/null)

  if [ "$hook_count" -eq 0 ]; then
    add_finding "info" "hooks" "Hook スクリプトが見つかりませんでした"
  else
    add_finding "info" "hooks" "${hook_count} 件の Hook スクリプトを検査しました"
  fi
}

# =============================================================================
# カテゴリ 4: .gitignore 検証
# =============================================================================
scan_gitignore() {
  [ "$OUTPUT_MODE" = "terminal" ] && echo ""
  [ "$OUTPUT_MODE" = "terminal" ] && echo "=== 4/5 .gitignore 検証 ==="

  local gitignore="$PROJECT_ROOT/.gitignore"

  if [ ! -f "$gitignore" ]; then
    add_finding "high" "gitignore" ".gitignore が存在しません。シークレットファイルがコミットされるリスクがあります"
    return
  fi

  # 必須エントリのチェック
  local required_patterns=(".env" "node_modules" ".DS_Store" "*.log")
  for pattern in "${required_patterns[@]}"; do
    if ! grep -qF "$pattern" "$gitignore" 2>/dev/null; then
      add_finding "medium" "gitignore" "推奨パターン '${pattern}' が .gitignore に含まれていません" "$gitignore"
    fi
  done

  # セキュリティ関連の推奨エントリ
  local security_patterns=(".env.local" ".env.production" "credentials" "*.pem" "*.key")
  local missing_security=0
  for pattern in "${security_patterns[@]}"; do
    if ! grep -qiF "$pattern" "$gitignore" 2>/dev/null; then
      ((missing_security++)) || true
    fi
  done

  if [ "$missing_security" -gt 2 ]; then
    add_finding "low" "gitignore" "セキュリティ関連パターン（.env.local, credentials, *.pem 等）の追加を推奨" "$gitignore"
  fi

  add_finding "info" "gitignore" ".gitignore の検証が完了しました"
}

# =============================================================================
# カテゴリ 5: エージェントプロンプト検査
# =============================================================================
scan_agent_prompts() {
  [ "$OUTPUT_MODE" = "terminal" ] && echo ""
  [ "$OUTPUT_MODE" = "terminal" ] && echo "=== 5/5 エージェントプロンプト検査 ==="

  local agents_dir="$PROJECT_ROOT/agents"

  if [ ! -d "$agents_dir" ]; then
    add_finding "info" "agents" "エージェントディレクトリが存在しません"
    return
  fi

  local prompt_count=0
  local missing_checks=0
  local missing_interference=0

  while IFS= read -r prompt; do
    ((prompt_count++)) || true

    # 相互干渉セクションの存在確認
    if ! grep -q '相互干渉' "$prompt" 2>/dev/null; then
      add_finding "medium" "agents" "相互干渉（チェック&バランス）セクションがありません" "$prompt"
      ((missing_interference++)) || true
    fi

    # 開発系エージェントのセキュリティ意識チェック
    local agent_name=$(basename "$(dirname "$prompt")")
    case "$agent_name" in
      frontend_engineer|backend_engineer|engineer|infrastructure|tech_lead|data_engineer)
        if ! grep -qiE 'セキュリティ|security|OWASP|脆弱性|vulnerability' "$prompt" 2>/dev/null; then
          add_finding "medium" "agents" "開発エージェントにセキュリティ関連の記述がありません" "$prompt"
          ((missing_checks++)) || true
        fi
        ;;
    esac

    # 出力フォーマットの定義確認
    if ! grep -qE 'output\.json|出力フォーマット|出力形式' "$prompt" 2>/dev/null; then
      add_finding "low" "agents" "出力フォーマットの定義がありません" "$prompt"
    fi

  done < <(find "$agents_dir" -name 'prompt.md' -type f 2>/dev/null)

  if [ "$missing_interference" -gt 0 ]; then
    add_finding "medium" "agents" "${missing_interference} 体のエージェントに相互干渉セクションが未定義です"
  fi

  add_finding "info" "agents" "${prompt_count} 件のエージェントプロンプトを検査しました"
}

# =============================================================================
# スコアリング & レポート
# =============================================================================
calculate_grade() {
  # 100点からの減点方式
  local score=100
  score=$((score - CRITICAL * 20))
  score=$((score - HIGH * 10))
  score=$((score - MEDIUM * 5))
  score=$((score - LOW * 2))

  # 下限は0
  [ "$score" -lt 0 ] && score=0

  local grade=""
  if [ "$score" -ge 90 ]; then grade="A"
  elif [ "$score" -ge 75 ]; then grade="B"
  elif [ "$score" -ge 60 ]; then grade="C"
  elif [ "$score" -ge 40 ]; then grade="D"
  else grade="F"
  fi

  echo "$score $grade"
}

output_report() {
  local result=$(calculate_grade)
  local score=$(echo "$result" | cut -d' ' -f1)
  local grade=$(echo "$result" | cut -d' ' -f2)

  if [ "$OUTPUT_MODE" = "terminal" ]; then
    echo ""
    echo "==========================================="
    echo "  セキュリティスキャン結果"
    echo "==========================================="
    echo "  日付:     $TODAY"
    echo "  スコア:   $score / 100"
    echo "  グレード: $grade"
    echo ""
    echo "  Critical: $CRITICAL"
    echo "  High:     $HIGH"
    echo "  Medium:   $MEDIUM"
    echo "  Low:      $LOW"
    echo "  Info:     $INFO"
    echo "==========================================="

    if [ "$CRITICAL" -gt 0 ]; then
      echo ""
      echo "  [!] Critical な問題が見つかりました。即時対応が必要です。"
    fi
  fi

  if [ "$OUTPUT_MODE" = "--json" ] || [ "$OUTPUT_MODE" = "--report" ]; then
    local findings_json=$(printf '%s\n' "${FINDINGS[@]}" | jq -s '.')
    local report=$(jq -n \
      --arg date "$TODAY" \
      --arg score "$score" \
      --arg grade "$grade" \
      --arg critical "$CRITICAL" \
      --arg high "$HIGH" \
      --arg medium "$MEDIUM" \
      --arg low "$LOW" \
      --arg info "$INFO" \
      --argjson findings "$findings_json" \
      '{
        scan_date: $date,
        score: ($score | tonumber),
        grade: $grade,
        summary: {
          critical: ($critical | tonumber),
          high: ($high | tonumber),
          medium: ($medium | tonumber),
          low: ($low | tonumber),
          info: ($info | tonumber)
        },
        findings: $findings
      }')

    if [ "$OUTPUT_MODE" = "--report" ]; then
      echo "$report" > "$REPORT_FILE"
      [ "$OUTPUT_MODE" != "--json" ] && echo "レポートを保存しました: $REPORT_FILE"
    else
      echo "$report"
    fi
  fi
}

# =============================================================================
# メイン実行
# =============================================================================
main() {
  [ "$OUTPUT_MODE" = "terminal" ] && echo "Security Scanner — セキュリティ監査を開始します..."
  [ "$OUTPUT_MODE" = "terminal" ] && echo "プロジェクト: $PROJECT_ROOT"

  cd "$PROJECT_ROOT"

  scan_secrets
  scan_settings
  scan_hooks
  scan_gitignore
  scan_agent_prompts

  output_report
}

main
