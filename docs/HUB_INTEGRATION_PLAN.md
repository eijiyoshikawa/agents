# 経営ハブ統合計画 — 全社ダッシュボードの統合入口と共通ログイン

作成: 2026-10-19 ／ 更新: 2026-10-19 ／ 実装: `/hub`（agents リポジトリ）／ 本番: https://hub.let-inc.net ／ 対象外: ゲンバキャリア

## 目的

1. 経営ハブを起点に、全社のダッシュボードへ役員が再ログインなしで移動できるようにする。
2. 情報の分散を防ぐ。入口を一つにし、将来はハブ上に各アプリの KPI サマリーを集約する。
3. 既存の ID / パスワードは当面流用し、段階的に共通ログインへ移行する。既存アプリの挙動は変えない（追加のみ）。

## 決定事項

- 認証は **メールアドレス + パスワード**（Google OAuth クライアントは発行しない。後から任意で追加可能）。
- 役員（`exec`）は次の 3 アカウントのみ: `shota.yoshida@let-inc.net` / `eiyoshi99@gmail.com` / `eiji.yoshikawa@let-inc.net`。
- 親ドメインは `let-inc.net`（Vercel チーム eijiyoshikawas-projects に登録済み。DNS は Xserver）。
- ハブは Vercel プロジェクト `let-hub`（Root Directory `hub`）。既存プロジェクトの設定は変更しない。

## 現状（2026-10-19 棚卸し）

| ダッシュボード | リポジトリ | 現在のホスト | 認証 | 役割 |
|---|---|---|---|---|
| 財務・予実・CF・BEP・試算表・月次決算 | slack_let | slack-let.vercel.app | 共有秘密 1 本（CRON_SECRET）を Cookie 保存 | なし |
| 営業コックピット | agents/sales-cockpit | salescockpit-let.vercel.app | 独自 ID/PW（Notion ユーザーDB、scrypt） | なし |
| 人材紹介 KPI | jinjiLsystem/web | jinji-l-system.vercel.app | Google + ID/PW（共用アカウント含む） | admin / ca / ra |
| 案件 KPI（Recruit Ops）・商談 | masterAI | masterai-marketing.vercel.app | Google（/kpi は実質無認証） | admin / employee / guest |
| 評価制度サイト let-hyoka | agents/outputs/evaluation_criteria | let-hyoka.vercel.app | ブラウザ側パスワード判定 | ページ別 PW |
| Internal Console | agents/console | GitHub Pages | ブラウザ側パスフレーズ | visibility.json |

`let-inc.net` 配下の既存サブドメイン（変更しない）: `www`（コーポレート）/ `lsystem`（受発注）/ `analiticspro` / `recruit-se01` / `recruit-se02`。
全ダッシュボードが別ホストのため Cookie を共有できず、相互リンクも無い。これが統合の唯一の技術的な壁。

## アーキテクチャ

```
                 hub.let-inc.net（/hub）
                 メール+PW ログイン → let_hub Cookie（Domain=.let-inc.net）
                           │
   ┌───────────┬───────────┼───────────┬───────────┐
finance.      sales.      jinji.      kpi.        hyoka.
let-inc.net   let-inc.net let-inc.net let-inc.net let-inc.net
(slack_let)   (sales-     (jinji      (masterAI   (let-hyoka)
              cockpit)    Lsystem)    /kpi)
   各アプリの middleware が let_hub を検証 → 通す。無ければ従来ログインへ（既存挙動は維持）
```

- **共通セッション**: ハブが `let_hub` Cookie（HMAC-SHA256 署名、`{email, name, role, iat, exp}`、既定 7 日、HttpOnly / Secure / SameSite=Lax）を親ドメインに発行。秘密鍵 `HUB_SESSION_SECRET` を全アプリで共有。`CRON_SECRET` とは分離する。
- **役割**: `exec` / `manager` / `staff`。`hub/config/members.json` で管理。パスワードのハッシュは env `HUB_PASSWORD_HASHES`。
- **各アプリ側の改修**: 検証コード（`hub/shared/`）をコピーし、既存認証の前段に数行追加するだけ。既存 ID/PW はフォールバックとして残す。
- **同一ホスト化（パスだけで切替）は第 2 段階**: 各アプリの basePath 対応が必要（特に slack_let は `/api/...` 固定リンク）。まずサブドメイン方式で統合する。

