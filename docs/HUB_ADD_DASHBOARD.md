# 経営ハブに新しい社内システムを連携する手順

新しい社内システムをハブ（`hub.let-inc.net`）の入口に加え、共通ログイン（`let_hub` Cookie）で再ログインなしに入れるようにする手順。所要は「リンクだけ」なら 10 分、「共通ログイン対応」までで 1〜2 時間（DNS 反映待ちを除く）。

## 0. 最初に決めること（連携の依頼時にこの 8 項目を伝える）

| # | 項目 | 例 |
|---|---|---|
| 1 | システム名と一言の説明（ハブのカードに出す） | 「勤怠・工数管理」「案件の工数と稼働率」 |
| 2 | 今の置き場所 | GitHub リポジトリ名／Vercel・Render・GAS・社外 SaaS など |
| 3 | 技術 | Next.js／Node（Express 等）／Python（Flask・FastAPI・Django）／静的 HTML／社外 SaaS |
| 4 | 今のログイン方法 | なし／共通パスワード／Google／SaaS 独自 |
| 5 | 使う人と役割 | 役員だけ（exec）／管理職以上（manager）／全員（staff） |
| 6 | 希望のサブドメイン | `kintai.let-inc.net` など（`*.let-inc.net` でないと Cookie が共有されない） |
| 7 | 扱うデータの機密度 | 個人情報・給与・財務を含むか |
| 8 | 連携の深さ | A: リンクだけ ／ B: 共通ログインで入れる ／ C: 役割で画面内の権限も変える |

## 1. 連携の 3 段階

| 段階 | できること | 作業 |
|---|---|---|
| **A. リンクだけ** | ハブのカードから開ける。ログインは今までどおり | `config/dashboards.json` に 1 件追加（`sso: "link-only"`） |
| **B. 共通ログイン** | ハブでログイン済みなら再ログインなし | A ＋ サブドメイン化 ＋ `HUB_SESSION_SECRET` ＋ 検証コードを前段に挟む |
| **C. 役割連動** | ハブの役割（exec／manager／staff）で画面内の権限を切る | B ＋ アプリ側で `hub.role` を自分の権限にマッピング |

社外 SaaS（勤怠・会計など自社でコードを持たないもの）は A まで。

## 2. A: ハブにカードを出す（10 分）

1. `agents/hub/config/dashboards.json` の `dashboards` に追加

```json
{
  "key": "kintai",
  "title": "勤怠・工数管理",
  "desc": "日次の勤怠と案件別工数（一言で）",
  "source": "let-incjp/kintai",
  "urlEnv": "HUB_URL_KINTAI",
  "defaultUrl": "https://kintai.let-inc.net/",
  "minRole": "staff",
  "sso": "link-only",
  "group": "社内ツール"
}
```

   - `key`: 英小文字。メンバー管理の「ログインできるサイト」のチェックボックスにこの key で出る。共通 Cookie（let_hub）の `apps` にもこの key が入る
   - `minRole`: 「すべてのサイト」を選んだメンバーに対して、この役割以上に表示。`exec` ＞ `manager` ＞ `staff`（サイトを個別にチェックしたメンバーはチェックが正で、minRole は関係しない）
   - `group`: 「経営・財務」「営業・マーケティング」「人材紹介」「社内ツール」のいずれか（無ければ「その他」）
   - `parent`（任意）: 1 つのサイトの中を段階分けするとき、親サイトの key を書く（例: 評価制度サイトの `hyoka_marketing` → `"parent": "hyoka"`）。メンバー管理では親の下に出て、親にチェックがあれば含まれる。「すべてのサイト」のメンバーには親だけ表示される。サイト側は `hub.apps` に子の key が入っているかで見せる範囲を分ける（例: `outputs/evaluation_criteria/middleware.js` の `accessFor`）
   - `urlEnv`: Vercel `let-hub` の環境変数で URL を上書きしたいとき用（通常は `defaultUrl` のままでよい）
2. `cd hub && npm run typecheck && npm test`（dashboards.json の形式はテストで検証される）
3. main に push → ハブが自動デプロイ → カードが出る

## 3. B: 共通ログインに対応させる

### 3-1. サブドメインに載せる（DNS）

Cookie は `Domain=.let-inc.net` で発行されるので、アプリも `*.let-inc.net` に置く必要がある。

1. Vercel → 対象プロジェクト → Settings → Domains → `xxx.let-inc.net` を Add
2. Xserver の DNS（let-inc.net）に CNAME `xxx` → `cname.vercel-dns.com` を追加（`docs/OWNER_TASKS_2026-10-20.md` 1-A と同じ手順）
3. Vercel の Domains で Valid Configuration になるまで待つ（数分〜数時間）

Vercel 以外（Render・Cloud Run 等）でも CNAME 先がそのサービスになるだけで同じ。

### 3-2. 秘密を共有する

- 対象アプリの環境変数に `HUB_SESSION_SECRET` を追加。値は Vercel `let-hub` の同名変数と**同じもの**（Vercel の環境変数画面では値は見えないので、作り直す場合は 7 プロジェクトすべてを同時に更新する。`docs/OWNER_TASKS_2026-10-20.md` 1-B）
- 値をチャットや Slack に貼らない。Vercel 同士なら「Claude Code のセッションに let-hub から新しいプロジェクトへコピーして」と頼めば値を見ずに設定できる

