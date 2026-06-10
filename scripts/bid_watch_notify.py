#!/usr/bin/env python3
"""入札ウォッチ — Notion DB を読み、AI/SNS 入札案件の全件サマリを Slack へ通知する。

毎週月曜 8:00(JST) に GitHub Actions から実行される想定。
Notion を「正本」とし、その内容を Slack に流す。新規案件の収集（スクレイピング）は
別途エージェント/手動で Notion に追記する運用（将来 scraper を追加可能）。

必要な環境変数:
  NOTION_TOKEN        — Notion インテグレーションのトークン
  NOTION_DATABASE_ID  — 入札案件ウォッチDB の database id
  SLACK_WEBHOOK_URL   — 通知先チャンネルに紐づく Incoming Webhook URL
"""
import json
import os
import sys
import urllib.request
from datetime import date, datetime, timezone, timedelta

NOTION_VERSION = "2022-06-28"
JST = timezone(timedelta(hours=9))


def _require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        sys.exit(f"環境変数 {name} が未設定です。")
    return value


def _post(url: str, payload: dict, headers: dict) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=30) as res:
        body = res.read().decode("utf-8")
    return json.loads(body) if body else {}


def fetch_cases(token: str, database_id: str) -> list[dict]:
    """Notion DB を全ページ取得して案件 dict のリストを返す。"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    }
    url = f"https://api.notion.com/v1/databases/{database_id}/query"
    cases: list[dict] = []
    cursor = None
    while True:
        payload = {"page_size": 100}
        if cursor:
            payload["start_cursor"] = cursor
        result = _post(url, payload, headers)
        for page in result.get("results", []):
            cases.append(_parse_page(page.get("properties", {})))
        if not result.get("has_more"):
            break
        cursor = result.get("next_cursor")
    return cases


def _plain(prop: dict, kind: str) -> str:
    if not prop:
        return ""
    if kind == "title":
        return "".join(t.get("plain_text", "") for t in prop.get("title", []))
    if kind == "rich_text":
        return "".join(t.get("plain_text", "") for t in prop.get("rich_text", []))
    if kind == "select":
        return (prop.get("select") or {}).get("name", "")
    if kind == "status":
        return (prop.get("status") or {}).get("name", "")
    if kind == "url":
        return prop.get("url") or ""
    if kind == "number":
        return prop.get("number")
    if kind == "date":
        return (prop.get("date") or {}).get("start", "")
    return ""


def _parse_page(props: dict) -> dict:
    return {
        "name": _plain(props.get("案件名"), "title"),
        "org": _plain(props.get("主催自治体"), "rich_text"),
        "domain": _plain(props.get("領域"), "select"),
        "scope": _plain(props.get("区分"), "select"),
        "type": _plain(props.get("種別"), "select"),
        "due": _plain(props.get("期日"), "date"),
        "budget": _plain(props.get("予算"), "number"),
        "status": _plain(props.get("ステータス"), "status"),
        "url": _plain(props.get("URL"), "url"),
    }


def _yen(value) -> str:
    return f"¥{int(value):,}" if value else "—"


def _line(case: dict) -> str:
    bits = [f"<{case['url']}|{case['name']}>" if case["url"] else case["name"]]
    meta = [case["org"], case["type"]]
    if case["due"]:
        meta.append(f"期日 {case['due']}")
    if case["budget"]:
        meta.append(_yen(case["budget"]))
    if case["status"] == "完了":
        meta.append("参考")
    return "• " + " ｜ ".join([bits[0]] + [m for m in meta if m])


def build_message(cases: list[dict]) -> str:
    today = datetime.now(JST).date()
    active = [c for c in cases if c["status"] != "完了"]
    ref = [c for c in cases if c["status"] == "完了"]
    ai = [c for c in cases if c["domain"].startswith("AI")]
    sns = [c for c in cases if c["domain"].startswith("SNS")]
    soon = [c for c in active if _is_soon(c["due"], today)]

    lines = [
        f"*【入札ウォッチ】AI/SNS 全{len(cases)}件（{today.isoformat()}）*",
        f"受付中候補 {len(active)}件 / 参考 {len(ref)}件"
        + (f" / ⏰締切間近 {len(soon)}件" if soon else ""),
    ]
    if soon:
        lines.append("\n⏰ *締切間近（14日以内）*")
        lines += [_line(c) for c in soon]
    lines.append("\n🤖 *AI / 生成AI 系*")
    lines += [_line(c) for c in ai]
    lines.append("\n📱 *SNS / デジタルマーケティング 系*")
    lines += [_line(c) for c in sns]
    lines.append("\n_Notion DB が正本です。応札前に各リンク先で最新の締切・要件を確認してください。_")
    return "\n".join(lines)


def _is_soon(due: str, today: date) -> bool:
    if not due:
        return False
    try:
        due_date = datetime.fromisoformat(due[:10]).date()
    except ValueError:
        return False
    return today <= due_date <= today + timedelta(days=14)


def main() -> None:
    token = _require_env("NOTION_TOKEN")
    database_id = _require_env("NOTION_DATABASE_ID")
    webhook = _require_env("SLACK_WEBHOOK_URL")
    cases = fetch_cases(token, database_id)
    if not cases:
        print("案件が0件のため通知をスキップしました。")
        return
    message = build_message(cases)
    _post(webhook, {"text": message}, {"Content-Type": "application/json"})
    print(f"Slack 通知を送信しました（{len(cases)}件）。")


if __name__ == "__main__":
    main()
