"""顧客名の正規化ロジック。

Notion の `顧客名（正規化）` formula と同じ突合キーを Python 側で再現する。
ロジックを変えるときは Notion 側 formula と同期させること。
"""
from __future__ import annotations

import re
import unicodedata

_LEGAL_FORMS = (
    "株式会社", "有限会社", "合同会社", "合資会社", "合名会社", "一般社団法人",
    "一般財団法人", "公益社団法人", "公益財団法人", "医療法人", "社会福祉法人",
    "学校法人", "宗教法人", "特定非営利活動法人", "NPO法人",
)
_PAREN_FORMS = ("(株)", "（株）", "㈱", "(有)", "（有）", "㈲", "(同)", "（同）")
_SUFFIX_EN = re.compile(
    r"\b(co\.?,?\s*ltd\.?|corp\.?|corporation|inc\.?|llc|k\.?k\.?)\b",
    re.IGNORECASE,
)
_NON_ALNUM_JP = re.compile(r"[\s　\.\,\-・・/\\(){}\[\]【】「」『』<>＜＞]")


def normalize_company_name(name: str) -> str:
    if not name:
        return ""
    s = unicodedata.normalize("NFKC", name).strip().lower()
    for form in _LEGAL_FORMS + _PAREN_FORMS:
        s = s.replace(form.lower(), "")
    s = _SUFFIX_EN.sub("", s)
    s = _NON_ALNUM_JP.sub("", s)
    return s


def normalize_phone(phone: str | None) -> str:
    if not phone:
        return ""
    return re.sub(r"\D", "", unicodedata.normalize("NFKC", phone))


def normalize_url_host(url: str | None) -> str:
    if not url:
        return ""
    s = unicodedata.normalize("NFKC", url).strip().lower()
    s = re.sub(r"^https?://", "", s)
    s = re.sub(r"^www\.", "", s)
    return s.split("/", 1)[0]