### 3-3. 検証コードを前段に挟む

`agents/hub/shared/` のファイルをアプリにコピーする（依存なし）。

| アプリの種類 | コピーするファイル | 挟む場所 |
|---|---|---|
| Next.js（App Router） | `verify-hub-session.edge.ts` | `middleware.ts` の最初 |
| Node（Express・Vercel Functions 等） | `verify-hub-session.js` | 既存の認証チェックの前 |
| Python（Flask・FastAPI・Django） | `verify_hub_session.py` | before_request／依存関係（Depends）／ミドルウェア |
| 静的サイト（Vercel） | `verify-hub-session.edge.ts` ＋ `outputs/evaluation_criteria/middleware.js` を参考に Edge Middleware を追加 | ルート直下の `middleware.js` |

Next.js の例:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { verifyHubSession, hasRole } from "./verify-hub-session.edge";

const HUB_URL = process.env.HUB_URL ?? "https://hub.let-inc.net";

export async function middleware(req: NextRequest) {
  const hub = await verifyHubSession(req.cookies.get("let_hub")?.value, process.env.HUB_SESSION_SECRET);
  if (hub && hasRole(hub.role, "staff")) return NextResponse.next();
  const login = new URL("/login", HUB_URL);
  login.searchParams.set("next", req.nextUrl.href);
  return NextResponse.redirect(login);
}
export const config = { matcher: ["/((?!_next/|favicon.ico|api/health).*)"] };
```

Python（FastAPI）の例:

```python
import os
from fastapi import Depends, HTTPException, Request
from verify_hub_session import verify_hub_session, parse_cookie, has_role

def hub_user(request: Request) -> dict:
    hub = verify_hub_session(parse_cookie(request.headers.get("cookie")).get("let_hub"), os.environ.get("HUB_SESSION_SECRET"))
    if not hub or not has_role(hub["role"], "staff"):
        raise HTTPException(status_code=302, headers={"Location": f"https://hub.let-inc.net/login?next={request.url}"})
    return hub
```

既存のログイン（共通パスワード等）がある場合は、しばらく並走させてから消す（人材紹介の `SHARED_LOGIN_*` と同じ流れ）。

### 3-4. ハブ側の表示を更新

`config/dashboards.json` の該当エントリを `"sso": "ready"` に変える。

### 3-5. 動作確認

1. ハブに staff のテストメンバーでログイン → カードから開く → 再ログインなしで入れる
2. シークレットウィンドウで直接 URL を開く → ハブのログインに飛ぶ
3. ハブで「ログインできるサイト」からこのシステムを外したメンバーでは、カードが出ず、URL を直接開いても 403（または各システムのログイン画面）になること

## 4. C: 役割を画面内の権限に使う

**入口の判定は `hubAllows(hub, "<key>", minRole)` を使う**（検証コードに同梱。Node 版は `hubAllows`、Python 版は `hub_allows`）。
ハブのメンバー管理で「ログインできるサイト」を個別にチェックしたメンバーは Cookie に `apps: ["kpi", "jinji", ...]` が入り、`hubAllows` はその一覧だけで判定する。
「すべてのサイト」のメンバーは `apps` が無く、従来どおり役割が minRole 以上なら通す。`hasRole(hub.role, ...)` だけで判定すると、チェックで外したサイトに入れてしまうので使わない。

`hub.role` を自分の権限に写す。既存の例:

- 人材紹介: exec → 管理者・CA・RA、manager → CA・RA。`/settings/users` の登録があればそれを優先
- 運用管理（/ops）: `let_hub` で入れた人のうち `/ops/staff` に登録がある人だけ担当者として扱う
- 財務: exec のみ通す

マッピング表を `docs/`（そのアプリ側）に 1 行で書いておく。

## 5. チェックリスト（連携完了の判定）

- [ ] `dashboards.json` に追加され、テストが通り、ハブにカードが出る
- [ ] `*.let-inc.net` のサブドメインで HTTPS で開ける
- [ ] `HUB_SESSION_SECRET` が let-hub と同じ（ハブ経由で再ログインなしに入れる）
- [ ] 未ログインで直接開くとハブのログインに飛ぶ
- [ ] 「ログインできるサイト」のチェックどおりにカードが絞られ、直接 URL でも `hubAllows` で弾かれる（「すべて」のメンバーは minRole どおり）
- [ ] `docs/HUB_ARCHITECTURE_*.md` の図と一覧表に追記した
- [ ] 旧ログイン（あれば）を消す日を決めた

## 6. Claude Code に頼むときの一言

> 「`<システム名>`（リポジトリ `<owner/repo>`、`<技術>`、URL `<xxx.let-inc.net>`、役割 `<staff|manager|exec>`）を経営ハブに **B（共通ログイン）** で連携して。dashboards.json 追加・検証コード・middleware・ドキュメント更新まで。HUB_SESSION_SECRET のコピーと DNS は私がやる／代行して」
