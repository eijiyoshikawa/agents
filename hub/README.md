# LET 経営ハブ（let-hub）

全社ダッシュボードの統合入口。ここで一度 Google ログインすると、親ドメイン共通の署名付き Cookie（`let_hub`）が発行され、対応済みの各ダッシュボードへ再ログインなしで移動できる。

- 計画・全体設計: [`/docs/HUB_INTEGRATION_PLAN.md`](../docs/HUB_INTEGRATION_PLAN.md)
- 対象外: ゲンバキャリア（公開サービス・独自ドメインのため統合しない）

## 構成

| ファイル | 役割 |
|---|---|
| `auth.config.ts` / `auth.ts` | Auth.js v5。Google ログイン。`config/members.json` と `HUB_ALLOWED_DOMAIN` で許可判定 |
| `middleware.ts` | 未ログインを `/login` へ。ログイン済みなら `let_hub` Cookie を発行・延長 |
| `lib/hub-session.ts` | `let_hub` の署名・検証（HMAC-SHA256、Web Crypto） |
| `lib/members.ts` / `lib/roles.ts` | メンバー解決と役割（`exec` > `manager` > `staff`） |
| `lib/dashboards.ts` / `config/dashboards.json` | 遷移先一覧。URL は env 優先、役割で表示を絞る |
| `shared/verify-hub-session.js` | 各アプリへコピーする検証コード（Node / CommonJS、依存なし） |
| `shared/verify-hub-session.edge.ts` | 各アプリへコピーする検証コード（Next.js middleware / Edge） |
| `app/api/me` | 自分のセッションと閲覧可能ダッシュボード（疎通確認用） |

## セットアップ

```bash
cd hub
npm install
cp .env.example .env.local   # 値を埋める
npm run dev                  # http://localhost:4200
```

必須 env: `AUTH_SECRET` / `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` / `HUB_SESSION_SECRET`。
本番で `HUB_SESSION_SECRET` が無い場合は起動時に例外で停止する（`CRON_SECRET` とは別の値にすること）。

Google Cloud Console の OAuth クライアントに、リダイレクト URI `https://<hub host>/api/auth/callback/google` を登録する。

## メンバー・役割の追加

`config/members.json` にメールと役割を追記してデプロイする。
`HUB_ALLOWED_DOMAIN=let-inc.net` のように設定すると、一覧に無い同ドメインの Google アカウントは `staff` としてログインできる（段階的な開放用）。

## 検証

```bash
npm run typecheck && npm test && npm run build
```

## 各ダッシュボードを共通ログインに対応させる手順

1. 対象アプリの Vercel 環境変数に、ハブと同じ `HUB_SESSION_SECRET` を追加する。
2. 対象アプリを親ドメインのサブドメインに載せる（例: `finance.let-inc.net`）。Cookie は `HUB_COOKIE_DOMAIN=.let-inc.net` で共有される。
3. `shared/verify-hub-session.js`（Node）または `shared/verify-hub-session.edge.ts`（Next.js middleware）をコピーし、既存の認証チェックの前段に挟む。
4. `config/dashboards.json` の該当エントリの `sso` を `ready` にする。

### 例: slack_let（`lib/auth.js` の `isAuthorized`）

```js
const { verifyHubSession, parseCookie } = require("./verify-hub-session");

function isAuthorized(req) {
  const hub = verifyHubSession(parseCookie(req.headers.cookie).let_hub, process.env.HUB_SESSION_SECRET);
  if (hub && hub.role === "exec") return true;        // 役員はハブ経由で通す
  return extractToken(req) === process.env.CRON_SECRET; // 従来方式はそのまま残す
}
```

### 例: Next.js アプリ（sales-cockpit / jinjiLsystem / masterAI の middleware）

```ts
import { verifyHubSession } from "@/lib/verify-hub-session.edge";

const hub = await verifyHubSession(req.cookies.get("let_hub")?.value, process.env.HUB_SESSION_SECRET);
if (hub) return NextResponse.next(); // 以降は既存のログイン判定へフォールバック
```

既存の ID / パスワードはフォールバックとして残すため、移行中もメンバーは従来どおりログインできる。
