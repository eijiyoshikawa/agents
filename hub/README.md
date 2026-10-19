# LET 経営ハブ（let-hub）

全社ダッシュボードの統合入口。ここで一度ログイン（メールアドレス + パスワード）すると、親ドメイン共通の署名付き Cookie（`let_hub`）が発行され、対応済みの各ダッシュボードへ再ログインなしで移動できる。

- 本番 URL: https://hub.let-inc.net （Vercel プロジェクト `let-hub`、Root Directory `hub`）

- 計画・全体設計: [`/docs/HUB_INTEGRATION_PLAN.md`](../docs/HUB_INTEGRATION_PLAN.md)
- 対象外: ゲンバキャリア（公開サービス・独自ドメインのため統合しない）

## 構成

| ファイル | 役割 |
|---|---|
| `auth.config.ts` / `auth.ts` | Auth.js v5。メール + パスワード（scrypt）。Google ログインは OAuth クライアントを設定した場合のみ有効（任意） |
| `lib/password.ts` / `lib/login-limiter.ts` | パスワード検証（`HUB_PASSWORD_HASHES`）と失敗回数制限（IP 単位 10 回 / 15 分） |
| `scripts/hash-password.mjs` | パスワードからハッシュを生成（`node scripts/hash-password.mjs <email>`） |
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

必須 env: `AUTH_SECRET` / `HUB_SESSION_SECRET` / `HUB_PASSWORD_HASHES` / `HUB_COOKIE_DOMAIN`。
本番で `HUB_SESSION_SECRET` が無い場合は起動時に例外で停止する（`CRON_SECRET` とは別の値にすること）。
Google ログインは任意。`AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` を設定した場合のみボタンが表示される。

## 経営陣以外のログイン（メンバー管理）

入口は同じログイン画面。役員が `/admin/members` でメンバーを追加すると初期パスワードが 1 回だけ表示され、本人は初回ログイン時にパスワード変更を求められる。
メンバーごとに「役割」と「見られる項目（ダッシュボードのキー）」を設定でき、権限のない項目はハブに表示されない。無効化したメンバーはログインできない。

- 保存先: Postgres（`HUB_DATABASE_URL`。masterAI の Ops と同じ Neon を共有してよい）。初期化は `npm run hub:migrate`
- 保存先が無い間は、下記の設定ファイル＋環境変数の役員だけがログインできる
- 共通 Cookie（let_hub）は初回のパスワード変更が終わるまで発行しない

## メンバー・役割・パスワードの管理

1. `config/members.json` にメールと役割を追記する（現在は役員 3 名）。
2. パスワードのハッシュを生成する: `node scripts/hash-password.mjs <email>`（パスワードは対話入力。表示も履歴も残らない）。
3. 出力された `{"<email>":"scrypt$..."}` を、Vercel の環境変数 `HUB_PASSWORD_HASHES`（JSON オブジェクト）に追記して Redeploy する。
   例: `{"a@let-inc.net":"scrypt$16384$...","b@let-inc.net":"scrypt$16384$..."}`
4. パスワード変更も同じ手順（該当メールの値を差し替える）。

`HUB_ALLOWED_DOMAIN` は Google ログイン専用（同ドメインの Google アカウントを `staff` として許可）。パスワード認証は登録メンバーのみ。

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
