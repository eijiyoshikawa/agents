"""会社URL から電話番号を抽出して Notion DB_顧客管理 を補完するツール。

DB_顧客管理 で「会社URLあり / 電話番号なし」のページを対象に、
公式サイトを GET → `tel:` リンクや「電話 / TEL」表記の正規表現で
電話番号を抽出し、Notion の「電話番号」フィールドに書き込む。

設計方針:
- gBizINFO や Google Places のような有料・規約厳格な API を使わずに、
  各社の公式サイトをポライトにクロール（並列5、タイムアウト10秒）。
- フリーダイヤル(0120/0570/0800)は代表番号でない可能性が高いので、
  通常電話番号があればそちらを優先。
- 取得失敗・抽出失敗もレポートに残し、後段の手動補完用リストになる。

CLI:
    python enrich_phones.py --report report.json           # レポートのみ
    python enrich_phones.py --apply                        # Notion 書き込み
    python enrich_phones.py --max-targets 100 --apply      # 上限指定
    python enrich_phones.py --workers 3 --apply            # 並列数調整
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import unicodedata
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Optional

import requests

from normalize import normalize_phone
from notion_client import NotionClient, text_prop, title_of

REAL_UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
           "AppleWebKit/537.36 (KHTML, like Gecko) "
           "Chrome/131.0.0.0 Safari/537.36")

DEFAULT_TIMEOUT = 10.0
DEFAULT_WORKERS = 5

# 各種ハイフン・ダッシュをまとめて受け取れるよう [\-‐‑–—−ー] を含む
PHONE_SEP = r"[\-‐‑–—−ー\(\) ]?"
TEL_HREF_RE = re.compile(r'href=["\']tel:([\d\-+\s()]+)', re.IGNORECASE)
# 「電話」「TEL」等のラベル後 10〜20 文字以内
PHONE_LABEL_RE = re.compile(
    rf"(電話|TEL|Tel|tel|ＴＥＬ|☎|fax|FAX|ファックス)[\s:：番号]*[\(\[]?([\d{re.escape('-‐‑–—−ー')}\(\)\s]{{10,20}})",
    re.IGNORECASE,
)
# 0XXXX-YYYY-ZZZZ 形式（緩いマッチ）
PHONE_LOOSE_RE = re.compile(
    rf"(?<![\d\-])(0\d{{1,4}}){PHONE_SEP}(\d{{1,4}}){PHONE_SEP}(\d{{3,4}})(?![\d\-])"
)

FREE_DIAL_PREFIXES = ("0120", "0570", "0800")


def _valid_jp_phone(digits: str) -> bool:
    if not (10 <= len(digits) <= 11):
        return False
    if not digits.startswith("0"):
        return False
    return True


def extract_phones(html: str) -> tuple[list[str], list[str]]:
    """HTML から (phones, fax_candidates) を抽出する。"""
    phones: list[str] = []
    fax: list[str] = []
    # 1. tel: リンクは最優先
    for m in TEL_HREF_RE.finditer(html):
        norm = normalize_phone(m.group(1))
        if _valid_jp_phone(norm):
            phones.append(norm)
    # 2. ラベル付き（"FAX" などのラベル種別で fax/phone を振り分ける）
    text = unicodedata.normalize("NFKC", html)
    for m in PHONE_LABEL_RE.finditer(text):
        label = m.group(1).lower()
        norm = normalize_phone(m.group(2))
        if not _valid_jp_phone(norm):
            continue
        if "fax" in label or "ファックス" in m.group(1):
            fax.append(norm)
        else:
            phones.append(norm)
    # 3. 緩いパターン（ラベルなしの番号）— 補完用
    for m in PHONE_LOOSE_RE.finditer(text):
        norm = "".join(m.groups())
        if _valid_jp_phone(norm) and norm not in phones and norm not in fax:
            phones.append(norm)
    # 重複除去（順序保持）
    seen: set[str] = set()
    uniq_phones = [p for p in phones if not (p in seen or seen.add(p))]
    seen.clear()
    uniq_fax = [p for p in fax if not (p in seen or seen.add(p))]
    return uniq_phones, uniq_fax


def pick_best(phones: list[str], fax_set: set[str]) -> str:
    """候補から代表番号を選ぶ。"""
    if not phones:
        return ""
    # FAX として認識した番号は除外
    filtered = [p for p in phones if p not in fax_set]
    if not filtered:
        return ""
    # 通常番号を優先（フリーダイヤル / 携帯は後回し）
    landline = [p for p in filtered
                if not p.startswith(FREE_DIAL_PREFIXES)
                and not p.startswith(("070", "080", "090"))]
    if landline:
        return landline[0]
    return filtered[0]


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


def process_one(page: dict) -> dict:
    url = text_prop(page, "会社URL")
    title = title_of(page)
    if not url:
        return {"id": page["id"], "title": title, "url": "",
                "phone": "", "status": "no_url"}
    html = fetch_html(url)
    if html is None:
        return {"id": page["id"], "title": title, "url": url,
                "phone": "", "status": "fetch_failed"}
    phones, fax = extract_phones(html)
    phone = pick_best(phones, set(fax))
    return {
        "id": page["id"],
        "title": title,
        "url": url,
        "phone": phone,
        "candidates": phones[:5],
        "fax_candidates": fax[:3],
        "status": "ok" if phone else "no_phone",
    }


def collect_targets(client: NotionClient, max_targets: int) -> list[dict]:
    targets: list[dict] = []
    for page in client.iter_pages():
        if page.get("archived") or page.get("in_trash"):
            continue
        url = text_prop(page, "会社URL")
        phone = text_prop(page, "電話番号")
        if url and not phone:
            targets.append(page)
            if max_targets and len(targets) >= max_targets:
                break
    return targets


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--report", type=Path,
                    default=Path("phone_enrich_report.json"))
    ap.add_argument("--apply", action="store_true",
                    help="抽出した電話番号を Notion に書き込む（既定: dry-run）")
    ap.add_argument("--max-targets", type=int, default=0,
                    help="対象上限（0=無制限）")
    ap.add_argument("--workers", type=int, default=DEFAULT_WORKERS)
    args = ap.parse_args()

    if "NOTION_TOKEN" not in os.environ:
        print("error: NOTION_TOKEN required", file=sys.stderr)
        return 2

    client = NotionClient()
    targets = collect_targets(client, args.max_targets)
    print(f"[targets] {len(targets)} pages with URL but no phone",
          file=sys.stderr)
    if not targets:
        return 0

    report: list[dict] = []
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futures = [ex.submit(process_one, p) for p in targets]
        for i, fut in enumerate(as_completed(futures), 1):
            report.append(fut.result())
            if i % 50 == 0 or i == len(targets):
                ok = sum(1 for r in report if r.get("phone"))
                print(f"[progress] {i}/{len(targets)}  phones_found={ok}",
                      file=sys.stderr, flush=True)

    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2),
                           encoding="utf-8")
    summary = {
        "targets": len(targets),
        "phones_found": sum(1 for r in report if r.get("phone")),
        "no_phone": sum(1 for r in report if r["status"] == "no_phone"),
        "fetch_failed": sum(1 for r in report if r["status"] == "fetch_failed"),
    }
    print(f"\n{json.dumps(summary, ensure_ascii=False, indent=2)}")
    print(f"[report] written → {args.report}")

    if not args.apply:
        print("\n[dry-run] use --apply to write to Notion")
        return 0

    print(f"\n[apply] writing phones to Notion...")
    applied = 0
    errors = 0
    for r in report:
        if not r.get("phone"):
            continue
        try:
            client.update_properties(r["id"], {
                "電話番号": {"phone_number": r["phone"]},
            })
            applied += 1
        except Exception as e:
            errors += 1
            print(f"[error] {r['title']}: {e}", file=sys.stderr)
    print(f"[apply] applied={applied}, errors={errors}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
