#!/usr/bin/env bash
# migrate_to_standalone.sh
# 採用広告プレイブックを独立リポジトリに切り出すスクリプト
# 使い方: bash playbooks/recruit_ads/migrate_to_standalone.sh ~/let-recruit-ads

set -euo pipefail

# 引数チェック
if [ $# -lt 1 ]; then
  echo "Usage: bash $0 <DEST_DIR>"
  echo "Example: bash $0 ~/let-recruit-ads"
  exit 1
fi

DEST="$1"
SRC_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PLAYBOOK="$SRC_ROOT/playbooks/recruit_ads"

echo "==================================================="
echo "採用広告プレイブック 独立リポジトリ移行スクリプト"
echo "==================================================="
echo "SRC: $PLAYBOOK"
echo "DEST: $DEST"
echo ""

# 既存ディレクトリチェック
if [ -d "$DEST" ]; then
  echo "⚠️  $DEST はすでに存在します。中断します。"
  echo "  既存を削除する場合: rm -rf $DEST"
  exit 1
fi

# ディレクトリ作成
echo "[1/9] ディレクトリ構造を作成中..."
mkdir -p "$DEST"/{docs,experiments/logs,formulas,clients/let,learnings/instincts,design-references}

# docs ディレクトリへの集約
echo "[2/9] docs/ にドキュメントをコピー中..."
cp -r "$PLAYBOOK/00_strategy" "$DEST/docs/"
cp -r "$PLAYBOOK/01_platforms" "$DEST/docs/"
cp -r "$PLAYBOOK/02_creative" "$DEST/docs/"
cp -r "$PLAYBOOK/03_targeting" "$DEST/docs/"
cp -r "$PLAYBOOK/04_measurement" "$DEST/docs/"
cp -r "$PLAYBOOK/07_runbook" "$DEST/docs/"
cp -r "$PLAYBOOK/08_intake" "$DEST/docs/"

# experiments
echo "[3/9] experiments/ をコピー中..."
cp "$PLAYBOOK/05_experiments/experiment_register.csv" "$DEST/experiments/register.csv"
cp "$PLAYBOOK/05_experiments/experiment_template.md" "$DEST/experiments/template.md"
if [ -d "$PLAYBOOK/05_experiments/experiments" ]; then
  cp -r "$PLAYBOOK/05_experiments/experiments"/* "$DEST/experiments/logs/" 2>/dev/null || true
fi

# formulas
echo "[4/9] formulas/ をコピー中..."
cp "$PLAYBOOK/06_formulas/formula_template.md" "$DEST/formulas/template.md"
if [ -d "$PLAYBOOK/06_formulas/formulas" ]; then
  cp -r "$PLAYBOOK/06_formulas/formulas"/* "$DEST/formulas/" 2>/dev/null || true
fi

# clients
echo "[5/9] clients/let/ をコピー中..."
cp -r "$PLAYBOOK/clients/let"/* "$DEST/clients/let/"

# learnings
echo "[6/9] learnings/ をコピー中..."
if [ -f "$SRC_ROOT/learnings/instincts/recruit_ads.json" ]; then
  cp "$SRC_ROOT/learnings/instincts/recruit_ads.json" "$DEST/learnings/instincts/"
fi

# design references
echo "[7/9] design-references/ をコピー中..."
if [ -d "$SRC_ROOT/design-md/feer" ]; then
  mkdir -p "$DEST/design-references/feer"
  cp -r "$SRC_ROOT/design-md/feer"/* "$DEST/design-references/feer/" 2>/dev/null || true
fi
if [ -d "$SRC_ROOT/design-md/motion-library" ]; then
  mkdir -p "$DEST/design-references/motion-library"
  cp -r "$SRC_ROOT/design-md/motion-library"/* "$DEST/design-references/motion-library/" 2>/dev/null || true
fi

# top-level docs
echo "[8/9] 最上位ドキュメントを配置中..."
cp "$PLAYBOOK/HANDOFF.md" "$DEST/HANDOFF.md"
cp "$PLAYBOOK/MIGRATION_GUIDE.md" "$DEST/MIGRATION_GUIDE.md"
cp "$PLAYBOOK/STANDALONE_README.md" "$DEST/README.md"
cp "$PLAYBOOK/STANDALONE_CLAUDE.md" "$DEST/CLAUDE.md"

# .gitignore
cat > "$DEST/.gitignore" <<'EOF'
# OS
.DS_Store
Thumbs.db

# Editor
.vscode/
.idea/
*.swp

# Secrets / Env
.env
.env.*
*.key
*.pem
secrets/
1password_*.txt

# Large local-only assets (動画素材等)
clients/*/assets/*.mp4
clients/*/assets/*.mov
clients/*/assets/*.avi
clients/*/assets/raw/

# Logs
*.log
npm-debug.log*

# Build artifacts (将来 LP コード混在時)
node_modules/
dist/
build/
.next/

# Backup
*.bak
*~
EOF

# 内部リンク書き換え
echo "[9/9] 内部リンクを書き換え中（sed）..."

# OS判定（macOS の BSD sed か Linux の GNU sed か）
if [[ "$(uname)" == "Darwin" ]]; then
  SED_INPLACE=(sed -i '')
else
  SED_INPLACE=(sed -i)
fi

# パス書き換え
find "$DEST" -name "*.md" -type f -print0 | while IFS= read -r -d '' f; do
  "${SED_INPLACE[@]}" \
    -e 's|playbooks/recruit_ads/||g' \
    -e 's|05_experiments/experiments/|experiments/logs/|g' \
    -e 's|05_experiments/|experiments/|g' \
    -e 's|06_formulas/formulas/|formulas/|g' \
    -e 's|06_formulas/|formulas/|g' \
    -e 's|/design-md/|/design-references/|g' \
    -e 's|`design-md/|`design-references/|g' \
    -e 's|`00_strategy/|`docs/00_strategy/|g' \
    -e 's|`01_platforms/|`docs/01_platforms/|g' \
    -e 's|`02_creative/|`docs/02_creative/|g' \
    -e 's|`03_targeting/|`docs/03_targeting/|g' \
    -e 's|`04_measurement/|`docs/04_measurement/|g' \
    -e 's|`07_runbook/|`docs/07_runbook/|g' \
    -e 's|`08_intake/|`docs/08_intake/|g' \
    "$f"
done

# 不要ファイル削除
rm -f "$DEST/STANDALONE_README.md" "$DEST/STANDALONE_CLAUDE.md" "$DEST/migrate_to_standalone.sh" 2>/dev/null || true

# Git 初期化
echo ""
echo "Git 初期化中..."
cd "$DEST"
git init -q -b main
git add .
git commit -q -m "init: import recruit_ads playbook as standalone repo

ベース: eijiyoshikawa/agents @ $(cd "$SRC_ROOT" && git rev-parse --short HEAD 2>/dev/null || echo 'unknown')
内容: 採用広告プレイブック + LET 自社採用 (法人セールス) Sprint 1 準備一式
HANDOFF.md に全文脈・現在地・残タスクを集約済"

echo ""
echo "==================================================="
echo "✅ 移行完了"
echo "==================================================="
echo ""
echo "ディレクトリ: $DEST"
echo "ブランチ: main"
echo ""
echo "次のステップ:"
echo ""
echo "1. ディレクトリへ移動"
echo "   cd $DEST"
echo ""
echo "2. 構造確認"
echo "   tree -L 3 -I '.git'"
echo "   または: find . -maxdepth 3 -type d | sort"
echo ""
echo "3. GitHub 上にリポジトリ作成（gh CLI 使用例）"
echo "   gh repo create eijiyoshikawa/let-recruit-ads --private --source=. --remote=origin --push"
echo ""
echo "4. Claude 起動"
echo "   claude"
echo ""
echo "5. Claude セッション最初の発話:"
echo "   「HANDOFF.md を読んで現在地を把握してください」"
echo ""
