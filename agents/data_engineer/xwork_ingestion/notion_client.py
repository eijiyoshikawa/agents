"""Notion REST API クライアント（DB_顧客管理 専用の薄いラッパー）。

公式 SDK は使わず requests のみ。Notion-Version は固定。
"""
from __future__ import annotations

import os
import time
from typing import Any, Iterable

import requests

NOTION_VERSION = "2022-06-28"
DEFAULT_DB_ID = "1ac3fae4-3499-4991-b465-e375bef7d66c"
BASE = "https://api.notion.com/v1"


class NotionClient:
    def __init__(self, token: str | None = None, db_id: str | None = None):
        self.token = token or os.environ["NOTION_TOKEN"]
        self.db_id = db_id or os.environ.get("NOTION_DB_ID", DEFAULT_DB_ID)
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {self.token}",
            "Notion-Version": NOTION_VERSION,
            "Content-Type": "application/json",
        })

    def _request(self, method: str, path: str, **kw) -> dict:
        for attempt in range(5):
            r = self.session.request(method, f"{BASE}{path}", timeout=30, **kw)
            if r.status_code == 429:
                time.sleep(float(r.headers.get("Retry-After", "1")))
                continue
            r.raise_for_status()
            return r.json()
        raise RuntimeError(f"Notion API exhausted retries: {method} {path}")

    def iter_pages(self) -> Iterable[dict]:
        cursor: str | None = None
        while True:
            body: dict[str, Any] = {"page_size": 100}
            if cursor:
                body["start_cursor"] = cursor
            data = self._request("POST", f"/databases/{self.db_id}/query", json=body)
            for page in data["results"]:
                yield page
            if not data.get("has_more"):
                return
            cursor = data["next_cursor"]

    def update_media(self, page_id: str, media_names: list[str]) -> None:
        self._request("PATCH", f"/pages/{page_id}", json={
            "properties": {
                "掲載元メディア": {
                    "multi_select": [{"name": n} for n in media_names],
                },
            },
        })

    def create_customer(self, props: dict[str, Any]) -> dict:
        return self._request("POST", "/pages", json={
            "parent": {"database_id": self.db_id},
            "properties": props,
        })


def title_of(page: dict) -> str:
    cells = page.get("properties", {}).get("顧客名", {}).get("title", [])
    return "".join(c.get("plain_text", "") for c in cells).strip()


def media_of(page: dict) -> list[str]:
    items = page.get("properties", {}).get("掲載元メディア", {}).get("multi_select", [])
    return [i["name"] for i in items]


def text_prop(page: dict, key: str) -> str:
    p = page.get("properties", {}).get(key, {})
    if "rich_text" in p:
        return "".join(c.get("plain_text", "") for c in p["rich_text"]).strip()
    if "phone_number" in p:
        return p.get("phone_number") or ""
    if "url" in p:
        return p.get("url") or ""
    return ""
