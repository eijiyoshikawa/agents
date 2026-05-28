#!/usr/bin/env bash
# 株式会社一二三 採用LP 3パターンを Vercel にデプロイするスクリプト
#
# 前提:
#   1) Node.js / npm が入っている
#   2) Vercel CLI が入っている     → npm install -g vercel
#   3) Vercel にログイン済み        → vercel login
#
# 使い方:
#   bash scripts/deploy-hifumi-vercel.sh
#
# オプション:
#   --slug-prefix PREFIX   プロジェクト名の接頭辞（既定: hifumi-123）
#   --no-install           npm install をスキップ
#   --only modern|classic|pop  特定のパターンのみデプロイ
#
# 出力:
#   - 各プロジェクトの公開URL（標準出力）
#   - outputs/recruitment-lp/deployment-urls.json （後で参照可能）

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUTS_DIR="$REPO_ROOT/outputs/recruitment-lp"
RESULTS_FILE="$OUTPUTS_DIR/deployment-urls.json"

SLUG_PREFIX="hifumi-123"
SKIP_INSTALL=false
ONLY=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --slug-prefix) SLUG_PREFIX="$2"; shift 2 ;;
    --no-install) SKIP_INSTALL=true; shift ;;
    --only) ONLY="$2"; shift 2 ;;
    -h|--help)
      sed -n '1,20p' "$0"
      exit 0
      ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

# --------------------------------------------------
# 前提チェック
# --------------------------------------------------
if ! command -v vercel >/dev/null 2>&1; then
  cat >&2 <<EOF
Error: Vercel CLI が見つかりません。
インストール:
  npm install -g vercel
EOF
  exit 1
fi

if ! vercel whoami >/dev/null 2>&1; then
  cat >&2 <<EOF
Error: Vercel にログインしていません。
ログイン:
  vercel login
EOF
  exit 1
fi

VERCEL_USER=$(vercel whoami 2>/dev/null | tail -1)
echo "==> Vercel user: $VERCEL_USER"

# --------------------------------------------------
# デプロイ対象
# --------------------------------------------------
if [[ -n "$ONLY" ]]; then
  VARIANTS=("$ONLY")
else
  VARIANTS=(modern classic pop)
fi

declare -a RESULTS=()

for tpl in "${VARIANTS[@]}"; do
  PROJECT_DIR="$OUTPUTS_DIR/${SLUG_PREFIX}-${tpl}"

  if [[ ! -d "$PROJECT_DIR" ]]; then
    echo "==> Skip: $PROJECT_DIR が存在しません" >&2
    continue
  fi

  echo ""
  echo "===================================================="
  echo "  Deploying: ${SLUG_PREFIX}-${tpl}"
  echo "  Path:      $PROJECT_DIR"
  echo "===================================================="

  cd "$PROJECT_DIR"

  # 依存インストール（vercel build がCloud側で行うので通常は不要、ローカル検証時のみ）
  if [[ "$SKIP_INSTALL" != "true" && ! -d "node_modules" ]]; then
    echo "==> npm install"
    npm install --no-audit --no-fund --silent
  fi

  # デプロイ実行（初回は新規プロジェクト作成、2回目以降は既存プロジェクトに紐づけ）
  # --yes でプロンプトをスキップ。プロジェクト名はディレクトリ名から自動推定される
  echo "==> vercel --prod --yes"
  DEPLOY_LOG=$(vercel --prod --yes 2>&1)
  echo "$DEPLOY_LOG" | tail -10

  # URL抽出（Production: URL の行 または最終行のhttps URL）
  URL=$(echo "$DEPLOY_LOG" | grep -Eo 'https://[a-zA-Z0-9.-]+\.vercel\.app' | tail -1)

  if [[ -z "$URL" ]]; then
    echo "==> URL抽出失敗。ログを確認してください" >&2
    RESULTS+=("{\"template\":\"$tpl\",\"url\":null,\"status\":\"failed\"}")
    continue
  fi

  echo ""
  echo "==> ✓ Deployed: $URL"
  RESULTS+=("{\"template\":\"$tpl\",\"url\":\"$URL\",\"status\":\"success\"}")
done

# --------------------------------------------------
# サマリ + 結果ファイル
# --------------------------------------------------
cd "$REPO_ROOT"

echo ""
echo "===================================================="
echo "  デプロイ完了サマリ"
echo "===================================================="

# JSON結果保存
{
  echo "{"
  echo "  \"deployed_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
  echo "  \"company\": \"株式会社一二三\","
  echo "  \"slug\": \"$SLUG_PREFIX\","
  echo "  \"vercel_user\": \"$VERCEL_USER\","
  echo "  \"deployments\": ["
  for i in "${!RESULTS[@]}"; do
    comma=","
    [[ $i -eq $((${#RESULTS[@]}-1)) ]] && comma=""
    echo "    ${RESULTS[$i]}$comma"
  done
  echo "  ]"
  echo "}"
} > "$RESULTS_FILE"

# 標準出力サマリ
for entry in "${RESULTS[@]}"; do
  tpl=$(echo "$entry" | sed -n 's/.*"template":"\([^"]*\)".*/\1/p')
  url=$(echo "$entry" | sed -n 's/.*"url":"\([^"]*\)".*/\1/p')
  if [[ -z "$url" || "$url" == "null" ]]; then
    printf "  %-8s : ❌ failed\n" "$tpl"
  else
    printf "  %-8s : %s\n" "$tpl" "$url"
  fi
done

echo ""
echo "  結果ファイル: $RESULTS_FILE"
echo "===================================================="
