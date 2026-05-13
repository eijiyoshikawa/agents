"""4府県（大阪/京都/兵庫/奈良）の x-work.jp 求人を一括取得して
DB_顧客管理 に投入するオーケストレータ。

各府県を順次スクレイプ → 単一 JSON にマージ → 重複判定 → Notion 投入。
府県ごとの個別 JSON も `--out-dir` に残るので、途中で失敗しても
失敗した府県だけ再実行できる。

CLI:
    python run_batch.py                          # フル実行
    python run_batch.py --dry-run                # 投入直前で停止して件数だけ表示
    python run_batch.py --prefectures osaka kyoto  # 指定府県のみ
    python run_batch.py --max-pages 100 --delay 3
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
import time
from pathlib import Path
from urllib.parse import urlencode

from import_to_notion import run as import_run
from prefecture_cities import OCCUPATIONS, PREFECTURES
from scrape_xwork import crawl

BASE_URL = "https://x-work.jp/search"


def build_url(cities: list[str]) -> str:
    params = [("occupations", o) for o in OCCUPATIONS] + [("cities", c) for c in cities]
    return f"{BASE_URL}?{urlencode(params)}"


def scrape_one(pref_key: str, cities: list[str], out_path: Path,
               max_pages: int, delay: float, debug_dir: Path | None) -> int:
    url = build_url(cities)
    print(f"\n=== [{pref_key}] scrape ({len(cities)} cities) ===", file=sys.stderr)
    print(f"URL length: {len(url)} chars", file=sys.stderr)
    records = asyncio.run(crawl(url, max_pages=max_pages, delay=delay,
                                headed=True, debug_dir=debug_dir,
                                use_real_chrome=True))
    out_path.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[{pref_key}] wrote {len(records)} companies → {out_path}", file=sys.stderr)
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
    merged_path.write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n[merge] {len(merged)} unique companies → {merged_path}", file=sys.stderr)
    return len(merged)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out-dir", type=Path, default=Path("batch"))
    ap.add_argument("--prefectures", nargs="*", default=list(PREFECTURES.keys()),
                    choices=list(PREFECTURES.keys()),
                    help="対象府県 (デフォルト: osaka kyoto hyogo nara)")
    ap.add_argument("--max-pages", type=int, default=100)
    ap.add_argument("--delay", type=float, default=3.0)
    ap.add_argument("--dry-run", action="store_true",
                    help="Notion 投入直前で停止して dry-run 統計を出す")
    ap.add_argument("--use-gbiz", action="store_true",
                    help="gBizINFO で電話・公式URL・代表者・資本金等を補完（GBIZ_API_TOKEN 必須）")
    ap.add_argument("--skip-scrape", action="store_true",
                    help="既存の JSON を使い、scrape を飛ばす")
    args = ap.parse_args()

    if "NOTION_TOKEN" not in os.environ:
        print("error: NOTION_TOKEN env var is required", file=sys.stderr)
        return 2

    args.out_dir.mkdir(parents=True, exist_ok=True)
    pref_paths: list[Path] = []
    start = time.time()
    for key in args.prefectures:
        cities = PREFECTURES[key]
        out = args.out_dir / f"{key}.json"
        pref_paths.append(out)
        if args.skip_scrape and out.exists():
            print(f"[{key}] skip scrape (using existing {out})", file=sys.stderr)
            continue
        scrape_one(key, cities, out, args.max_pages, args.delay, debug_dir=None)

    merged_path = args.out_dir / "all.json"
    total = merge_jsons(pref_paths, merged_path)

    use_gbiz = args.use_gbiz
    print(f"\n=== [import] dry-run on {total} companies ===", file=sys.stderr)
    dry_stats = import_run(merged_path, dry_run=True, use_gbiz=use_gbiz)
    print(json.dumps(dry_stats, ensure_ascii=False, indent=2))

    if args.dry_run:
        print("\n[done] dry-run only. Re-run without --dry-run to write.", file=sys.stderr)
        return 0

    print(f"\n=== [import] actual write ===", file=sys.stderr)
    real_stats = import_run(merged_path, dry_run=False, use_gbiz=use_gbiz)
    print(json.dumps(real_stats, ensure_ascii=False, indent=2))
    elapsed = time.time() - start
    print(f"\n[done] total elapsed: {elapsed/60:.1f} min", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
