#!/usr/bin/env bash
# =============================================================================
# QA Gate — エージェント出力（output.json）の機械検証
#
# QA Reviewer の前段として、LLM を使わずに秒で検出できる問題を洗い出す。
# パイプラインの各ステップ完了後・差し戻し判定の一次フィルタとして使う。
#
# 検証項目:
#   1. output.json が存在するか
#   2. JSON として正しくパースできるか（唯一のハードエラー）
#   3. トークン予算（CLAUDE.md 基準: 2000トークン）を超えていないか（警告）
#   4. prompt.md が 200 行以内か（警告）
#   5. 中身が空・プレースホルダのみでないか（警告）
#
# 使い方:
#   bash scripts/qa-gate.sh <agent_name> [<agent_name>...]  # 指定エージェントのみ
#   bash scripts/qa-gate.sh --all                           # output.json を持つ全員
#   bash scripts/qa-gate.sh --all --json                    # JSON出力（CI/CD・Skill連携用）
#
# 終了コード: 0 = 合格（警告含む） / 1 = ハードエラー（JSONパース不能・欠落）
# =============================================================================

set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
AGENTS_DIR="$PROJECT_ROOT/agents"

TOKEN_BUDGET=2000   # output.json の上限目安（CLAUDE.md）
PROMPT_LINE_BUDGET=200

JSON_MODE=0
TARGETS=()
for arg in "$@"; do
  case "$arg" in
    --json) JSON_MODE=1 ;;
    --all)
      while IFS= read -r f; do
        TARGETS+=("$(basename "$(dirname "$f")")")
      done < <(find "$AGENTS_DIR" -maxdepth 2 -name output.json | sort)
      ;;
    *) TARGETS+=("$arg") ;;
  esac
done

if [ ${#TARGETS[@]} -eq 0 ]; then
  echo "使い方: bash scripts/qa-gate.sh <agent_name>... | --all [--json]" >&2
  exit 1
fi

estimate_tokens() {
  # 日本語混在テキスト: バイト数 / 3 を近似値として使用（context-budget.sh と同一基準）
  local bytes
  bytes=$(wc -c < "$1" 2>/dev/null || echo 0)
  echo $(( bytes / 3 ))
}

HARD_ERRORS=0
WARN_COUNT=0
RESULTS=()  # JSON出力用: agent|status|tokens|messages

check_agent() {
  local agent="$1"
  local dir="$AGENTS_DIR/$agent"
  local out="$dir/output.json"
  local prompt="$dir/prompt.md"
  local msgs=()
  local status="pass"

  if [ ! -d "$dir" ]; then
    status="error"; msgs+=("エージェントディレクトリが存在しません")
    HARD_ERRORS=$((HARD_ERRORS + 1))
    report_agent "$agent" "$status" 0 "${msgs[@]}"
    return
  fi

  # 1-2. output.json の存在と JSON 妥当性
  local tokens=0
  if [ ! -f "$out" ]; then
    status="error"; msgs+=("output.json がありません")
    HARD_ERRORS=$((HARD_ERRORS + 1))
  elif ! python3 -m json.tool "$out" > /dev/null 2>&1; then
    status="error"; msgs+=("output.json が JSON としてパースできません")
    HARD_ERRORS=$((HARD_ERRORS + 1))
  else
    tokens=$(estimate_tokens "$out")
    # 3. トークン予算
    if [ "$tokens" -gt "$TOKEN_BUDGET" ]; then
      [ "$status" = "pass" ] && status="warn"
      msgs+=("推定 ${tokens} トークンで予算 ${TOKEN_BUDGET} を超過。要点のみに圧縮を推奨")
      WARN_COUNT=$((WARN_COUNT + 1))
    fi
    # 5. 空・プレースホルダ検出
    local bytes
    bytes=$(wc -c < "$out")
    if [ "$bytes" -lt 50 ]; then
      [ "$status" = "pass" ] && status="warn"
      msgs+=("output.json がほぼ空です（${bytes} bytes）")
      WARN_COUNT=$((WARN_COUNT + 1))
    elif grep -qE '\{\{[^}]+\}\}|TODO|PLACEHOLDER|FIXME' "$out"; then
      [ "$status" = "pass" ] && status="warn"
      msgs+=("プレースホルダ（{{ }}/TODO 等）が残っています")
      WARN_COUNT=$((WARN_COUNT + 1))
    fi
  fi

  # 4. prompt.md の行数
  if [ -f "$prompt" ]; then
    local lines
    lines=$(wc -l < "$prompt")
    if [ "$lines" -gt "$PROMPT_LINE_BUDGET" ]; then
      [ "$status" = "pass" ] && status="warn"
      msgs+=("prompt.md が ${lines} 行で上限 ${PROMPT_LINE_BUDGET} 行を超過")
      WARN_COUNT=$((WARN_COUNT + 1))
    fi
  fi

  report_agent "$agent" "$status" "$tokens" "${msgs[@]}"
}

report_agent() {
  local agent="$1" status="$2" tokens="$3"
  shift 3
  local msgs=("$@")

  if [ "$JSON_MODE" -eq 1 ]; then
    local joined=""
    for m in "${msgs[@]}"; do
      joined="${joined}${joined:+; }${m}"
    done
    RESULTS+=("{\"agent\":\"$agent\",\"status\":\"$status\",\"tokens\":$tokens,\"messages\":\"$joined\"}")
  else
    case "$status" in
      pass)  echo "  [OK]   $agent (${tokens}tok)" ;;
      warn)  echo "  [WARN] $agent (${tokens}tok)" ;;
      error) echo "  [ERR]  $agent" ;;
    esac
    for m in "${msgs[@]}"; do
      echo "         - $m"
    done
  fi
}

[ "$JSON_MODE" -eq 0 ] && echo "=== QA Gate — output.json 機械検証 ==="

for agent in "${TARGETS[@]}"; do
  check_agent "$agent"
done

if [ "$JSON_MODE" -eq 1 ]; then
  printf '{"hard_errors":%d,"warnings":%d,"results":[' "$HARD_ERRORS" "$WARN_COUNT"
  first=1
  for r in "${RESULTS[@]}"; do
    [ "$first" -eq 0 ] && printf ','
    printf '%s' "$r"
    first=0
  done
  printf ']}\n'
else
  echo ""
  echo "結果: 対象 ${#TARGETS[@]} 件 / ハードエラー ${HARD_ERRORS} 件 / 警告 ${WARN_COUNT} 件"
  [ "$HARD_ERRORS" -gt 0 ] && echo "→ ハードエラーのあるエージェントは差し戻してください"
fi

[ "$HARD_ERRORS" -gt 0 ] && exit 1
exit 0
