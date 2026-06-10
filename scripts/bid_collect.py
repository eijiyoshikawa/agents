#!/usr/bin/env python3
"""入札ウォッチ — 官公需情報ポータルサイト検索API から AI/SNS 案件を自動収集し Notion DB に追記する。

公式 API（中小企業庁／無料・認証不要・XML 応答）:
  エンドポイント: https://www.kkj.go.jp/api/
  ガイド:        https://www.kkj.go.jp/doc/ja/api_guide.pdf
国・独立行政法人・地方自治体の入札情報を横断する。キーワードごとに直近の公告を取得し、
URL で重複排除して Notion DB に未登録の案件だけを「未着手」で追記する。

必要な環境変数:
  NOTION_TOKEN        — Notion インテグレーションのトークン
  NOTION_DATABASE_ID  — 入札案件ウォッチDB の database id
オプション:
  COLLECT_WINDOW_DAYS — 公告日の遡及日数（既定 14）
  DRY_RUN             — "1" なら Notion へ書き込まず収集結果を表示のみ
"""
import os
import sys
import json
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta

KKJ_API = "https://www.kkj.go.jp/api/"
NOTION_VERSION = "2022-06-28"
JST = timezone(timedelta(hours=9))

# キーワード → 領域。API は件名の部分一致で検索する。
AI_KEYWORDS = ["生成AI", "AI活用", "人工知能", "チャットボット", "RAG"]
SNS_KEYWORDS = ["SNS運用", "SNS運営", "SNS広告", "Instagram",
                "シティプロモーション", "デジタルマーケティング"]

# XML 要素名のゆれを吸収するための候補（先に一致したものを採用）。
TAG_CANDIDATES = {
    "name": ["Project_Name", "ProjectName", "Title", "Name", "件名", "案件名"],
    "org": ["Organization_Name", "OrganizationName", "Organization", "機関名"],
    "issue": ["CFT_Issue_Date", "IssueDate", "公開日", "公告日"],
    "due": ["Tender_Submission_Deadline", "Deadline", "締切日", "入札締切"],
    "url": ["External_Document_URI", "Url", "URI", "Link", "URL"],
}


def _strip_ns(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _http_get(url: str) -> bytes:
    req = urllib.request.Request(
        url, headers={"User-Agent": "bid-watch/1.0 (+github-actions)"}
    )
    with urllib.request.urlopen(req, timeout=30) as res:
        return res.read()


def _child_text(record: ET.Element, key: str) -> str:
    for child in record:
        if _strip_ns(child.tag) in TAG_CANDIDATES[key]:
            return (child.text or "").strip()
    return ""


def _find_records(root: ET.Element) -> list[ET.Element]:
    """name 候補タグを直接の子に持つ要素を1案件レコードとみなす。"""
    records = []
    for el in root.iter():
        if any(_strip_ns(c.tag) in TAG_CANDIDATES["name"] for c in el):
            records.append(el)
    return records


def fetch_by_keyword(keyword: str, since: str) -> list[dict]:
    params = {"Query": keyword, "CFT_Issue_Date": f"{since}/", "Count": "300"}
    url = KKJ_API + "?" + urllib.parse.urlencode(params)
    try:
        body = _http_get(url)
        root = ET.fromstring(body)
    except Exception as exc:  # noqa: BLE001 — 1キーワードの失敗で全体を止めない
        print(f"  [warn] '{keyword}' 取得失敗: {exc}", file=sys.stderr)
        return []
    out = []
    for rec in _find_records(root):
        name = _child_text(rec, "name")
        if not name:
            continue
        out.append({
            "name": name,
            "org": _child_text(rec, "org"),
            "issue": _child_text(rec, "issue"),
            "due": _child_text(rec, "due"),
            "url": _child_text(rec, "url"),
        })
    return out


def collect(window_days: int) -> dict[str, dict]:
    """全キーワードを収集し URL（無ければ名前+機関）をキーに重複排除した dict を返す。"""
    since = (datetime.now(JST).date() - timedelta(days=window_days)).isoformat()
    found: dict[str, dict] = {}
    for domain, keywords in (("AI/生成AI", AI_KEYWORDS), ("SNS/デジマ", SNS_KEYWORDS)):
        for kw in keywords:
            for case in fetch_by_keyword(kw, since):
                key = case["url"] or f"{case['name']}|{case['org']}"
                if key in found:
                    continue
                case["domain"] = domain
                case["matched"] = kw
                found[key] = case
            print(f"  {domain} / {kw}: 累計 {len(found)} 件")
    return found


def _scope(org: str) -> str:
    if any(s in org for s in ("省", "庁", "独立行政法人", "機構", "公庫", "公社")):
        return "国"
    if any(s in org for s in ("県", "市", "区", "町", "村", "都", "道", "府")):
        return "自治体"
    return "自治体"


def _type(name: str) -> str:
    if "プロポーザル" in name:
        return "公募型プロポーザル"
    if "企画提案" in name or "企画競争" in name:
        return "企画提案/競技"
    if "公示" in name:
        return "公示"
    return "一般競争入札"


def _match_tags(case: dict) -> list[str]:
    known = {"生成AI", "AI活用", "RAG", "SNS運用", "SNS広告",
             "Instagram", "シティプロモーション", "誘客促進"}
    return [case["matched"]] if case["matched"] in known else []


def _notion_headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    }


