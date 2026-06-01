#!/usr/bin/env bash
# JBCA ProSERIES カタログPDFを Google Drive から取得する。
# 共有が「リンクを知る全員(閲覧可)」である前提。要 gdown (pip install gdown)。
# 当リポジトリ作成環境では drive.google.com が 403 のため取得不可。
# 認証済み環境/ローカルで実行してください。
set -euo pipefail
cd "$(dirname "$0")"

declare -A FILES=(
  ["警備Proカタログ.pdf"]="1IasHkyyZ0nI6aR9-Te2yPcUayRYWGYmq"
  ["管制Proカタログ.pdf"]="1srf4Xl-yfUscR0joa6_mbtWn2MaNStcc"
  ["教育Proカタログ.pdf"]="1wWu0CVPS-_5evpJg9exfqYfnMZSQneFm"
  ["ProSERIESカタログ.pdf"]="1YD5wPKsgvOMSm6fQ-5LJR5I1V6iDK1-I"
  ["JBCAアシスタントProカタログ.pdf"]="188m-F8zVLxIrhj-_nFSiOU2BICgz2EFX"
)

if ! command -v gdown >/dev/null 2>&1; then
  echo "gdown がありません。 pip install gdown を実行してください。" >&2
  exit 1
fi

for name in "${!FILES[@]}"; do
  id="${FILES[$name]}"
  echo "downloading: $name ($id)"
  gdown "https://drive.google.com/uc?id=${id}" -O "$name" || echo "FAILED: $name"
done
echo "done."
