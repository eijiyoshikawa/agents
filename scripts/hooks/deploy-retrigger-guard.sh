#!/usr/bin/env bash
# PreToolUse hook: デプロイ再トリガー目的の空コミット・自動コミット生成を物理ブロック
# 背景: 空コミットの定期自動pushが GitHub abuse detection に抵触しアカウントが
#       フラグされた実績がある(2026-08)。CLAUDE.md「デプロイ再トリガーの禁止事項」の強制装置。
# stdin: JSON { "tool_name": "Bash", "tool_input": { "command": "..." } }
# exit 0 = allow, exit 2 = block (stderrがClaudeへのフィードバックになる)

set -euo pipefail

INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || true)
[ -z "$CMD" ] && exit 0

block() {
  echo "【恒久ルール違反のためブロック】$1
デプロイの再実行が必要な場合は GitHub を経由しない方法を使うこと:
  1) Vercel Deploy Hook に curl -X POST  2) VercelダッシュボードのRedeploy  3) npx vercel --prod" >&2
  exit 2
}

# --- 1) 空コミットフラグの禁止 ---
if echo "$CMD" | grep -qE 'git(\s+-C\s+\S+)?\s+commit' && echo "$CMD" | grep -qE '\-\-allow\-empty'; then
  block "git commit --allow-empty（空コミット）は禁止です。実変更があるときのみコミットしてください。"
fi

# --- 2) ループ・スケジューラによる commit/push の自動生成の禁止 ---
#     ※ 失敗時の有限リトライ(for i in 1 2 3 4; ...)は正当なので対象外
if echo "$CMD" | grep -qE '\b(while|until)\b.*\bdo\b' && echo "$CMD" | grep -qE 'git\s+(commit|push)'; then
  block "無限ループ内での git commit/push は禁止です（自動コミット生成の防止）。"
fi
if echo "$CMD" | grep -qE '(^|[;&|]|\$\()[[:space:]]*crontab([[:space:]]|$)' && echo "$CMD" | grep -qE 'git[[:space:]]+(commit|push)'; then
  block "crontab への git 操作の登録は禁止です（定期コミット生成の防止）。"
fi
if echo "$CMD" | grep -qE '(^|\s|;|&&|\|)watch\s' && echo "$CMD" | grep -qE 'git\s+(commit|push)'; then
  block "watch による git commit/push の定期実行は禁止です。"
fi

# --- 3) push 直前の空コミット検出（--allow-empty以外の経路で作られた空コミットも捕捉） ---
#     直近コミットが「親とツリー同一（＝差分ゼロ）」なら push をブロックする。
#     マージコミット(親2つ)・初回コミット・git情報が取れない場合は素通し（誤ブロック防止）。
if echo "$CMD" | grep -qE 'git(\s+-C\s+\S+)?\s+push' && ! echo "$CMD" | grep -qE '\-\-delete|\-\-tags'; then
  if git rev-parse -q --verify 'HEAD^' >/dev/null 2>&1 && ! git rev-parse -q --verify 'HEAD^2' >/dev/null 2>&1; then
    if git diff --quiet 'HEAD^' HEAD 2>/dev/null; then
      block "直近のコミット（$(git log -1 --format='%h %s' 2>/dev/null || echo HEAD)）は差分ゼロの空コミットです。push できません。実変更を含めるか、git reset --soft HEAD^ で取り消してください。"
    fi
  fi
fi

exit 0
