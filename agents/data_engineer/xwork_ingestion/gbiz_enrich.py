"""gBizINFO API による法人情報の補完。

経産省が提供する法人情報 API（無料・利用申請必要）。法人番号をキーに、
住所・代表者・資本金・従業員数・URL などを取得できる。電話番号は提供されない。

API トークンは https://info.gbiz.go.jp/api/index.html から申請して取得し、
環境変数 GBIZ_API_TOKEN にセットする。

使い方:
    from gbiz_enrich import enrich, GBizClient
    client = GBizClient(os.environ["GBIZ_API_TOKEN"])
    extra = client.fetch(corporate_number)  # → dict
"""
from __future__ import annotations

import os
import time
from typing import Any

import requests

BASE = "https://info.gbiz.go.jp/hojin/v1/hojin"
HEADER_NAME = "X-hojinInfo-api-token"


class GBizClient:
    def __init__(self, token: str | None = None):
        self.token = token or os.environ.get("GBIZ_API_TOKEN", "")
        self.session = requests.Session()
        if self.token:
            self.session.headers[HEADER_NAME] = self.token
        self.session.headers["Accept"] = "application/json"

    def fetch(self, corporate_number: str) -> dict[str, Any] | None:
        if not self.token:
            return None
        if not corporate_number or len(corporate_number) != 13:
            return None
        for attempt in range(3):
            r = self.session.get(f"{BASE}/{corporate_number}", timeout=20)
            if r.status_code == 404:
                return None
            if r.status_code == 429:
                time.sleep(2 ** attempt)
                continue
            r.raise_for_status()
            data = r.json()
            return _first_hojin(data)
        return None


def _first_hojin(data: dict) -> dict[str, Any] | None:
    infos = data.get("hojin-infos") or []
    return infos[0] if infos else None


def enrich(record: dict, client: GBizClient) -> dict:
    """x-work レコードに gBizINFO の項目を上書き的にマージする。

    優先順位:
      - 会社URL / 電話番号: gBizINFO のみが情報源（x-work では取れない）
      - 代表者名 / 住所 / 資本金 / 従業員数: x-work 既存値があれば尊重
    """
    corp_no = record.get("hello_work_company_id", "")
    info = client.fetch(corp_no)
    if not info:
        record["gbiz_status"] = "not_found"
        return record
    record["gbiz_status"] = "ok"
    record["company_url"] = record.get("company_url") or (info.get("company_url") or "")
    record["representative"] = (record.get("representative")
                                or info.get("representative_name") or "")
    if not record.get("address"):
        record["address"] = info.get("location") or ""
    if not record.get("capital"):
        cap = info.get("capital_stock")
        if cap:
            record["capital"] = f"{int(cap):,}円" if str(cap).isdigit() else str(cap)
    if not record.get("employee_count_total"):
        record["employee_count_total"] = info.get("employee_number")
    record["business_summary_gbiz"] = info.get("business_summary") or ""
    return record
