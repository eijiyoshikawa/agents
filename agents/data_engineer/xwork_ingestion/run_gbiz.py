"""gBizINFO 建設業ディスカバリ + Notion 投入オーケストレータ。

CLI:
    # 関西4府県の建設業30名以上を取得 → Notion 投入
    python run_gbiz.py \\
      --prefectures 大阪府 京都府 兵庫県 滋賀県 \\
      --out batch/gbiz/kansai_construction.json

    # dry-run 統計のみ
    python run_gbiz.py --prefectures 東京都 --dry-run

    # 既存JSONを使って投入だけ再実行
    python run_gbiz.py --skip-scrape --out batch/gbiz/kansai_construction.json

環境変数:
    NOTION_TOKEN     : Notion API トークン
    GBIZ_API_TOKEN   : gBizINFO API トークン
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

from discovery_gbiz import discover
from import_to_notion import run as import_run

MEDIA_TAG = "gBizINFO"
INDUSTRY = "建設"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--prefectures", nargs="+",
                    help="都道府県名（例: 東京都 神奈川県）")
    ap.add_argument("--min-employees", type=int, default=30)
    ap.add_argument("--out", type=Path,
                    default=Path("batch/gbiz/construction.json"))
    ap.add_argument("--max-pages", type=int, default=50)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--skip-scrape", action="store_true")
    args = ap.parse_args()

    if "NOTION_TOKEN" not in os.environ:
        print("error: NOTION_TOKEN env var required", file=sys.stderr)
        return 2

    start = time.time()
    if args.skip_scrape:
        if not args.out.exists():
            print(f"error: --skip-scrape but {args.out} not found",
                  file=sys.stderr)
            return 2
        print(f"[gbiz] skip scrape (using existing {args.out})",
              file=sys.stderr)
    else:
        if not args.prefectures:
            print("error: --prefectures required (or use --skip-scrape)",
                  file=sys.stderr)
            return 2
        token = os.environ.get("GBIZ_API_TOKEN", "")
        if not token:
            print("error: GBIZ_API_TOKEN env var required", file=sys.stderr)
            return 2
        print(f"\n=== [gbiz] discovery ===", file=sys.stderr)
        try:
            total = discover(token, args.prefectures, args.min_employees,
                             args.out, max_pages_per_query=args.max_pages)
            print(f"[gbiz] discovered {total} companies → {args.out}",
                  file=sys.stderr)
        except KeyboardInterrupt:
            print("[gbiz] interrupted", file=sys.stderr)

    if not args.out.exists():
        print(f"error: {args.out} not found", file=sys.stderr)
        return 2
    total = len(json.loads(args.out.read_text(encoding="utf-8")))

    print(f"\n=== [import] media={MEDIA_TAG} industry={INDUSTRY} ===",
          file=sys.stderr)
    print(f"=== [import] dry-run on {total} companies ===", file=sys.stderr)
    dry_stats = import_run(args.out, dry_run=True, use_gbiz=False,
                           industry=INDUSTRY, media_tag=MEDIA_TAG)
    print(json.dumps(dry_stats, ensure_ascii=False, indent=2))

    if args.dry_run:
        print("\n[done] dry-run only. Re-run without --dry-run to write.",
              file=sys.stderr)
        return 0

    print(f"\n=== [import] actual write ===", file=sys.stderr)
    real_stats = import_run(args.out, dry_run=False, use_gbiz=False,
                            industry=INDUSTRY, media_tag=MEDIA_TAG)
    print(json.dumps(real_stats, ensure_ascii=False, indent=2))
    elapsed = time.time() - start
    print(f"\n[done] total elapsed: {elapsed/60:.1f} min", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
