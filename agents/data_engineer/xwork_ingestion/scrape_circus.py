"""CIRCUS AGENT (circus-job.com) からの企業情報スクレイパー。

会員制サイト。Playwright でログイン後、検索結果から求人詳細を巡回し、
「企業情報」セクションから会社情報を抽出する。

CLI:
    export CIRCUS_EMAIL=...
    export CIRCUS_PASSWORD=...
    python scrape_circus.py --start-url "https://circus-job.com/search?qJson=...&page=1&..." \
                            --out companies.json --max-pages 50

利用規約を確認済みであること。レート制限はデフォルト 2.5 秒/ページ。
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import sys
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from playwright.async_api import Page, async_playwright

BASE_URL = "https://circus-job.com"
LOGIN_URL = f"{BASE_URL}/login"

DEFAULT_DELAY_SEC = 2.5
DEFAULT_TIMEOUT_MS = 30_000

REAL_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/147.0.0.0 Safari/537.36"
)

JOB_PATH_RE = re.compile(r"^/search/(\d+)/?$")

COMPANY_DETAIL_LABELS = [
    "設立年", "上場区分", "企業フェーズ", "平均年齢",
    "従業員数", "男女比", "住所",
]


def _replace_page_param(url: str, page_num: int) -> str:
    parsed = urlparse(url)
    qs = [(k, v) for k, v in parse_qsl(parsed.query, keep_blank_values=True)
          if k != "page"]
    qs.append(("page", str(page_num)))
    return urlunparse(parsed._replace(query=urlencode(qs)))


async def login(page: Page, email: str, password: str,
                debug_dir: Path | None = None) -> bool:
    """ログインフォームに認証情報を入力してログインする。

    フォームのセレクタはサイト構造に応じて柔軟に試行する。
    失敗時はデバッグディレクトリに HTML / フォーム情報をダンプ。
    """
    try:
        await page.goto(LOGIN_URL, wait_until="domcontentloaded")
    except Exception as e:
        print(f"[login] navigation failed: {e}", file=sys.stderr)
        return False

    # SPA対応: JSバンドル読み込み完了まで待つ
    try:
        await page.wait_for_load_state("networkidle", timeout=30000)
    except Exception:
        pass

    # input 要素が描画されるまで待つ（最大2回試行）
    for attempt in range(2):
        try:
            await page.wait_for_selector("input", timeout=15000)
            break
        except Exception:
            if attempt == 0:
                print("[login] input not visible yet, waiting 5s more...",
                      file=sys.stderr)
                await asyncio.sleep(5)
                # 念のためページを再評価
                try:
                    await page.wait_for_load_state("networkidle",
                                                    timeout=10000)
                except Exception:
                    pass

    # ページ内の全 input 要素を列挙してログ出力（デバッグ強化）
    try:
        inputs = await page.eval_on_selector_all(
            "input",
            """els => els.map(e => ({
                type: e.type || '',
                name: e.name || '',
                id: e.id || '',
                placeholder: e.placeholder || '',
                autocomplete: e.autocomplete || '',
            }))""",
        )
        print(f"[login] found {len(inputs)} input fields:", file=sys.stderr)
        for inp in inputs[:20]:
            print(f"  - {inp}", file=sys.stderr)
    except Exception:
        inputs = []

    email_selectors = [
        'input[type="email"]',
        'input[name="email"]',
        'input[name="login_id"]',
        'input[name="loginId"]',
        'input[name="user[email]"]',
        'input[name="agent[email]"]',
        'input[name="account"]',
        'input[name="username"]',
        'input[name="id"]',
        'input[id="email"]',
        'input[id="login"]',
        'input[id="loginId"]',
        'input[autocomplete="email"]',
        'input[autocomplete="username"]',
    ]
    pw_selectors = [
        'input[type="password"]',
        'input[name="password"]',
        'input[name="user[password]"]',
        'input[name="agent[password]"]',
        'input[id="password"]',
        'input[autocomplete="current-password"]',
    ]
    submit_selectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("ログイン")',
        'button:has-text("サインイン")',
        'button:has-text("Login")',
        'a:has-text("ログイン")',
    ]

    async def _try_fill(selectors: list[str], value: str,
                        kind: str) -> str:
        for sel in selectors:
            try:
                el = await page.query_selector(sel)
                if el:
                    await el.fill(value)
                    print(f"[login] {kind} filled via {sel}", file=sys.stderr)
                    return sel
            except Exception:
                continue
        return ""

    def _dump_html(reason: str):
        if debug_dir:
            debug_dir.mkdir(parents=True, exist_ok=True)
            (debug_dir / f"login_failed_{reason}.html").write_text(
                "(dump pending)", encoding="utf-8")

    email_sel = await _try_fill(email_selectors, email, "email")
    if not email_sel:
        print("[login] email field not found", file=sys.stderr)
        try:
            html = await page.content()
            if debug_dir:
                debug_dir.mkdir(parents=True, exist_ok=True)
                (debug_dir / "login_page.html").write_text(html,
                                                            encoding="utf-8")
                print(f"[login] HTML dumped to {debug_dir}/login_page.html",
                      file=sys.stderr)
        except Exception:
            pass
        return False

    pw_sel = await _try_fill(pw_selectors, password, "password")
    if not pw_sel:
        print("[login] password field not found", file=sys.stderr)
        return False

    clicked = False
    for sel in submit_selectors:
        try:
            el = await page.query_selector(sel)
            if el:
                await el.click()
                print(f"[login] submit clicked via {sel}", file=sys.stderr)
                clicked = True
                break
        except Exception:
            continue
    if not clicked:
        try:
            await page.keyboard.press("Enter")
            print("[login] submitted via Enter key", file=sys.stderr)
        except Exception:
            print("[login] submit failed", file=sys.stderr)
            return False

    # ログイン後の遷移を待つ
    try:
        await page.wait_for_load_state("networkidle", timeout=15000)
    except Exception:
        pass

    # 念のため少し待つ
    await asyncio.sleep(2)

    current_url = page.url
    if "/login" in current_url:
        print(f"[login] still on /login: {current_url}", file=sys.stderr)
        # エラーメッセージを検出
        try:
            error_text = await page.evaluate("""() => {
                const sel = '[class*="error" i], [class*="Error"], [role="alert"], .MuiFormHelperText-root';
                const els = document.querySelectorAll(sel);
                return Array.from(els).map(e => (e.innerText||'').trim())
                    .filter(t => t).join(' | ');
            }""")
            if error_text:
                print(f"[login] error message: {error_text}",
                      file=sys.stderr)
        except Exception:
            pass
        if debug_dir:
            try:
                html = await page.content()
                debug_dir.mkdir(parents=True, exist_ok=True)
                (debug_dir / "login_after_submit.html").write_text(
                    html, encoding="utf-8")
                print(f"[login] post-submit HTML → "
                      f"{debug_dir}/login_after_submit.html",
                      file=sys.stderr)
            except Exception:
                pass
        return False
    return True


async def _dismiss_popups(page: Page) -> int:
    """ポップアップ/モーダルを総当たりで閉じる。"""
    closed = 0
    # Esc キーを数回
    for _ in range(3):
        try:
            await page.keyboard.press("Escape")
            await asyncio.sleep(0.3)
        except Exception:
            pass
    # 閉じるボタン候補
    close_selectors = [
        'button[aria-label="close"]',
        'button[aria-label="Close"]',
        'button[aria-label="閉じる"]',
        'div[role="dialog"] button',
        'button:has-text("閉じる")',
        'button:has-text("OK")',
        'button:has-text("同意")',
        'button:has-text("同意する")',
        'button:has-text("次へ")',
        'button:has-text("スキップ")',
        'button:has-text("あとで")',
        '[class*="modal"] [class*="close" i]',
        '[class*="dialog"] [class*="close" i]',
    ]
    for sel in close_selectors:
        try:
            els = await page.query_selector_all(sel)
            for el in els:
                try:
                    await el.click(timeout=2000)
                    closed += 1
                    await asyncio.sleep(0.3)
                except Exception:
                    pass
        except Exception:
            continue
    return closed


async def collect_job_urls(page: Page, start_url: str, max_pages: int,
                           delay: float,
                           debug_dir: Path | None = None) -> list[str]:
    """検索結果ページから求人URL（/search/{ID}）を収集する。"""
    job_ids: set[str] = set()
    for page_num in range(1, max_pages + 1):
        url = _replace_page_param(start_url, page_num)
        try:
            await page.goto(url, wait_until="domcontentloaded")
            # SPA対応: networkidle まで待つ
            try:
                await page.wait_for_load_state("networkidle", timeout=30000)
            except Exception:
                pass
            # ポップアップを閉じる
            if page_num == 1:
                closed = await _dismiss_popups(page)
                if closed:
                    print(f"[search p1] closed {closed} popup(s)",
                          file=sys.stderr)
                # 再度ロード待ち
                try:
                    await page.wait_for_load_state("networkidle",
                                                    timeout=10000)
                except Exception:
                    pass
            try:
                await page.wait_for_selector('a[href^="/search/"]',
                                             timeout=30000)
            except Exception as e:
                # 失敗時にHTMLダンプ
                print(f"[search p{page_num}] selector timeout: {e}",
                      file=sys.stderr)
                if debug_dir:
                    try:
                        debug_dir.mkdir(parents=True, exist_ok=True)
                        html = await page.content()
                        (debug_dir / f"search_p{page_num}.html").write_text(
                            html, encoding="utf-8")
                        body_text = await page.evaluate(
                            "() => document.body.innerText || ''")
                        (debug_dir / f"search_p{page_num}.txt").write_text(
                            body_text or "(empty)", encoding="utf-8")
                        print(f"[search p{page_num}] dumped HTML and text "
                              f"to {debug_dir}", file=sys.stderr)
                        print(f"[search p{page_num}] current URL: "
                              f"{page.url}", file=sys.stderr)
                    except Exception:
                        pass
                break
        except Exception as e:
            print(f"[search p{page_num}] failed: {e}", file=sys.stderr)
            break
        hrefs: list[str] = []
        for attempt in range(3):
            try:
                hrefs = await page.eval_on_selector_all(
                    'a[href^="/search/"]',
                    "els => els.map(e => e.getAttribute('href'))",
                )
                break
            except Exception:
                if attempt < 2:
                    await asyncio.sleep(1)
                else:
                    hrefs = []
        new = 0
        for href in hrefs:
            if not href:
                continue
            m = JOB_PATH_RE.match(href.split("?")[0])
            if not m:
                continue
            jid = m.group(1)
            if jid not in job_ids:
                job_ids.add(jid)
                new += 1
        print(f"[search p{page_num}] +{new} (total={len(job_ids)})",
              file=sys.stderr)
        if new == 0:
            break
        await asyncio.sleep(delay)
    # 新着順（IDの降順）
    return [f"{BASE_URL}/search/{jid}" for jid in sorted(
        job_ids, key=int, reverse=True)]


def _extract_label_value(text: str, label: str,
                         other_labels: list[str] | None = None) -> str:
    """「ラベル\\n値」or「ラベル: 値」パターンで値を取得。"""
    if not text or label not in text:
        return ""
    idx = text.find(label)
    if idx < 0:
        return ""
    after = text[idx + len(label):]
    after = after.lstrip(" :：\t")
    line = after.split("\n", 1)[0].strip()
    if not line:
        for ln in after.split("\n"):
            if ln.strip():
                line = ln.strip()
                break
    # 別のラベルが混入しないようにカット
    cut_labels = other_labels or COMPANY_DETAIL_LABELS
    for other in cut_labels:
        if other == label:
            continue
        if other in line:
            line = line.split(other)[0].strip()
    return line[:200]


def _normalize_listing(text: str) -> str:
    if not text:
        return ""
    if "プライム" in text:
        return "東証プライム"
    if "スタンダード" in text:
        return "東証スタンダード"
    if "グロース" in text:
        return "東証グロース"
    if "非上場" in text:
        return "非上場"
    if "上場" in text:
        return "その他"
    return ""


def _normalize_phase(text: str) -> str:
    if not text:
        return ""
    if "大手" in text:
        return "大手"
    if "中堅" in text:
        return "中堅"
    if "中小" in text:
        return "中小"
    if "スタートアップ" in text:
        return "スタートアップ"
    if "ベンチャー" in text:
        return "ベンチャー"
    return ""


def _normalize_employee_count(text: str) -> int | None:
    if not text:
        return None
    m = re.search(r"(\d[\d,]*)\s*[~〜~\-－]\s*(\d[\d,]*)", text)
    if m:
        try:
            low = int(m.group(1).replace(",", ""))
            high = int(m.group(2).replace(",", ""))
            return (low + high) // 2
        except ValueError:
            pass
    m = re.search(r"(\d[\d,]*)\s*名", text)
    if m:
        try:
            return int(m.group(1).replace(",", ""))
        except ValueError:
            pass
    return None


def _extract_year(text: str) -> int | None:
    m = re.search(r"(\d{4})\s*年", text or "")
    if m:
        try:
            return int(m.group(1))
        except ValueError:
            return None
    return None


async def extract_company_info(page: Page, job_url: str,
                               debug_dir: Path | None = None) -> dict | None:
    """求人詳細ページから会社情報を抽出する。"""
    try:
        await page.goto(job_url, wait_until="domcontentloaded")
        # SPA対応: networkidle まで待つ
        try:
            await page.wait_for_load_state("networkidle", timeout=20000)
        except Exception:
            pass
        await page.wait_for_selector("text=企業情報", timeout=15000)
    except Exception as e:
        print(f"[detail {job_url}] navigation failed: {e}", file=sys.stderr)
        return None

    body_text = await page.evaluate("() => document.body.innerText || ''")

    links = await page.eval_on_selector_all(
        "a[href^='http']",
        "els => els.map(e => ({text: (e.innerText||'').trim(), href: e.href}))",
    )

    if debug_dir:
        debug_dir.mkdir(parents=True, exist_ok=True)
        job_id = job_url.rstrip("/").split("/")[-1]
        (debug_dir / f"job_{job_id}.txt").write_text(
            body_text or "(empty)", encoding="utf-8")

    # 会社名抽出
    company_name = ""
    for label in ("求人企業", "求人取扱企業"):
        m = re.search(rf"{label}\s*[：:]\s*([^\n]+)", body_text)
        if m:
            company_name = m.group(1).strip()
            break
    if not company_name:
        for line in body_text.split("\n"):
            line = line.strip()
            if not line:
                continue
            if any(kw in line for kw in ("株式会社", "有限会社",
                                         "合同会社", "合資会社")):
                # 括弧前まで
                company_name = re.split(r"[（(]", line)[0].strip()
                break
    if not company_name:
        return None

    # 求人区分
    classification = ""
    head = body_text[:1000]
    for kw in ("企業求人", "シェアリング求人", "自社登録求人",
               "事務局サポート求人"):
        if kw in head:
            classification = kw
            break

    # 企業情報セクション
    info: dict = {}
    if "企業情報" in body_text:
        section = body_text.split("企業情報", 1)[1]
        for stop in ("採用要件", "求職者向け", "この求人の魅力",
                     "求人概要", "エージェント向け情報"):
            if stop in section:
                section = section.split(stop, 1)[0]
                break
        for label in COMPANY_DETAIL_LABELS:
            info[label] = _extract_label_value(section, label)

    # 公式HP / YouTube
    company_hp = ""
    youtube_url = ""
    exclude_hosts = (
        "circus-job.com", "twitter.com", "x.com", "instagram.com",
        "facebook.com", "linkedin.com", "google.com", "youtube.com",
        "youtu.be",
    )
    for lk in links:
        href = lk.get("href", "")
        text = lk.get("text", "")
        if "youtube.com" in href or "youtu.be" in href:
            if not youtube_url:
                youtube_url = href
            continue
        if not href:
            continue
        if any(ex in href for ex in exclude_hosts):
            continue
        if "自社ホームページ" in text or "公式" in text or "HP" in text:
            company_hp = href
            break
        if not company_hp:
            company_hp = href

    # 業界カテゴリ（会社名直後の括弧内）
    industry_label = ""
    m = re.search(re.escape(company_name) + r"\s*[（(](.+?)[）)]", body_text)
    if m:
        industry_label = m.group(1).strip()[:200]

    # その他のラベル値
    occupation = _extract_label_value(
        body_text, "職種",
        other_labels=["職位", "年収", "勤務地", "資格"],
    )
    salary_range = _extract_label_value(
        body_text, "年収",
        other_labels=["職種", "職位", "勤務地", "資格"],
    )
    workplace = _extract_label_value(
        body_text, "勤務地",
        other_labels=["職種", "職位", "年収", "資格"],
    )

    return {
        "company_name": company_name,
        "company_hp": company_hp,
        "youtube_url": youtube_url,
        "address": info.get("住所", ""),
        "workplace_address": workplace,
        "phone": "",
        "company_url": company_hp,
        "occupation": occupation,
        "industry_label": industry_label,
        "classification": classification,
        "salary_range": salary_range,
        "founded_year": _extract_year(info.get("設立年", "")),
        "listing_class": _normalize_listing(info.get("上場区分", "")),
        "company_phase": _normalize_phase(info.get("企業フェーズ", "")),
        "employee_count_total": _normalize_employee_count(
            info.get("従業員数", "")),
        "average_age": info.get("平均年齢", ""),
        "gender_ratio": info.get("男女比", ""),
        "representative": "",
        "representative_title": "",
        "business_content": "",
        "company_feature": "",
        "employee_count_workplace": None,
        "employee_count_female": None,
        "employee_count_part_time": None,
        "capital": "",
        "founded": info.get("設立年", ""),
        "description": "",
        "detail_url": job_url,
        "hello_work_company_id": "",
        "source_url": job_url,
    }


async def _launch_browser(pw, headed: bool, use_real_chrome: bool):
    args = ["--disable-blink-features=AutomationControlled"]
    if use_real_chrome:
        try:
            return await pw.chromium.launch(channel="chrome",
                                            headless=not headed, args=args)
        except Exception as e:
            print(f"[warn] installed Chrome not available ({e})",
                  file=sys.stderr)
    return await pw.chromium.launch(headless=not headed, args=args)


async def crawl(start_url: str, max_pages: int, delay: float,
                headed: bool, use_real_chrome: bool,
                limit_jobs: int | None = None,
                debug_dir: Path | None = None,
                email: str = "", password: str = "") -> list[dict]:
    results: list[dict] = []
    seen_companies: set[str] = set()
    async with async_playwright() as pw:
        browser = await _launch_browser(pw, headed, use_real_chrome)
        ctx = await browser.new_context(
            locale="ja-JP",
            timezone_id="Asia/Tokyo",
            user_agent=REAL_UA,
            viewport={"width": 1280, "height": 800},
            extra_http_headers={"Accept-Language": "ja,en-US;q=0.9,en;q=0.8"},
        )
        page = await ctx.new_page()
        page.set_default_timeout(DEFAULT_TIMEOUT_MS)

        if email and password:
            print("[login] attempting login...", file=sys.stderr)
            ok = await login(page, email, password, debug_dir=debug_dir)
            if not ok:
                print("[login] FAILED", file=sys.stderr)
                await browser.close()
                return []
            print("[login] success", file=sys.stderr)

        print(f"[step1] collecting job URLs", file=sys.stderr)
        job_urls = await collect_job_urls(page, start_url, max_pages, delay,
                                          debug_dir=debug_dir)
        print(f"[step1] {len(job_urls)} job URLs collected", file=sys.stderr)

        if limit_jobs is not None:
            job_urls = job_urls[:limit_jobs]
            print(f"[step2] limited to first {len(job_urls)} jobs",
                  file=sys.stderr)

        print(f"[step2] extracting company info from {len(job_urls)} jobs",
              file=sys.stderr)
        for i, job_url in enumerate(job_urls, 1):
            info = await extract_company_info(page, job_url,
                                              debug_dir=debug_dir)
            if info is None:
                if i % 20 == 0 or i == len(job_urls):
                    print(f"[detail {i}/{len(job_urls)}] skip (no info)",
                          file=sys.stderr)
                await asyncio.sleep(delay)
                continue
            name = info["company_name"]
            if name in seen_companies:
                if i % 20 == 0 or i == len(job_urls):
                    print(f"[detail {i}/{len(job_urls)}] dup {name!r} "
                          f"(unique={len(results)})", file=sys.stderr)
            else:
                seen_companies.add(name)
                results.append(info)
                if i % 20 == 0 or i == len(job_urls):
                    print(f"[detail {i}/{len(job_urls)}] +{name!r} "
                          f"(unique={len(results)})", file=sys.stderr)
            await asyncio.sleep(delay)
        await browser.close()
    return results


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--start-url", required=True,
                    help="検索結果ページのURL（occupations + cities含む）")
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--max-pages", type=int, default=100)
    ap.add_argument("--limit-jobs", type=int, default=None,
                    help="詳細クロール上限（コスト/時間予防）")
    ap.add_argument("--delay", type=float, default=DEFAULT_DELAY_SEC)
    ap.add_argument("--headless", action="store_true")
    ap.add_argument("--no-real-chrome", action="store_true")
    ap.add_argument("--debug-dir", type=Path, default=None,
                    help="求人ページのbody textを保存（構造調査用）")
    args = ap.parse_args()

    email = os.environ.get("CIRCUS_EMAIL", "")
    password = os.environ.get("CIRCUS_PASSWORD", "")
    if not email or not password:
        print("error: CIRCUS_EMAIL / CIRCUS_PASSWORD env required",
              file=sys.stderr)
        return 2

    data = asyncio.run(crawl(
        args.start_url, args.max_pages, args.delay,
        headed=not args.headless,
        use_real_chrome=not args.no_real_chrome,
        limit_jobs=args.limit_jobs,
        debug_dir=args.debug_dir,
        email=email,
        password=password,
    ))
    args.out.write_text(json.dumps(data, ensure_ascii=False, indent=2),
                        encoding="utf-8")
    print(f"wrote {len(data)} companies → {args.out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
