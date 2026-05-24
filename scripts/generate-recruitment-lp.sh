#!/usr/bin/env bash
# 採用LP自動生成スクリプト
# 使用: bash scripts/generate-recruitment-lp.sh --url "https://example.com" [--template auto|modern|classic|pop] [--slug custom-slug]
#
# このスクリプトは agent パイプラインの最後の機械的な部分（プロジェクトコピー・ビルド・デプロイ）を担当します。
# 企業情報の抽出は recruitment_lp_generator/company_scanner エージェントが事前に実行し、
# /agents/recruitment_lp_generator/company_scanner/output.json を生成しておく必要があります。

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATE_DIR="$REPO_ROOT/templates/recruitment-lp"
SCANNER_OUTPUT="$REPO_ROOT/agents/recruitment_lp_generator/company_scanner/output.json"
OUTPUTS_DIR="$REPO_ROOT/outputs/recruitment-lp"

URL=""
TEMPLATE="auto"
CUSTOM_SLUG=""
SKIP_DEPLOY=false
SKIP_INSTALL=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --url) URL="$2"; shift 2 ;;
    --template) TEMPLATE="$2"; shift 2 ;;
    --slug) CUSTOM_SLUG="$2"; shift 2 ;;
    --skip-deploy) SKIP_DEPLOY=true; shift ;;
    --skip-install) SKIP_INSTALL=true; shift ;;
    -h|--help)
      echo "Usage: $0 --url URL [--template auto|modern|classic|pop] [--slug SLUG] [--skip-deploy] [--skip-install]"
      exit 0
      ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$URL" ]]; then
  echo "Error: --url is required" >&2
  exit 1
fi

# Scanner output check
if [[ ! -f "$SCANNER_OUTPUT" ]]; then
  cat <<EOF >&2
Error: Company scanner output not found.
Expected: $SCANNER_OUTPUT

Run the Company Scanner agent first:
  Claude Code に以下を依頼:
  「/agents/recruitment_lp_generator/company_scanner/prompt.md の手順に従い、
   URL「$URL」の企業情報を抽出して output.json に保存してください」
EOF
  exit 1
fi

# Resolve slug
if [[ -n "$CUSTOM_SLUG" ]]; then
  SLUG="$CUSTOM_SLUG"
else
  SLUG=$(jq -r '.company.slug' "$SCANNER_OUTPUT")
  if [[ -z "$SLUG" || "$SLUG" == "null" ]]; then
    echo "Error: slug not found in scanner output" >&2
    exit 1
  fi
fi

# Resolve template
if [[ "$TEMPLATE" == "auto" ]]; then
  TEMPLATE=$(jq -r '.recommended_template' "$SCANNER_OUTPUT")
  if [[ -z "$TEMPLATE" || "$TEMPLATE" == "null" ]]; then
    TEMPLATE="modern"
  fi
fi

if [[ "$TEMPLATE" != "modern" && "$TEMPLATE" != "classic" && "$TEMPLATE" != "pop" ]]; then
  echo "Error: invalid template '$TEMPLATE'. Must be modern|classic|pop|auto" >&2
  exit 1
fi

echo "==> Generating recruitment LP"
echo "    URL:      $URL"
echo "    Slug:     $SLUG"
echo "    Template: $TEMPLATE"

# 1. Copy template
PROJECT_DIR="$OUTPUTS_DIR/$SLUG"
mkdir -p "$OUTPUTS_DIR"
rm -rf "$PROJECT_DIR"
cp -r "$TEMPLATE_DIR" "$PROJECT_DIR"
echo "==> Copied template to $PROJECT_DIR"

# 2. Write company.json with selected template
TMP_DATA=$(mktemp)
jq --arg tpl "$TEMPLATE" '{template: $tpl, company: .company, services: .services, jobs: .jobs}' \
  "$SCANNER_OUTPUT" > "$TMP_DATA"
mv "$TMP_DATA" "$PROJECT_DIR/data/company.json"
echo "==> Wrote data/company.json"

# 3. Update package.json name
TMP_PKG=$(mktemp)
jq --arg name "$SLUG-recruit" '.name = $name' "$PROJECT_DIR/package.json" > "$TMP_PKG"
mv "$TMP_PKG" "$PROJECT_DIR/package.json"

# 4. Install & build
if [[ "$SKIP_INSTALL" != "true" ]]; then
  echo "==> Installing dependencies"
  (cd "$PROJECT_DIR" && npm install --no-audit --no-fund --silent)

  echo "==> Building project"
  (cd "$PROJECT_DIR" && npm run build)
fi

# 5. Deploy
DEPLOY_URL=""
if [[ "$SKIP_DEPLOY" != "true" ]]; then
  if command -v vercel >/dev/null 2>&1; then
    echo "==> Deploying to Vercel"
    DEPLOY_URL=$(cd "$PROJECT_DIR" && vercel --prod --yes 2>&1 | tail -1)
  else
    echo "==> Vercel CLI not found. Skipping auto-deploy."
    echo "    Deploy manually:  cd $PROJECT_DIR && vercel --prod"
    echo "    Or use Vercel MCP from Claude Code:"
    echo '      mcp__..._deploy_to_vercel with projectPath="'"$PROJECT_DIR"'"'
  fi
fi

# 6. Write final output
FINAL_OUTPUT="$REPO_ROOT/agents/recruitment_lp_generator/output.json"
mkdir -p "$(dirname "$FINAL_OUTPUT")"
jq -n \
  --arg slug "$SLUG" \
  --arg url "$URL" \
  --arg template "$TEMPLATE" \
  --arg project_path "$PROJECT_DIR" \
  --arg data_path "$PROJECT_DIR/data/company.json" \
  --arg vercel_url "$DEPLOY_URL" \
  --arg generated_at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --slurpfile scanner "$SCANNER_OUTPUT" \
  '{
    company: $scanner[0].company,
    selected_template: $template,
    vercel_url: $vercel_url,
    generated_at: $generated_at,
    data_path: $data_path,
    project_path: $project_path,
    source_url: $url,
    notion_record_id: null
  }' > "$FINAL_OUTPUT"

echo ""
echo "==> Done"
echo "    Project:   $PROJECT_DIR"
echo "    Template:  $TEMPLATE"
if [[ -n "$DEPLOY_URL" ]]; then
  echo "    Vercel:    $DEPLOY_URL"
fi
echo "    Summary:   $FINAL_OUTPUT"