## 作業一覧（分類別）

### A. ハブ本体（agents リポジトリ `hub/`）— 実装済み
- [x] ログイン（メール + パスワード、失敗 10 回 / 15 分でブロック）
- [x] 役員 3 名の登録（`config/members.json`）
- [x] 共通 Cookie `let_hub` の発行・延長（middleware）
- [x] ダッシュボード一覧（役割で絞り込み、URL は env で切替）
- [x] 各アプリ向け検証コード（Node / Edge）とテスト
- [ ] パスワード変更画面（現状は env の差し替えで対応）
- [ ] KPI サマリー集約（フェーズ 6）

### B. Vercel（プロジェクト `let-hub`）
- [ ] プロジェクト作成（repo `eijiyoshikawa/agents`、Root Directory `hub`、Framework Next.js）
- [ ] 環境変数: `AUTH_SECRET` / `HUB_SESSION_SECRET` / `HUB_PASSWORD_HASHES` / `HUB_COOKIE_DOMAIN=.let-inc.net`
- [ ] ドメイン `hub.let-inc.net` をプロジェクトに追加
- [ ] 本番デプロイ

### C. DNS（Xserver サーバーパネル）— オーナー作業
- [ ] `hub.let-inc.net` の A レコード（現在 202.254.234.133 = Xserver）を削除し、**CNAME `cname.vercel-dns.com`** を追加（A レコードなら `76.76.21.21`）
- [ ] 反映後、https://hub.let-inc.net がログイン画面を表示することを確認

### D. 各ダッシュボードの共通ログイン対応（1 アプリずつ・既存ログインは残す）
| 順 | アプリ | Vercel 側 | コード側 | 備考 |
|---|---|---|---|---|
| 1 | slack_let（財務） | `finance.let-inc.net` 付与、`HUB_SESSION_SECRET` 追加 | `lib/auth.js` の `isAuthorized` 前段に `let_hub` 検証（役員のみ） | あわせて `CRON_SECRET` の URL クエリ露出を解消 |
| 2 | sales-cockpit（営業） | `sales.let-inc.net` 付与、`HUB_SESSION_SECRET` 追加 | `middleware.ts` 前段に `let_hub` 検証 | 既存ユーザーはメールで紐付け |
| 3 | jinjiLsystem（人材紹介） | `jinji.let-inc.net` 付与、`HUB_SESSION_SECRET` 追加 | `web/src/middleware.ts` 前段に `let_hub` 検証 | 役割は `exec→admin` に写像 |
| 4 | masterAI（案件 KPI） | `kpi.let-inc.net` 付与、`HUB_SESSION_SECRET` 追加 | `/kpi` に middleware を新設して `let_hub` 検証 | 現状の無認証状態を解消 |
| 5 | let-hyoka（評価） | `hyoka.let-inc.net` 付与 | 静的サイトのため Edge Middleware で `let_hub` 検証 | README の平文パスワード記載を削除 |
対応完了ごとに `hub/config/dashboards.json` の `sso` を `ready` に、`HUB_URL_*` を新サブドメインに切り替える。

### E. 運用
- [ ] 役員へ初期パスワードを安全な経路で配布（チャット・メール平文は避ける）
- [ ] `HUB_SESSION_SECRET` の共有は Vercel 環境変数のみ（リポジトリ・ドキュメントに書かない）
- [ ] 共通ログイン導入後、`CRON_SECRET` 等の既存秘密を順次ローテーション
- [ ] メンバー追加・役割変更は `config/members.json` の PR で行う

## セキュリティ上の原則

- `HUB_SESSION_SECRET` / `AUTH_SECRET` は `openssl rand -base64 32` で生成し、Vercel の環境変数にのみ置く。
- 役員専用ダッシュボード（財務・評価）は `role === "exec"` のみ通す。各アプリ側でも役割を確認する（ハブの表示制御だけに依存しない）。
- `let_hub` Cookie は `.let-inc.net` 全体に送られる。値は署名付きで、秘密鍵を持つアプリ以外には意味を持たないが、同ドメインに第三者のサイトを置かないこと。