def existing_keys(token: str, database_id: str) -> set:
    url = f"https://api.notion.com/v1/databases/{database_id}/query"
    keys, cursor = set(), None
    while True:
        payload = {"page_size": 100}
        if cursor:
            payload["start_cursor"] = cursor
        req = urllib.request.Request(
            url, data=json.dumps(payload).encode(), headers=_notion_headers(token),
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=30) as res:
            data = json.loads(res.read())
        for page in data.get("results", []):
            props = page.get("properties", {})
            link = (props.get("URL") or {}).get("url")
            title = "".join(t.get("plain_text", "")
                            for t in (props.get("案件名") or {}).get("title", []))
            org = "".join(t.get("plain_text", "")
                          for t in (props.get("主催自治体") or {}).get("rich_text", []))
            keys.add(link or f"{title}|{org}")
        if not data.get("has_more"):
            break
        cursor = data.get("next_cursor")
    return keys


def insert_case(token: str, database_id: str, case: dict, today: str) -> None:
    props = {
        "案件名": {"title": [{"text": {"content": case["name"][:200]}}]},
        "主催自治体": {"rich_text": [{"text": {"content": case["org"][:200]}}]},
        "領域": {"select": {"name": case["domain"]}},
        "区分": {"select": {"name": _scope(case["org"])}},
        "種別": {"select": {"name": _type(case["name"])}},
        "ステータス": {"status": {"name": "未着手"}},
        "マッチ語": {"multi_select": [{"name": t} for t in _match_tags(case)]},
        "収集日": {"date": {"start": today}},
    }
    if case["url"]:
        props["URL"] = {"url": case["url"]}
    if case["due"][:10].count("-") == 2:
        props["期日"] = {"date": {"start": case["due"][:10]}}
    payload = {"parent": {"database_id": database_id}, "properties": props}
    req = urllib.request.Request(
        "https://api.notion.com/v1/pages", data=json.dumps(payload).encode(),
        headers=_notion_headers(token), method="POST",
    )
    urllib.request.urlopen(req, timeout=30).read()


def main() -> None:
    window = int(os.environ.get("COLLECT_WINDOW_DAYS", "14"))
    dry_run = os.environ.get("DRY_RUN") == "1"
    print(f"官公需APIから直近{window}日の AI/SNS 案件を収集します（dry_run={dry_run}）…")
    found = collect(window)
    print(f"収集 {len(found)} 件（重複排除後）。")
    if dry_run:
        for c in found.values():
            print(f"  - [{c['domain']}] {c['name']} / {c['org']} / {c['url']}")
        return

    token = os.environ.get("NOTION_TOKEN")
    database_id = os.environ.get("NOTION_DATABASE_ID")
    if not (token and database_id):
        sys.exit("NOTION_TOKEN / NOTION_DATABASE_ID が未設定です。")
    known = existing_keys(token, database_id)
    today = datetime.now(JST).date().isoformat()
    added = 0
    for key, case in found.items():
        if key in known:
            continue
        insert_case(token, database_id, case, today)
        added += 1
        print(f"  + 追記: {case['name']}")
    print(f"Notion に新規 {added} 件を追記しました（既存 {len(known)} 件）。")


if __name__ == "__main__":
    main()
