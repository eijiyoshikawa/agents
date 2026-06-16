"""CIRCUS AGENT (circus-job.com) のスクレイプ+Notion投入オーケストレータ。

CLI:
    # 関西エリア（既存ブラウザでフィルタした検索URL）を dry-run
    python run_circus.py --start-url "https://circus-job.com/search?...&page=1" --dry-run

    # 本実行
    python run_circus.py --start-url "https://circus-job.com/search?...&page=1"

    # 既存JSONを使って投入だけ再実行
    python run_circus.py --skip-scrape

環境変数:
    NOTION_TOKEN     : Notion API トークン
    CIRCUS_EMAIL     : CIRCUS AGENT ログイン用メアド
    CIRCUS_PASSWORD  : CIRCUS AGENT ログイン用パスワード
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
import time
from pathlib import Path

from import_to_notion import run as import_run
from scrape_circus import crawl

MEDIA_TAG = "CIRCUS"
INDUSTRY = "建設"


def scrape(start_url: str, max_pages: int, delay: float,
           limit_jobs: int | None, out_path: Path,
           email: str, password: str,
           debug_dir: Path | None = None) -> int:
    print(f"\n=== [circus] scrape ===", file=sys.stderr)
    try:
        records = asyncio.run(crawl(
            start_url=start_url,
            max_pages=max_pages,
            delay=delay,
            headed=True,
            use_real_chrome=True,
            limit_jobs=limit_jobs,
            email=email,
            password=password,
            debug_dir=debug_dir,
        ))
    except Exception as e:
        print(f"[circus] crawl crashed: {e}", file=sys.stderr)
        records = []
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(records, ensure_ascii=False, indent=2),
                        encoding="utf-8")
    print(f"[circus] wrote {len(records)} companies → {out_path}",
          file=sys.stderr)
    return len(records)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--start-url",
                    help="CIRCUS の検索結果ページURL（page=1 含む）")
    ap.add_argument("--out", type=Path,
                    default=Path("batch/circus/all.json"),
                    help="出力JSONパス")
    ap.add_argument("--max-pages", type=int, default=100)
    ap.add_argument("--limit-jobs", type=int, default=None,
                    help="詳細クロール上限")
    ap.add_argument("--delay", type=float, default=2.5)
    ap.add_argument("--dry-run", action="store_true",
                    help="Notion投入前で停止し dry-run 統計を表示")
    ap.add_argument("--skip-scrape", action="store_true",
                    help="既存JSONを使い、scrape を飛ばす")
    ap.add_argument("--debug-dir", type=Path, default=None,
                    help="検索/詳細ページのHTML/textをダンプ（デバッグ用）")
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
        print(f"[circus] skip scrape (using existing {args.out})",
              file=sys.stderr)
    else:
        if not args.start_url:
            print("error: --start-url required (or use --skip-scrape)",
                  file=sys.stderr)
            return 2
        email = os.environ.get("CIRCUS_EMAIL", "")
        password = os.environ.get("CIRCUS_PASSWORD", "")
        if not email or not password:
            print("error: CIRCUS_EMAIL / CIRCUS_PASSWORD env required",
                  file=sys.stderr)
            return 2
        scrape(args.start_url, args.max_pages, args.delay, args.limit_jobs,
               args.out, email, password, debug_dir=args.debug_dir)

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
