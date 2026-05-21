"""顧客名の正規化ロジック。

Notion の `顧客名（正規化）` formula と同じ突合キーを Python 側で再現する。
ロジックを変えるときは Notion 側 formula と同期させること。

2種類の正規化を提供:
  - normalize_company_name(strict): 法人格・記号・空白を除去した「突合キー」。
    DB のフィールド `顧客名（正規化）` と一致させる前提。
  - normalize_company_name_loose: さらに長音/ハイフン/英記号・地域名等の
    サフィックスを丸めた「ファジー比較用キー」。重複候補の発見に使う。
"""
from __future__ import annotations

import re
import unicodedata

_LEGAL_FORMS = (
    "株式会社", "有限会社", "合同会社", "合資会社", "合名会社", "一般社団法人",
    "一般財団法人", "公益社団法人", "公益財団法人", "医療法人", "社会福祉法人",
    "学校法人", "宗教法人", "特定非営利活動法人", "NPO法人",
)
_PAREN_FORMS = ("(株)", "（株）", "㈱", "(有)", "（有）", "㈲", "(同)", "（同）",
                "(医)", "（医）")
_SUFFIX_EN = re.compile(
    r"\b(co\.?,?\s*ltd\.?|corp\.?|corporation|inc\.?|llc|k\.?k\.?|gmbh|s\.?a\.?)\b",
    re.IGNORECASE,
)
_NON_ALNUM_JP = re.compile(r"[\s　\.\,\-‐−–—\・/\\(){}\[\]【】「」『』<>＜＞@＠&＆+＋]")

# loose mode 用: 会社名末尾によくある追加サフィックス
_LOOSE_SUFFIXES = (
    "ホールディングス", "ホールデイングス", "グループ", "ジャパン", "japan",
    "コーポレーション", "カンパニー",
    "工業所", "工業", "産業", "商事", "商会", "商店", "建設", "建築", "土木",
    "電気", "電工", "電設", "設備", "サービス",
)


def normalize_company_name(name: str) -> str:
    """突合キー用の厳格正規化。法人格と記号を除去するが、業種語は残す。"""
    if not name:
        return ""
    s = unicodedata.normalize("NFKC", name).strip().lower()
    for form in _LEGAL_FORMS + _PAREN_FORMS:
        s = s.replace(form.lower(), "")
    s = _SUFFIX_EN.sub("", s)
    s = _NON_ALNUM_JP.sub("", s)
    return s


def normalize_company_name_loose(name: str) -> str:
    """ファジー比較用の緩い正規化。業種語サフィックスも除去する。

    例: 「株式会社ABC建設工業」 → 「abc」
    重複候補発見専用で、確定マッチには使わない（false positive を許容）。
    """
    s = normalize_company_name(name)
    if not s:
        return ""
    # 業種サフィックスを末尾から繰り返し剥がす
    changed = True
    while changed:
        changed = False
        for suf in _LOOSE_SUFFIXES:
            if s.endswith(suf):
                s = s[: -len(suf)]
                changed = True
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


def normalize_corp_no(value: str | None) -> str:
    """法人番号は全角→半角 + 数字以外を除去。13桁ある場合のみ採用。"""
    if not value:
        return ""
    digits = re.sub(r"\D", "", unicodedata.normalize("NFKC", value))
    return digits if len(digits) == 13 else ""
