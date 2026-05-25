"""公式サイトから SNS リンクと採用ページを抽出して Notion に書き込むツール。

DB_顧客管理 で「会社URL有 / SNS or 採用ページ が空」のページを対象に、
公式サイトを GET → SNS リンクと採用ページURL を抽出して書き込む。
規約完全OK（既に書き込まれている会社URLを単純にHTTP GETするだけ）。

CLI:
    python enrich_sns_careers.py --industry 建設 --report sns.json
    python enrich_sns_careers.py --industry 建設 --apply
    python enrich_sns_careers.py --industry 建設 --max-targets 100 --apply
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Optional
from urllib.parse import urljoin, urlparse

import requests

from notion_client import NotionClient, text_prop, title_of

REAL_UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
           "AppleWebKit/537.36 (KHTML, like Gecko) "
           "Chrome/131.0.0.0 Safari/537.36")
DEFAULT_TIMEOUT = 10.0
DEFAULT_WORKERS = 5

# SNS リンク検出パターン（プロファイルURLのみ、シェア用URLは後段で除外）
SNS_PATTERNS = {
    "YouTube": [
        re.compile(r'(?:https?://)?(?:www\.|m\.)?youtube\.com/[A-Za-z0-9._@\-/]+', re.IGNORECASE),
        re.compile(r'(?:https?://)?youtu\.be/[A-Za-z0-9._\-]+', re.IGNORECASE),
    ],
    "X": [
        re.compile(r'(?:https?://)?(?:www\.|mobile\.)?(?:twitter|x)\.com/[A-Za-z0-9_]{1,30}(?=["\'/?#\s>]|$)', re.IGNORECASE),
    ],
    "Instagram": [
        re.compile(r'(?:https?://)?(?:www\.)?instagram\.com/[A-Za-z0-9._]{1,40}(?=["\'/?#\s>]|$)', re.IGNORECASE),
    ],
    "Facebook": [
        re.compile(r'(?:https?://)?(?:www\.|m\.|ja-jp\.|en-us\.)?facebook\.com/[A-Za-z0-9._\-]{1,80}(?=["\'/?#\s>]|$)', re.IGNORECASE),
        re.compile(r'(?:https?://)?fb\.com/[A-Za-z0-9._\-]+', re.IGNORECASE),
    ],
}

# シェアボタン/プラグイン等の偽陽性を弾く
SNS_EXCLUDE_SUBSTR = (
    "/intent", "intent?", "/sharer", "sharer.php", "/share?", "/share/", "share.php",
    "/plugins", "/embed", "/watch", "/results", "/playlist",
    "/explore", "/hashtag/", "/i/", "/p/", "/tv/", "/reel",
    "/u/0", "/u/1",
    "/login", "/help", "/about", "/privacy", "/terms", "/policies",
)

# 採用ページの href / テキストキーワード
RECRUIT_PATH_PARTS = (
    "/recruit", "/recruiting", "/recruitment", "/saiyou", "/saiyo",
    "/career", "/careers", "/jobs", "/job",
    "/採用", "/%E6%8E%A1%E7%94%A8",  # URL-encoded 「採用」
)
RECRUIT_LINK_RE = re.compile(
    r'<a\b[^>]*?\bhref\s*=\s*["\']([^"\']+)["\'][^>]*>(.*?)</a>',
    re.IGNORECASE | re.DOTALL,
)
RECRUIT_TEXT_KEYWORDS = (
    "採用", "リクルート", "求人", "募集", "新卒", "中途",
    "キャリア", "recruit", "career", "join us",
)


def fetch_html(url: str, timeout: float = DEFAULT_TIMEOUT) -> Optional[str]:
    headers = {
        "User-Agent": REAL_UA,
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    try:
        r = requests.get(url, headers=headers, timeout=timeout,
                         allow_redirects=True)
    except requests.RequestException:
        return None
    if r.status_code != 200:
        return None
    if not r.encoding or r.encoding.lower() == "iso-8859-1":
        r.encoding = r.apparent_encoding or "utf-8"
    try:
        return r.text
    except Exception:
        return None


def _looks_like_share(candidate: str) -> bool:
    lower = candidate.lower()
    return any(sub in lower for sub in SNS_EXCLUDE_SUBSTR)


def extract_sns(html: str, company_host: str) -> list[str]:
    """HTML から SNS の出現を検出して、見つかったプラットフォーム名のリストを返す。"""
    found: set[str] = set()
    for sns_name, patterns in SNS_PATTERNS.items():
        for pat in patterns:
            for m in pat.finditer(html):
                candidate = m.group(0)
                if _looks_like_share(candidate):
                    continue
                # 自社ドメインを含む偽陽性除外（テキスト中に "facebook.com" が
                # 単なる説明として出てきた等）は許容: tag 内である保証はないが
                # 個別URLが残ればSNS有りと判断
                found.add(sns_name)
                break  # この SNS は見つかったので次へ
    return sorted(found)


def _abs_url(base: str, href: str) -> str:
    try:
        return urljoin(base, href)
    except Exception:
        return href


def _is_same_domain(base_url: str, candidate: str) -> bool:
    try:
        base = urlparse(base_url).netloc.lower().lstrip("www.")
        cand = urlparse(candidate).netloc.lower().lstrip("www.")
        if not cand:
            return True  # 相対パス
        return base == cand or base.endswith("." + cand) or cand.endswith("." + base)
    except Exception:
        return False


def extract_recruit_url(html: str, base_url: str) -> str:
    """HTML から採用ページの最有力 URL を返す。なければ空文字。"""
    candidates: list[tuple[int, str]] = []  # (優先スコア, URL)
    for m in RECRUIT_LINK_RE.finditer(html):
        href = m.group(1).strip()
        text = re.sub(r"<[^>]+>", "", m.group(2)).strip()
        if not href:
            continue
        if href.startswith("#") or href.startswith("javascript:"):
            continue
        href_lower = href.lower()
        text_lower = text.lower()
        path_hit = any(p in href_lower for p in RECRUIT_PATH_PARTS)
        text_hit = any(k.lower() in text_lower for k in RECRUIT_TEXT_KEYWORDS)
        if not (path_hit or text_hit):
            continue
        abs_url = _abs_url(base_url, href)
        if not _is_same_domain(base_url, abs_url):
            continue
        # スコアリング
        score = 0
        if path_hit:
            score += 10
        if text_hit:
            score += 5
        # 短い URL（=ランディングっぽい）を優先
        score -= len(urlparse(abs_url).path)
        candidates.append((score, abs_url))
    if not candidates:
        return ""
    candidates.sort(reverse=True)
    return candidates[0][1]


def process_one(page: dict) -> dict:
    title = title_of(page)
    url = text_prop(page, "会社URL")
    existing_sns = page.get("properties", {}).get("SNS", {}).get("multi_select", [])
    existing_sns_names = [m.get("name") for m in existing_sns]
    existing_recruit = text_prop(page, "採用ページ")
    if not url:
        return {"id": page["id"], "title": title, "url": "",
                "status": "no_url", "sns": [], "recruit_url": "",
                "existing_sns": existing_sns_names,
                "existing_recruit": existing_recruit}
    html = fetch_html(url)
    if html is None:
        return {"id": page["id"], "title": title, "url": url,
                "status": "fetch_failed", "sns": [], "recruit_url": "",
                "existing_sns": existing_sns_names,
                "existing_recruit": existing_recruit}
    company_host = urlparse(url).netloc.lower()
    sns_found = extract_sns(html, company_host)
    recruit_url = extract_recruit_url(html, url)
    return {
        "id": page["id"], "title": title, "url": url,
        "status": "ok",
        "sns": sns_found,
        "recruit_url": recruit_url,
        "existing_sns": existing_sns_names,
        "existing_recruit": existing_recruit,
    }


def collect_targets(client: NotionClient, max_targets: int,
                    industry: str = "", media: str = "",
                    only_no_sns: bool = False,
                    only_no_recruit: bool = False) -> list[dict]:
    targets: list[dict] = []
    for page in client.iter_pages():
        if page.get("archived") or page.get("in_trash"):
            continue
        if industry:
            sel = page.get("properties", {}).get("業種", {}).get("select")
            if not sel or sel.get("name") != industry:
                continue
        if media:
            items = page.get("properties", {}).get("掲載元メディア", {}).get("multi_select", [])
            if not any(m.get("name") == media for m in items):
                continue
        url = text_prop(page, "会社URL")
        if not url:
            continue
        sns = page.get("properties", {}).get("SNS", {}).get("multi_select", [])
        recruit = text_prop(page, "採用ページ")
        sns_empty = len(sns) == 0
        recruit_empty = not recruit
        if only_no_sns and not sns_empty:
            continue
        if only_no_recruit and not recruit_empty:
            continue
        # 両方既に入っていればスキップ（再クロール不要）
        if not sns_empty and not recruit_empty:
            continue
        targets.append(page)
        if max_targets and len(targets) >= max_targets:
            break
    return targets


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--report", type=Path,
                    default=Path("sns_careers_report.json"))
    ap.add_argument("--apply", action="store_true",
                    help="抽出結果を Notion に書き込む（既定: dry-run）")
    ap.add_argument("--max-targets", type=int, default=0)
    ap.add_argument("--workers", type=int, default=DEFAULT_WORKERS)
    ap.add_argument("--industry", default="",
                    help="業種で絞る（例: 建設, 運輸・物流）")
    ap.add_argument("--media", default="")
    ap.add_argument("--only-no-sns", action="store_true")
    ap.add_argument("--only-no-recruit", action="store_true")
    args = ap.parse_args()

    if "NOTION_TOKEN" not in os.environ:
        print("error: NOTION_TOKEN required", file=sys.stderr)
        return 2

    client = NotionClient()
    targets = collect_targets(client, args.max_targets,
                              industry=args.industry, media=args.media,
                              only_no_sns=args.only_no_sns,
                              only_no_recruit=args.only_no_recruit)
    filter_desc = []
    if args.industry:
        filter_desc.append(f"業種={args.industry}")
    if args.media:
        filter_desc.append(f"メディア={args.media}")
    if args.only_no_sns:
        filter_desc.append("only-no-sns")
    if args.only_no_recruit:
        filter_desc.append("only-no-recruit")
    suffix = f" (filter: {', '.join(filter_desc)})" if filter_desc else ""
    print(f"[targets] {len(targets)} pages{suffix}", file=sys.stderr)
    if not targets:
        return 0

    report: list[dict] = []
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futures = [ex.submit(process_one, p) for p in targets]
        for i, fut in enumerate(as_completed(futures), 1):
            report.append(fut.result())
            if i % 50 == 0 or i == len(targets):
                sns_n = sum(1 for r in report if r.get("sns"))
                rec_n = sum(1 for r in report if r.get("recruit_url"))
                print(f"[progress] {i}/{len(targets)}  sns={sns_n}  recruit={rec_n}",
                      file=sys.stderr, flush=True)

    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2),
                           encoding="utf-8")
    summary = {
        "targets": len(targets),
        "sns_found": sum(1 for r in report if r.get("sns")),
        "recruit_found": sum(1 for r in report if r.get("recruit_url")),
        "fetch_failed": sum(1 for r in report if r["status"] == "fetch_failed"),
        "ok_no_sns_no_recruit": sum(1 for r in report
                                    if r["status"] == "ok"
                                    and not r.get("sns")
                                    and not r.get("recruit_url")),
    }
    print(f"\n{json.dumps(summary, ensure_ascii=False, indent=2)}")
    print(f"[report] written → {args.report}")

    if not args.apply:
        print("\n[dry-run] use --apply to write to Notion")
        return 0

    print(f"\n[apply] writing SNS / 採用ページ to Notion (only empty fields)...")
    applied_sns = 0
    applied_recruit = 0
    errors = 0
    for r in report:
        props: dict = {}
        if r.get("sns") and not r.get("existing_sns"):
            props["SNS"] = {"multi_select": [{"name": n} for n in r["sns"]]}
        if r.get("recruit_url") and not r.get("existing_recruit"):
            props["採用ページ"] = {"url": r["recruit_url"]}
        if not props:
            continue
        try:
            client.update_properties(r["id"], props)
            if "SNS" in props:
                applied_sns += 1
            if "採用ページ" in props:
                applied_recruit += 1
        except Exception as e:
            errors += 1
            print(f"[error] {r['title']}: {e}", file=sys.stderr)
    print(f"[apply] sns_applied={applied_sns}  recruit_applied={applied_recruit}  errors={errors}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
