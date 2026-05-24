#!/usr/bin/env bash
# Recruitment LP Generator — 新リポジトリ自動セットアップスクリプト
#
# 使い方:
#   bash recruitment-lp-package/setup-new-repo.sh /path/to/new-repo
#
# オプション:
#   --no-git           git init をスキップ
#   --no-previews      プレビューPNGをコピーしない
#   --no-install       npm install をスキップ
#   --force            既存ディレクトリでも上書きで進める

set -euo pipefail

PKG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_ROOT="$(cd "$PKG_DIR/.." && pwd)"

DEST=""
SKIP_GIT=false
SKIP_PREVIEWS=false
SKIP_INSTALL=false
FORCE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --no-git) SKIP_GIT=true; shift ;;
    --no-previews) SKIP_PREVIEWS=true; shift ;;
    --no-install) SKIP_INSTALL=true; shift ;;
    --force) FORCE=true; shift ;;
    -h|--help)
      sed -n '1,12p' "$0"
      exit 0
      ;;
    *) DEST="$1"; shift ;;
  esac
done

if [[ -z "$DEST" ]]; then
  echo "Error: 移植先ディレクトリパスを指定してください" >&2
  echo "Usage: $0 /path/to/new-repo" >&2
  exit 1
fi

# 絶対パス化
DEST="$(cd "$(dirname "$DEST")" 2>/dev/null && pwd)/$(basename "$DEST")" || true
if [[ -z "${DEST:-}" || "$DEST" == "/" ]]; then
  echo "Error: 移植先パスを解決できません: $1" >&2
  exit 1
fi

if [[ -e "$DEST" && "$FORCE" != "true" ]]; then
  if [[ -d "$DEST" && -z "$(ls -A "$DEST" 2>/dev/null)" ]]; then
    : # 空ディレクトリならOK
  else
    echo "Error: 移植先がすでに存在し、空でもありません: $DEST" >&2
    echo "       上書きする場合は --force を付けてください" >&2
    exit 1
  fi
fi

mkdir -p "$DEST"

echo "==> 移植元: $SRC_ROOT"
echo "==> 移植先: $DEST"

# --------------------------------------------------
# 1. エージェント定義
# --------------------------------------------------
echo "==> エージェント定義をコピー"
mkdir -p "$DEST/agents"
cp -r "$SRC_ROOT/agents/recruitment_lp_generator" "$DEST/agents/"

# --------------------------------------------------
# 2. Next.js テンプレート
# --------------------------------------------------
echo "==> Next.js テンプレートをコピー"
mkdir -p "$DEST/templates"

RSYNC_EXCLUDES=(
  --exclude='node_modules'
  --exclude='.next'
  --exclude='package-lock.json'
  --exclude='tsconfig.tsbuildinfo'
  --exclude='next-env.d.ts'
)
if [[ "$SKIP_PREVIEWS" == "true" ]]; then
  RSYNC_EXCLUDES+=(--exclude='previews')
fi

if command -v rsync >/dev/null 2>&1; then
  rsync -a "${RSYNC_EXCLUDES[@]}" \
    "$SRC_ROOT/templates/recruitment-lp" "$DEST/templates/"
else
  # rsync 無しのフォールバック
  cp -r "$SRC_ROOT/templates/recruitment-lp" "$DEST/templates/"
  rm -rf "$DEST/templates/recruitment-lp/node_modules"
  rm -rf "$DEST/templates/recruitment-lp/.next"
  rm -f  "$DEST/templates/recruitment-lp/package-lock.json"
  rm -f  "$DEST/templates/recruitment-lp/tsconfig.tsbuildinfo"
  rm -f  "$DEST/templates/recruitment-lp/next-env.d.ts"
  [[ "$SKIP_PREVIEWS" == "true" ]] && rm -rf "$DEST/templates/recruitment-lp/previews"
fi

# --------------------------------------------------
# 3. オーケストレータースクリプト
# --------------------------------------------------
echo "==> スクリプトをコピー"
mkdir -p "$DEST/scripts"
cp "$SRC_ROOT/scripts/generate-recruitment-lp.sh" "$DEST/scripts/"
chmod +x "$DEST/scripts/generate-recruitment-lp.sh"

# --------------------------------------------------
# 4. 出力ディレクトリの空のプレースホルダ
# --------------------------------------------------
mkdir -p "$DEST/outputs/recruitment-lp"
touch "$DEST/outputs/.gitkeep"

# --------------------------------------------------
# 5. メタファイル（新リポジトリ用）
# --------------------------------------------------
echo "==> メタファイルをコピー (README / CLAUDE.md / .gitignore など)"
cp "$PKG_DIR/new-repo/README.md" "$DEST/"
cp "$PKG_DIR/new-repo/CLAUDE.md" "$DEST/"
cp "$PKG_DIR/new-repo/START_PROMPT.md" "$DEST/"
cp "$PKG_DIR/new-repo/.gitignore" "$DEST/"

mkdir -p "$DEST/.claude"
cp "$PKG_DIR/new-repo/.claude/settings.json" "$DEST/.claude/"

# --------------------------------------------------
# 6. npm install（任意）
# --------------------------------------------------
if [[ "$SKIP_INSTALL" != "true" ]]; then
  if command -v npm >/dev/null 2>&1; then
    echo "==> 依存をインストール (templates/recruitment-lp)"
    (cd "$DEST/templates/recruitment-lp" && npm install --no-audit --no-fund --silent)
  else
    echo "==> npm が見つかりません。後で手動実行してください:"
    echo "    cd $DEST/templates/recruitment-lp && npm install"
  fi
fi

# --------------------------------------------------
# 7. git init（任意）
# --------------------------------------------------
if [[ "$SKIP_GIT" != "true" ]]; then
  if command -v git >/dev/null 2>&1; then
    if [[ ! -d "$DEST/.git" ]]; then
      echo "==> git 初期化 & 初回コミット"
      (
        cd "$DEST"
        git init -b main >/dev/null 2>&1
        git add -A
        if git commit -m "initial: recruitment LP generator system" >/dev/null 2>&1; then
          echo "    -> 初回コミット作成済み"
        else
          echo "    -> git commit に失敗（署名設定等が原因の可能性）"
          echo "       手動で次を実行してください: cd $DEST && git commit -m 'initial: recruitment LP generator system'"
        fi
      )
    else
      echo "==> 既存 .git を検出。git init をスキップ"
    fi
  fi
fi

# --------------------------------------------------
# 完了サマリ
# --------------------------------------------------
cat <<EOF

==========================================================
  セットアップ完了

  移植先: $DEST

  次のステップ:
    1) cd $DEST
    2) Claude Code を起動
    3) START_PROMPT.md の内容を貼り付ける
       （またはチャットで「採用LPを作って: <URL>」と依頼）

  ローカルでテンプレ確認したい場合:
    cd $DEST/templates/recruitment-lp && npm run dev
    -> http://localhost:3000

==========================================================
EOF
