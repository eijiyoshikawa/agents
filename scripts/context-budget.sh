#!/usr/bin/env bash
# =============================================================================
# Context Budget Auditor — コンテキスト予算監査
# ECC の context-budget スキルを参考に構築
#
# プロジェクト内のトークン消費量を見積もり、最適化提案を生成する。
# トークン見積もり: 単語数 × 1.3（日本語は文字数 × 0.5）
#
# 使い方:
#   bash scripts/context-budget.sh           # 通常出力
#   bash scripts/context-budget.sh --verbose # ファイル別詳細
#   bash scripts/context-budget.sh --json    # JSON出力
# =============================================================================

set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MODE="${1:-normal}"

# --- トークン見積もり ---
estimate_tokens() {
  local file="$1"
  if [ ! -f "$file" ]; then
    echo 0
    return
  fi
  # 日本語混在テキスト: バイト数 / 3 を近似値として使用
  local bytes=$(wc -c < "$file" 2>/dev/null || echo 0)
  echo $(( bytes / 3 ))
}

count_lines() {
  local file="$1"
  wc -l < "$file" 2>/dev/null || echo 0
}

# --- カウンター ---
TOTAL_TOKENS=0
WARNINGS=()
RECOMMENDATIONS=()

section_header() {
  [ "$MODE" != "--json" ] && echo ""
  [ "$MODE" != "--json" ] && echo "=== $1 ==="
}

add_warning() {
  WARNINGS+=("$1")
  [ "$MODE" != "--json" ] && echo "  [!] $1"
}

add_recommendation() {
  local msg="$1"
  local savings="$2"
  RECOMMENDATIONS+=("{\"recommendation\":$(echo "$msg" | jq -Rs .),\"estimated_savings\":$savings}")
  [ "$MODE" != "--json" ] && echo "  [>] $msg (約${savings}トークン削減)"
}

# =============================================================================
# 1. CLAUDE.md 監査
# =============================================================================
audit_claude_md() {
  section_header "1. CLAUDE.md"

  local file="$PROJECT_ROOT/CLAUDE.md"
  if [ ! -f "$file" ]; then
    [ "$MODE" != "--json" ] && echo "  CLAUDE.md が見つかりません"
    return
  fi

  local lines=$(count_lines "$file")
  local tokens=$(estimate_tokens "$file")
  TOTAL_TOKENS=$((TOTAL_TOKENS + tokens))

  [ "$MODE" != "--json" ] && echo "  行数: ${lines}  推定トークン: ${tokens}"

  if [ "$lines" -gt 300 ]; then
    add_warning "CLAUDE.md が ${lines} 行です（推奨: 300行以内）"
    local excess=$(( (lines - 300) * tokens / lines ))
    add_recommendation "CLAUDE.md の冗長なセクションを整理（組織図のASCIIアートなど）" "$excess"
  fi
}

# =============================================================================
# 2. エージェントプロンプト監査
# =============================================================================
audit_agents() {
  section_header "2. エージェントプロンプト"

  local total_agent_tokens=0
  local agent_count=0
  local heavy_agents=()

  while IFS= read -r prompt; do
    local lines=$(count_lines "$prompt")
    local tokens=$(estimate_tokens "$prompt")
    total_agent_tokens=$((total_agent_tokens + tokens))
    ((agent_count++)) || true

    local agent_name=$(echo "$prompt" | sed "s|$PROJECT_ROOT/agents/||" | sed 's|/prompt.md||')

    if [ "$MODE" = "--verbose" ]; then
      echo "  ${agent_name}: ${lines}行 / ${tokens}トークン"
    fi

    if [ "$lines" -gt 200 ]; then
      heavy_agents+=("$agent_name(${lines}行)")
    fi
  done < <(find "$PROJECT_ROOT/agents" -name 'prompt.md' -type f 2>/dev/null | sort)

  TOTAL_TOKENS=$((TOTAL_TOKENS + total_agent_tokens))

  [ "$MODE" != "--json" ] && echo "  エージェント数: ${agent_count}  合計トークン: ${total_agent_tokens}"

  if [ "${#heavy_agents[@]}" -gt 0 ]; then
    add_warning "200行超のエージェント: ${heavy_agents[*]}"
    add_recommendation "大規模プロンプトの分割・簡潔化を検討" 500
  fi
}

# =============================================================================
# 3. 出力ファイル（output.json）監査
# =============================================================================
audit_outputs() {
  section_header "3. 出力ファイル (output.json)"

  local total_output_tokens=0
  local output_count=0
  local large_outputs=()

  while IFS= read -r output; do
    local tokens=$(estimate_tokens "$output")
    total_output_tokens=$((total_output_tokens + tokens))
    ((output_count++)) || true

    local agent_name=$(echo "$output" | sed "s|$PROJECT_ROOT/agents/||" | sed 's|/output.json||')

    if [ "$tokens" -gt 2000 ]; then
      large_outputs+=("$agent_name(${tokens}tok)")
    fi
  done < <(find "$PROJECT_ROOT/agents" -name 'output.json' -type f 2>/dev/null | sort)

  TOTAL_TOKENS=$((TOTAL_TOKENS + total_output_tokens))

  [ "$MODE" != "--json" ] && echo "  出力ファイル数: ${output_count}  合計トークン: ${total_output_tokens}"

  if [ "${#large_outputs[@]}" -gt 0 ]; then
    add_warning "2000トークン超の出力: ${large_outputs[*]}"
    add_recommendation "大規模output.jsonの要約・必要フィールドのみ保持" 1000
  fi
}

