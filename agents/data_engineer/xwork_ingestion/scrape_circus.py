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

    # URL が /login から離れるのを最大10秒待つ
    for _ in range(20):
        if "/login" not in page.url:
            break
        await asyncio.sleep(0.5)

    current_url = page.url
    if "/login" in current_url:
        print(f"[login] still on /login: {current_url}", file=sys.stderr)
        # innerText + screenshot を保存（HTML だけだと SPA で中身が分からない）
        try:
            body_text = await page.evaluate(
                "() => document.body.innerText || ''")
            if debug_dir:
                debug_dir.mkdir(parents=True, exist_ok=True)
                (debug_dir / "login_after_submit.txt").write_text(
                    body_text or "(empty)", encoding="utf-8")
                print(f"[login] post-submit innerText → "
                      f"{debug_dir}/login_after_submit.txt", file=sys.stderr)
        except Exception:
            body_text = ""
        try:
            if debug_dir:
                await page.screenshot(
                    path=str(debug_dir / "login_after_submit.png"),
                    full_page=True)
                print(f"[login] screenshot → "
                      f"{debug_dir}/login_after_submit.png", file=sys.stderr)
        except Exception:
            pass
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


async def _scroll_to_bottom(page: Page, steps: int = 6) -> None:
    """ページを段階的にスクロールし、仮想リスト/遅延描画をトリガー。"""
    try:
        height = await page.evaluate("() => document.body.scrollHeight || 0")
    except Exception:
        height = 0
    if not height:
        return
    for i in range(1, steps + 1):
        y = int(height * i / steps)
        try:
            await page.evaluate(f"window.scrollTo(0, {y})")
        except Exception:
            pass
        await asyncio.sleep(0.4)
    try:
        await page.evaluate("window.scrollTo(0, 0)")
    except Exception:
        pass


async def _extract_job_ids_from_dom(page: Page) -> list[str]:
    """求人ID を DOM の /search/{ID} アンカー + __NEXT_DATA__ から抽出。
    CIRCUS は検索カードに <a href> を持たない場合があるので、
    __NEXT_DATA__ の jobSearch.items / "id": NNN も走査する。
    city/occupation ID 混入を避けるため、ID 長 >= 5 桁(>=10000)で絞る。
    """
    try:
        jids = await page.evaluate(
            r"""() => {
                const ids = new Set();
                const add = (v) => {
                    if (!v) return;
                    // 5桁以上のみ採用（city ID 1156-1332、occupation 147-172 を除外）
                    if (String(v).length >= 5) ids.add(String(v));
                };
                document.querySelectorAll('a[href]').forEach(a => {
                    const h = a.getAttribute('href') || '';
                    const m = h.match(/^\/search\/(\d+)(?:[\/?#]|$)/);
                    if (m) add(m[1]);
                });
                const nd = document.getElementById('__NEXT_DATA__');
                if (nd && nd.textContent) {
                    const re = /"\/search\/(\d+)"|"jobId":\s*(\d+)|"id":\s*(\d+)/g;
                    let m;
                    while ((m = re.exec(nd.textContent)) !== null) {
                        add(m[1] || m[2] || m[3]);
                    }
                }
                return Array.from(ids);
            }"""
        )
        return [str(j) for j in (jids or [])]
    except Exception:
        return []


_API_JOB_ID_RE = re.compile(r'"(?:id|jobId|job_id)"\s*:\s*(\d{5,})')
_API_URL_JOB_RE = re.compile(r'/search/(\d{5,})(?:[?#"\\]|$)')


