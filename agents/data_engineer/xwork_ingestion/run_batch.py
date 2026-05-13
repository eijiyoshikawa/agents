"""x-work.jp 求人を都府県×業種ごとに一括取得して DB_顧客管理 に投入する。

各府県を順次スクレイプ → 単一 JSON にマージ → 重複判定 → Notion 投入。
府県・業種ごとに `--out-dir/<industry>/<prefecture>.json` を残し、
途中で失敗しても失敗した府県だけ再実行できる。

CLI:
    # 建設（4府県デフォルト）
    python run_batch.py
    # 建設（特定の府県のみ追加）
    python run_batch.py --industry construction --prefectures shiga tokyo
    # 運輸物流（12府県）
    python run_batch.py --industry logistics --prefectures osaka kyoto nara wakayama shiga hyogo tokyo saitama kanagawa aichi hiroshima fukuoka
    # 投入前で停止
    python run_batch.py --industry logistics --prefectures osaka --dry-run
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
from prefecture_cities import ALL_PREFECTURES, INDUSTRIES
from scrape_xwork import crawl

BASE_URL = "https://x-work.jp/search"


def build_url(occupations: list[str], cities: list[str]) -> str:
    params = [("occupations", o) for o in occupations] + [("cities", c) for c in cities]
    return f"{BASE_URL}?{urlencode(params)}"


def scrape_one(pref_key: str, cities: list[str], occupations: list[str],
               out_path: Path, max_pages: int, delay: float,
               debug_dir: Path | None) -> int:
    url = build_url(occupations, cities)
    print(f"\n=== [{pref_key}] scrape ({len(cities)} cities × "
          f"{len(occupations)} occupations) ===", file=sys.stderr)
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
    ap.add_argument("--industry", choices=list(INDUSTRIES.keys()), default="construction",
                    help="業種（建設/運輸物流）。Notion の業種タグも自動切替")
    ap.add_argument("--out-dir", type=Path, default=Path("batch"),
                    help="出力ディレクトリ。industry 別にサブフォルダが作られる")
    ap.add_argument("--prefectures", nargs="*",
                    default=["osaka", "kyoto", "hyogo", "nara"],
                    choices=list(ALL_PREFECTURES.keys()),
                    help="対象府県")
    ap.add_argument("--max-pages", type=int, default=100)
    ap.add_argument("--delay", type=float, default=3.0)
    ap.add_argument("--dry-run", action="store_true",
                    help="Notion 投入直前で停止して dry-run 統計を出す")
    ap.add_argument("--use-gbiz", action="store_true",
                    help="gBizINFO で公式URL・代表者・資本金等を補完（GBIZ_API_TOKEN 必須）")
    ap.add_argument("--skip-scrape", action="store_true",
                    help="既存の JSON を使い、scrape を飛ばす")
    args = ap.parse_args()

    if "NOTION_TOKEN" not in os.environ:
        print("error: NOTION_TOKEN env var is required", file=sys.stderr)
        return 2

    industry_def = INDUSTRIES[args.industry]
    occupations = industry_def["occupations"]
    notion_industry = industry_def["notion_industry"]

    industry_dir = args.out_dir / args.industry
    industry_dir.mkdir(parents=True, exist_ok=True)
    pref_paths: list[Path] = []
    start = time.time()
    for key in args.prefectures:
        cities = ALL_PREFECTURES[key]
        out = industry_dir / f"{key}.json"
        pref_paths.append(out)
        if args.skip_scrape and out.exists():
            print(f"[{key}] skip scrape (using existing {out})", file=sys.stderr)
            continue
        scrape_one(key, cities, occupations, out, args.max_pages, args.delay, debug_dir=None)

    merged_path = industry_dir / "all.json"
    total = merge_jsons(pref_paths, merged_path)

    use_gbiz = args.use_gbiz
    print(f"\n=== [import] industry={args.industry} ({notion_industry}) "
          f"prefectures={','.join(args.prefectures)} ===", file=sys.stderr)
    print(f"=== [import] dry-run on {total} companies ===", file=sys.stderr)
    dry_stats = import_run(merged_path, dry_run=True, use_gbiz=use_gbiz,
                           industry=notion_industry)
    print(json.dumps(dry_stats, ensure_ascii=False, indent=2))

    if args.dry_run:
        print("\n[done] dry-run only. Re-run without --dry-run to write.", file=sys.stderr)
        return 0

    print(f"\n=== [import] actual write ===", file=sys.stderr)
    real_stats = import_run(merged_path, dry_run=False, use_gbiz=use_gbiz,
                            industry=notion_industry)
    print(json.dumps(real_stats, ensure_ascii=False, indent=2))
    elapsed = time.time() - start
    print(f"\n[done] total elapsed: {elapsed/60:.1f} min", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