# =============================================================================
# 4. デザインシステム監査
# =============================================================================
audit_design_md() {
  section_header "4. デザインシステム (design-md/)"

  local design_dir="$PROJECT_ROOT/design-md"
  if [ ! -d "$design_dir" ]; then
    [ "$MODE" != "--json" ] && echo "  design-md/ が見つかりません"
    return
  fi

  local total_design_tokens=0
  local design_count=0

  while IFS= read -r dfile; do
    local tokens=$(estimate_tokens "$dfile")
    total_design_tokens=$((total_design_tokens + tokens))
    ((design_count++)) || true
  done < <(find "$design_dir" -name 'DESIGN.md' -type f 2>/dev/null)

  # design-md は参照時のみ読み込まれるため、常時消費ではない
  [ "$MODE" != "--json" ] && echo "  デザインファイル数: ${design_count}  合計トークン: ${total_design_tokens}（参照時のみ消費）"

  if [ "$design_count" -gt 50 ]; then
    add_recommendation "使用頻度の低いデザインファイルをアーカイブ" 0
  fi
}

# =============================================================================
# 5. 日次レポート監査
# =============================================================================
audit_daily_reports() {
  section_header "5. 日次レポート"

  local reports_dir="$PROJECT_ROOT/daily_reports"
  if [ ! -d "$reports_dir" ]; then
    [ "$MODE" != "--json" ] && echo "  daily_reports/ が見つかりません"
    return
  fi

  local total_report_tokens=0
  local report_count=0

  while IFS= read -r report; do
    local tokens=$(estimate_tokens "$report")
    total_report_tokens=$((total_report_tokens + tokens))
    ((report_count++)) || true
  done < <(find "$reports_dir" -name '*.md' -type f 2>/dev/null)

  [ "$MODE" != "--json" ] && echo "  レポート数: ${report_count}  合計トークン: ${total_report_tokens}（参照時のみ消費）"

  if [ "$report_count" -gt 30 ]; then
    add_recommendation "古い日次レポートをアーカイブ（30日超）" 0
  fi
}

# =============================================================================
# 6. MCP設定の確認
# =============================================================================
audit_mcp() {
  section_header "6. MCP サーバー"

  # .claude/settings.json からMCP設定を確認
  local settings="$PROJECT_ROOT/.claude/settings.json"
  if [ -f "$settings" ]; then
    local mcp_count=$(jq '.mcpServers // {} | length' "$settings" 2>/dev/null || echo 0)
    [ "$MODE" != "--json" ] && echo "  設定済みMCPサーバー: ${mcp_count}"

    if [ "$mcp_count" -gt 10 ]; then
      local excess_tokens=$(( (mcp_count - 10) * 500 ))
      add_warning "MCP サーバーが ${mcp_count} 個（推奨: 10個以内）。各ツールスキーマは約500トークン消費"
      add_recommendation "使用頻度の低いMCPサーバーを disabledMcpServers で無効化" "$excess_tokens"
    fi
  else
    [ "$MODE" != "--json" ] && echo "  MCP設定なし"
  fi

  [ "$MODE" != "--json" ] && echo ""
  [ "$MODE" != "--json" ] && echo "  [参考] MCP はコンテキスト最大の消費源。各ツールスキーマ ≈ 500���ークン"
  [ "$MODE" != "--json" ] && echo "  [参考] 推奨: MCP 10個以内 / アクティブツール 80個以内"
}

# =============================================================================
# レポート出力
# =============================================================================
output_report() {
  if [ "$MODE" = "--json" ]; then
    local warnings_json=$(printf '%s\n' "${WARNINGS[@]}" | jq -Rs 'split("\n") | map(select(. != ""))')
    local recs_json=$(printf '%s\n' "${RECOMMENDATIONS[@]}" | jq -s '.')
    jq -n \
      --arg date "$(date +%Y-%m-%d)" \
      --arg total "$TOTAL_TOKENS" \
      --argjson warnings "$warnings_json" \
      --argjson recommendations "$recs_json" \
      '{
        audit_date: $date,
        total_estimated_tokens: ($total | tonumber),
        warnings: $warnings,
        recommendations: $recommendations
      }'
  else
    echo ""
    echo "==========================================="
    echo "  コンテキスト予算監査サマリー"
    echo "==========================================="
    echo "  合計推定トークン: ${TOTAL_TOKENS}"
    echo "  警告: ${#WARNINGS[@]} 件"
    echo "  最適化提案: ${#RECOMMENDATIONS[@]} 件"
    echo ""
    echo "  [参考] Claude Code Max プランのコンテキスト上限:"
    echo "    Opus:   200K トークン"
    echo "    Sonnet: 200K トークン"
    echo ""
    echo "  [ベストプラクティス]"
    echo "    ・セッション中に全ファイルを読まない（必要な部分だけ読む）"
    echo "    ・エージェント間受け渡しは output.json のみ"
    echo "    ・MCP サーバーは 10個以内に制限"
    echo "    ・長いセッションでは論理的区切りで /compact"
    echo "==========================================="
  fi
}

# =============================================================================
# メイン
# =============================================================================
main() {
  [ "$MODE" != "--json" ] && echo "Context Budget Auditor — コンテキスト予算監査を開始します..."
  [ "$MODE" != "--json" ] && echo "プロジェクト: $PROJECT_ROOT"

  cd "$PROJECT_ROOT"

  audit_claude_md
  audit_agents
  audit_outputs
  audit_design_md
  audit_daily_reports
  audit_mcp

  output_report
}

main
