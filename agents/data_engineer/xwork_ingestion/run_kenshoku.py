"""建職バンク (kenshoku-bank.com) のスクレイプ + Notion 投入オーケストレータ。

run_batch.py の建職バンク版。府県を順次スクレイプ → マージ →
DB_顧客管理 に「建職バンク」メディアタグで投入する。

CLI:
    # 関西4府県の dry-run
    python run_kenshoku.py --prefectures osaka kyoto hyogo shiga --dry-run
    # 関西4府県の本実行
    python run_kenshoku.py --prefectures osaka kyoto hyogo shiga
    # 全国
    python run_kenshoku.py --prefectures all
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
from prefecture_cities import ALL_PREFECTURES, PREFECTURE_LABELS
from scrape_kenshoku import crawl

MEDIA_TAG = "建職バンク"
INDUSTRY = "建設"


def scrape_one(pref_key: str, max_pages: int, delay: float,
               limit_jobs: int | None, out_path: Path) -> int:
    """1府県のスクレイプ。Playwright 例外は捕捉して、取得済みデータは
    最低限保存する（途中クラッシュで全部失われないように）。"""
    label = PREFECTURE_LABELS.get(pref_key)
    if not label:
        print(f"[{pref_key}] no label found in PREFECTURE_LABELS; skip",
              file=sys.stderr)
        return 0
    print(f"\n=== [{pref_key}] scrape ({label}) ===", file=sys.stderr)
    try:
        records = asyncio.run(crawl(
            [label], max_pages=max_pages, delay=delay,
            headed=True, use_real_chrome=True, limit_jobs=limit_jobs,
        ))
    except Exception as e:
        print(f"[{pref_key}] crawl crashed: {e}", file=sys.stderr)
        records = []
    out_path.write_text(json.dumps(records, ensure_ascii=False, indent=2),
                        encoding="utf-8")
    print(f"[{pref_key}] wrote {len(records)} companies → {out_path}",
          file=sys.stderr)
    return len(records)


def merge_jsons(paths: list[Path], merged_path: Path) -> int:
    seen: set[str] = set()
    merged: list[dict] = []
    for p in paths:
        if not p.exists():
            continue
        for item in json.loads(p.read_text(encoding="utf-8")):
            name = item.get("company_name", "")
            if not name or name in seen:
                continue
            seen.add(name)
            merged.append(item)
    merged_path.write_text(json.dumps(merged, ensure_ascii=False, indent=2),
                           encoding="utf-8")
    print(f"\n[merge] {len(merged)} unique companies → {merged_path}",
          file=sys.stderr)
    return len(merged)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out-dir", type=Path, default=Path("batch/kenshoku"),
                    help="出力ディレクトリ")
    ap.add_argument("--prefectures", nargs="+",
                    default=["osaka", "kyoto", "hyogo", "shiga"],
                    help="対象府県のキー（all で全国47都道府県）")
    ap.add_argument("--max-pages", type=int, default=50,
                    help="検索結果ページの上限（既定: 50）")
    ap.add_argument("--limit-jobs", type=int, default=None,
                    help="府県ごとに詳細クロールする求人数の上限")
    ap.add_argument("--delay", type=float, default=2.5)
    ap.add_argument("--dry-run", action="store_true",
                    help="Notion 投入直前で停止して dry-run 統計を出す")
    ap.add_argument("--use-gbiz", action="store_true",
                    help="gBizINFO で補完（法人番号があれば）")
    ap.add_argument("--skip-scrape", action="store_true",
                    help="既存の JSON を使い、scrape を飛ばす")
    args = ap.parse_args()

    if "NOTION_TOKEN" not in os.environ:
        print("error: NOTION_TOKEN env var is required", file=sys.stderr)
        return 2

    if args.prefectures == ["all"]:
        prefectures = list(PREFECTURE_LABELS.keys())
    else:
        prefectures = args.prefectures

    for key in prefectures:
        if key not in PREFECTURE_LABELS:
            print(f"error: unknown prefecture key: {key}", file=sys.stderr)
            print(f"  valid keys: {list(PREFECTURE_LABELS.keys())}",
                  file=sys.stderr)
            return 2

    args.out_dir.mkdir(parents=True, exist_ok=True)
    pref_paths: list[Path] = []
    start = time.time()
    for key in prefectures:
        out = args.out_dir / f"{key}.json"
        pref_paths.append(out)
        if args.skip_scrape and out.exists():
            print(f"[{key}] skip scrape (using existing {out})", file=sys.stderr)
            continue
        scrape_one(key, args.max_pages, args.delay, args.limit_jobs, out)

    merged_path = args.out_dir / "all.json"
    total = merge_jsons(pref_paths, merged_path)

    print(f"\n=== [import] media={MEDIA_TAG} industry={INDUSTRY} "
          f"prefectures={','.join(prefectures)} ===", file=sys.stderr)
    print(f"=== [import] dry-run on {total} companies ===", file=sys.stderr)
    dry_stats = import_run(merged_path, dry_run=True,
                           use_gbiz=args.use_gbiz,
                           industry=INDUSTRY, media_tag=MEDIA_TAG)
    print(json.dumps(dry_stats, ensure_ascii=False, indent=2))

    if args.dry_run:
        print("\n[done] dry-run only. Re-run without --dry-run to write.",
              file=sys.stderr)
        return 0

    print(f"\n=== [import] actual write ===", file=sys.stderr)
    real_stats = import_run(merged_path, dry_run=False,
                            use_gbiz=args.use_gbiz,
                            industry=INDUSTRY, media_tag=MEDIA_TAG)
    print(json.dumps(real_stats, ensure_ascii=False, indent=2))
    elapsed = time.time() - start
    print(f"\n[done] total elapsed: {elapsed/60:.1f} min", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
