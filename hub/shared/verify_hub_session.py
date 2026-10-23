"""
let_hub Cookie の検証（Python 3.8+・標準ライブラリのみ）。
Node 以外のシステム（Flask / FastAPI / Django / GAS からの移行先など）にこのファイルをコピーして使う。

    from verify_hub_session import verify_hub_session, parse_cookie, has_role
    token = parse_cookie(request.headers.get("Cookie")).get("let_hub")
    hub = verify_hub_session(token, os.environ["HUB_SESSION_SECRET"])
    if hub and hub_allows(hub, "<dashboards.json の key>", "manager"):
        ...  # hub["email"] / hub["name"] / hub["role"]（"exec" | "manager" | "staff"）

ペイロードは hub/lib/hub-session.ts と同一形式: base64url(JSON).base64url(HMAC-SHA256)
apps: メンバー管理で「ログインできるサイト」を個別に選んだメンバーだけに入る（key の配列）。無ければ役割で判定。
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from typing import Dict, Optional
from urllib.parse import unquote

HUB_COOKIE = "let_hub"
ROLES = ("staff", "manager", "exec")
_RANK = {"staff": 0, "manager": 1, "exec": 2}


def _b64url_decode(s: str) -> bytes:
    s = s.replace("-", "+").replace("_", "/")
    return base64.b64decode(s + "=" * (-len(s) % 4))


def verify_hub_session(token: Optional[str], secret: Optional[str], now: Optional[int] = None) -> Optional[dict]:
    """署名と期限を検証して payload（dict）を返す。無効なら None。"""
    if not token or not secret:
        return None
    parts = str(token).split(".")
    if len(parts) != 2 or not parts[0] or not parts[1]:
        return None
    try:
        expected = hmac.new(secret.encode("utf-8"), parts[0].encode("ascii"), hashlib.sha256).digest()
        actual = _b64url_decode(parts[1])
        if not hmac.compare_digest(expected, actual):
            return None
        s = json.loads(_b64url_decode(parts[0]).decode("utf-8"))
    except Exception:
        return None
    if not isinstance(s, dict) or s.get("v") != 1:
        return None
    if not isinstance(s.get("email"), str) or not isinstance(s.get("exp"), (int, float)) or s.get("role") not in ROLES:
        return None
    apps = s.get("apps")
    if apps is not None and (not isinstance(apps, list) or not all(isinstance(a, str) for a in apps)):
        return None
    if s["exp"] <= (now if now is not None else int(time.time())):
        return None
    return s


def hub_allows(session: dict, key: str, min_role: str = "staff") -> bool:
    """このメンバーが key のサイトにログインできるか（apps があればその一覧、無ければ役割が min_role 以上）"""
    apps = session.get("apps")
    if isinstance(apps, list):
        return key in apps
    return has_role(session.get("role", ""), min_role)


def has_role(role: str, min_role: str) -> bool:
    """role が min_role 以上か（exec > manager > staff）"""
    return role in _RANK and min_role in _RANK and _RANK[role] >= _RANK[min_role]


def parse_cookie(header: Optional[str]) -> Dict[str, str]:
    """Cookie ヘッダ文字列 → {name: value}"""
    out: Dict[str, str] = {}
    if not header:
        return out
    for part in str(header).split(";"):
        if "=" not in part:
            continue
        k, v = part.split("=", 1)
        k = k.strip()
        if k:
            out[k] = unquote(v.strip())
    return out
