#!/usr/bin/env bash
# Phase1 チケットを GitHub Issues に一括起票する。
# 専用リポジトリ作成後に実行してください(要 gh CLI + 認証)。
# 使い方: REPO=owner/keibi-pro bash create-issues.sh
#   先に gh auth login / gh repo create を済ませること。
# ラベル・マイルストーンは未作成なら gh が警告するため、必要に応じ事前作成。
set -euo pipefail
cd "$(dirname "$0")"

: "${REPO:?REPO=owner/repo を指定してください}"
JSON="phase1-issues.json"

command -v gh >/dev/null || { echo "gh CLI が必要です"; exit 1; }
command -v jq >/dev/null || { echo "jq が必要です"; exit 1; }

# マイルストーン作成(存在すればスキップ)
for ms in "MS-1 基盤+マスタ" "MS-2 受注〜実績" "MS-3 請求〜入金" "MS-4 モバイル日報" "MS-5 仕上げ"; do
  gh api "repos/$REPO/milestones" -f title="$ms" >/dev/null 2>&1 || true
done

count=$(jq length "$JSON")
echo "起票対象: $count 件 → $REPO"
for i in $(seq 0 $((count-1))); do
  title=$(jq -r ".[$i].title" "$JSON")
  body=$(jq -r ".[$i].body" "$JSON")
  ms=$(jq -r ".[$i].milestone" "$JSON")
  labels=$(jq -r ".[$i].labels | join(\",\")" "$JSON")
  deps=$(jq -r ".[$i].deps | join(\", \")" "$JSON")
  full_body="${body}

依存: ${deps:-なし}
詳細: STARTER/PHASE1_TICKETS.md"
  echo "→ $title"
  gh issue create --repo "$REPO" --title "$title" --body "$full_body" \
    --label "$labels" --milestone "$ms" || echo "  (ラベル/マイルストーン未作成の可能性。--label を外して再試行可)"
done
echo "完了。"