async def collect_job_urls(page: Page, start_url: str, max_pages: int,
                           delay: float,
                           debug_dir: Path | None = None) -> list[str]:
    """検索結果ページから求人URL（/search/{ID}）を収集する。
    DOM + __NEXT_DATA__ + API レスポンスインターセプト の3経路で求人IDを拾う。
    """
    job_ids: set[str] = set()
    api_captured: set[str] = set()
    _api_dump_count = [0]

    async def on_response(response):
        try:
            url = response.url
            if "circus-job.com" not in url:
                return
            # 検索結果APIのみ対象（qJson含むURL）。groups/conditions等は除外。
            if "qJson" not in url and "job_search" not in url and "jobs" not in url:
                return
            headers = response.headers or {}
            ct = (headers.get("content-type") or "").lower()
            if "json" not in ct:
                return
            body = await response.text()
            if not body or len(body) > 5_000_000:
                return
            # JSON parse して jobs[].id を厳密抽出
            try:
                data = json.loads(body)
                jobs = data.get("jobs") if isinstance(data, dict) else None
                if isinstance(jobs, list):
                    for job in jobs:
                        if isinstance(job, dict):
                            jid = job.get("id")
                            if isinstance(jid, int) and jid > 0:
                                api_captured.add(str(jid))
            except Exception:
                pass
            # 補助: URL リテラル /search/{ID} も拾う
            for m in _API_URL_JOB_RE.finditer(body):
                api_captured.add(m.group(1))
            # 最初の10件のAPIレスポンスをデバッグ保存
            if debug_dir and _api_dump_count[0] < 10:
                try:
                    debug_dir.mkdir(parents=True, exist_ok=True)
                    idx = _api_dump_count[0]
                    _api_dump_count[0] += 1
                    safe_url = re.sub(r'[^a-zA-Z0-9]', '_', url)[-80:]
                    (debug_dir / f"api_{idx:02d}_{safe_url}.json").write_text(
                        body[:1_000_000], encoding="utf-8")
                except Exception:
                    pass
        except Exception:
            pass

    def listener(response):
        asyncio.create_task(on_response(response))

    page.on("response", listener)
    try:
        for page_num in range(1, max_pages + 1):
            url = _replace_page_param(start_url, page_num)
            try:
                await page.goto(url, wait_until="domcontentloaded")
                try:
                    await page.wait_for_load_state("networkidle", timeout=30000)
                except Exception:
                    pass
                if page_num == 1:
                    closed = await _dismiss_popups(page)
                    if closed:
                        print(f"[search p1] closed {closed} popup(s)",
                              file=sys.stderr)
                    try:
                        await page.wait_for_load_state("networkidle",
                                                        timeout=10000)
                    except Exception:
                        pass

                content_loaded = False
                try:
                    await page.wait_for_function(
                        r"""() => {
                            const anchors = document.querySelectorAll('a[href]');
                            for (const a of anchors) {
                                const h = a.getAttribute('href') || '';
                                if (/^\/search\/\d+/.test(h)) return true;
                            }
                            const cards = document.querySelectorAll(
                                '[class*="JobSearchResultCard"]');
                            if (cards.length > 0) {
                                const txt = (cards[0].innerText || '').trim();
                                if (txt.length > 50) return true;
                            }
                            return false;
                        }""",
                        timeout=30000,
                    )
                    content_loaded = True
                except Exception:
                    await _scroll_to_bottom(page)
                    try:
                        await page.wait_for_load_state("networkidle",
                                                        timeout=10000)
                    except Exception:
                        pass

                if not content_loaded:
                    print(f"[search p{page_num}] content wait timeout, "
                          f"trying API capture + search button click",
                          file=sys.stderr)
                    # 「検索する」ボタンを総当たりクリックして結果ロードをトリガー
                    try:
                        clicked = await page.evaluate(r"""() => {
                            const buttons = document.querySelectorAll(
                                'button, [role="button"]');
                            for (const b of buttons) {
                                const t = (b.innerText || '').trim();
                                if (/件を?検索/.test(t) || /^検索する$/.test(t)) {
                                    b.click();
                                    return t;
                                }
                            }
                            return '';
                        }""")
                        if clicked:
                            print(f"[search p{page_num}] clicked button: "
                                  f"{clicked!r}", file=sys.stderr)
                            await asyncio.sleep(3)
                            try:
                                await page.wait_for_load_state(
                                    "networkidle", timeout=15000)
                            except Exception:
                                pass
                    except Exception:
                        pass
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
                            await page.screenshot(
                                path=str(debug_dir /
                                         f"search_p{page_num}.png"),
                                full_page=True)
                            print(f"[search p{page_num}] dumped HTML/text/png "
                                  f"→ {debug_dir}", file=sys.stderr)
                        except Exception:
                            pass
            except Exception as e:
                print(f"[search p{page_num}] failed: {e}", file=sys.stderr)
                break

            await _scroll_to_bottom(page, steps=4)
            # API レスポンス処理完了を少し待つ
            await asyncio.sleep(2)

            jids_dom = await _extract_job_ids_from_dom(page)
            all_jids = set(jids_dom) | api_captured

            new_ids = all_jids - job_ids
            new_count = len(new_ids)
            job_ids |= new_ids
            print(f"[search p{page_num}] +{new_count} "
                  f"(api={len(api_captured)}, total={len(job_ids)})",
                  file=sys.stderr)
            if new_count == 0:
                break
            await asyncio.sleep(delay)
    finally:
        try:
            page.remove_listener("response", listener)
        except Exception:
            pass
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
                               debug_dir: Path | None = None,
                               dump_always: bool = False) -> dict | None:
    """求人詳細ページから会社情報を抽出する。"""
    try:
        await page.goto(job_url, wait_until="domcontentloaded")
        try:
            await page.wait_for_load_state("networkidle", timeout=20000)
        except Exception:
            pass
    except Exception as e:
        print(f"[detail {job_url}] navigation failed: {e}", file=sys.stderr)
        return None

    # セッション切れ検出
    if "/login" in page.url:
        print(f"[detail {job_url}] redirected to /login (session expired)",
              file=sys.stderr)
        return None

    # 「企業情報」「会社情報」「求人企業」のいずれかの登場を待つ（緩く）
    found_label = ""
    for label in ("企業情報", "会社情報", "求人企業", "求人取扱企業"):
        try:
            await page.wait_for_selector(f"text={label}", timeout=8000)
            found_label = label
            break
        except Exception:
            continue

    body_text = await page.evaluate("() => document.body.innerText || ''")
    job_id = job_url.rstrip("/").split("/")[-1]

    if debug_dir and (dump_always or not found_label):
        debug_dir.mkdir(parents=True, exist_ok=True)
        (debug_dir / f"job_{job_id}.txt").write_text(
            body_text or "(empty)", encoding="utf-8")
        if not found_label:
            print(f"[detail {job_url}] no label found, dumped body to "
                  f"{debug_dir}/job_{job_id}.txt", file=sys.stderr)

    if not found_label:
        return None

    links = await page.eval_on_selector_all(
        "a[href^='http']",
        "els => els.map(e => ({text: (e.innerText||'').trim(), href: e.href}))",
    )

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
                email: str = "", password: str = "",
                out_path: Path | None = None,
                save_every: int = 20) -> list[dict]:
    results: list[dict] = []
    seen_companies: set[str] = set()

    # 既存JSONがあれば読み込み（再開対応）
    if out_path and out_path.exists():
        try:
            existing = json.loads(out_path.read_text(encoding="utf-8"))
            if isinstance(existing, list):
                results = existing
                for r in results:
                    n = r.get("company_name", "")
                    if n:
                        seen_companies.add(n)
                print(f"[resume] loaded {len(results)} existing companies "
                      f"from {out_path}", file=sys.stderr)
        except Exception as e:
            print(f"[resume] failed to load {out_path}: {e}", file=sys.stderr)

    def _save_partial(reason: str = ""):
        if not out_path:
            return
        try:
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(
                json.dumps(results, ensure_ascii=False, indent=2),
                encoding="utf-8")
            print(f"[save] {len(results)} companies → {out_path}"
                  + (f" ({reason})" if reason else ""), file=sys.stderr)
        except Exception as e:
            print(f"[save] failed: {e}", file=sys.stderr)

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

        async def _ensure_login() -> bool:
            if not (email and password):
                return False
            return await login(page, email, password, debug_dir=debug_dir)

        if email and password:
            print("[login] attempting login...", file=sys.stderr)
            ok = await _ensure_login()
            if not ok:
                print("[login] FAILED", file=sys.stderr)
                await browser.close()
                return results
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
        try:
            for i, job_url in enumerate(job_urls, 1):
                info = await extract_company_info(
                    page, job_url,
                    debug_dir=debug_dir,
                    dump_always=(debug_dir is not None and i <= 3),
                )
                # /login 検出時は再ログインしてリトライ
                if info is None and "/login" in page.url:
                    print(f"[detail {i}] session expired, re-logging in...",
                          file=sys.stderr)
                    ok = await _ensure_login()
                    if ok:
                        print(f"[detail {i}] re-login ok, retrying",
                              file=sys.stderr)
                        info = await extract_company_info(
                            page, job_url, debug_dir=debug_dir,
                            dump_always=False,
                        )
                    else:
                        print(f"[detail {i}] re-login failed, abort",
                              file=sys.stderr)
                        _save_partial("re-login failed")
                        break

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
                if save_every and len(results) % save_every == 0:
                    _save_partial(f"checkpoint {i}/{len(job_urls)}")
                await asyncio.sleep(delay)
        except KeyboardInterrupt:
            print("[crawl] interrupted by user", file=sys.stderr)
            _save_partial("interrupted")
            raise
        finally:
            _save_partial("final")
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
        out_path=args.out,
    ))
    args.out.write_text(json.dumps(data, ensure_ascii=False, indent=2),
                        encoding="utf-8")
    print(f"wrote {len(data)} companies → {args.out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
