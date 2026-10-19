# 経営ハブ統合計画 — 全社ダッシュボードの統合入口と共通ログイン

作成: 2026-10-19 ／ 実装: `/hub`（agents リポジトリ）／ 対象外: ゲンバキャリア

## 目的

1. 経営ダッシュボード（ハブ）を起点に、全社のダッシュボードへ役員が再ログインなしで移動できるようにする。
2. 情報の分散を防ぐ。入口を一つにし、将来はハブ上に各アプリの KPI サマリーを集約する。
3. 既存の ID / パスワードは当面流用し、段階的に共通ログインへ移行する。

## 現状（2026-10-19 棚卸し）

| ダッシュボード | リポジトリ | 現在のホスト | 認証 | 役割 |
|---|---|---|---|---|
| 財務・予実・CF・BEP・試算表・月次決算 | slack_let | slack-let.vercel.app | 共有秘密 1 本（CRON_SECRET）を Cookie 保存 | なし |
| 営業コックピット | agents/sales-cockpit | salescockpit-let.vercel.app | 独自 ID/PW（Notion ユーザーDB、scrypt） | なし |
| 人材紹介 KPI | jinjiLsystem/web | jinji-l-system.vercel.app | Google + ID/PW（共用アカウント含む） | admin / ca / ra |
| 案件 KPI（Recruit Ops）・商談 | masterAI | masterai-marketing.vercel.app | Google（/kpi は実質無認証） | admin / employee / guest |
| 評価制度サイト let-hyoka | agents/outputs/evaluation_criteria | let-hyoka.vercel.app | ブラウザ側パスワード判定 | ページ別 PW |
| Internal Console | agents/console | GitHub Pages | ブラウザ側パスフレーズ | visibility.json |

全てが別ホストのため Cookie を共有できず、相互リンクも無い。これが統合の唯一の技術的な壁。

## アーキテクチャ

```
                 hub.let-inc.net（/hub）
                 Google ログイン → let_hub Cookie（Domain=.let-inc.net）
                           │
   ┌───────────┬───────────┼───────────┬───────────┐
finance.      sales.      jinji.      kpi.        hyoka.
let-inc.net   let-inc.net let-inc.net let-inc.net let-inc.net
(slack_let)   (sales-     (jinji      (masterAI   (let-hyoka)
              cockpit)    Lsystem)    /kpi)
   各アプリの middleware が let_hub を検証 → 通す。無ければ従来ログインへ
```

- **ドメイン**: Vercel に登録済みの `let-inc.net` を親ドメインとし、各プロジェクトにサブドメインを付与する（コード変更なし。付与はダッシュボード操作）。
- **共通セッション**: ハブが `let_hub` Cookie（HMAC-SHA256 署名、`{email, name, role, iat, exp}`、既定 7 日、HttpOnly / Secure / SameSite=Lax）を親ドメインに発行。秘密鍵 `HUB_SESSION_SECRET` を全アプリで共有する。`CRON_SECRET` とは分離する。
- **役割**: `exec`（役員）/ `manager`（管理職）/ `staff`（一般）。`hub/config/members.json` で管理。`HUB_ALLOWED_DOMAIN` で同ドメインの Google アカウントを `staff` として段階開放できる。
- **各アプリ側の改修**: 検証コード（`hub/shared/`）をコピーし、既存認証の前段に数行追加するだけ。既存 ID/PW はフォールバックとして残す。
- **同一ホスト化（パスだけで切替）は第 2 段階**: リバースプロキシ / Vercel Microfrontends で可能だが、各アプリの basePath 対応が必要（特に slack_let は `/api/...` 固定リンク）。まずサブドメイン方式で統合し、必要な画面だけ後から取り込む。

## フェーズ

| # | 内容 | 変更対象 | 状態 |
|---|---|---|---|
| 0 | ハブ実装（ログイン・役割・遷移一覧・共通 Cookie・検証コード） | agents/hub | **完了（本ブランチ）** |
| 1 | Vercel プロジェクト `let-hub` 作成（Root Directory `hub`）、env 設定、`hub.let-inc.net` 付与。Google OAuth クライアント作成 | Vercel / GCP | 要オーナー操作 |
| 2 | 各プロジェクトにサブドメイン付与（finance / sales / jinji / kpi / hyoka） | Vercel | 要オーナー操作 |
| 3 | slack_let が `let_hub` を受け入れる（役員のみ）。あわせて `CRON_SECRET` が URL クエリに載る現状を解消 | slack_let `lib/auth.js` | 未着手 |
| 4 | sales-cockpit / jinjiLsystem が受け入れる。既存ユーザーはメールで紐付け | 各 middleware | 未着手 |
| 5 | masterAI `/kpi` と let-hyoka が受け入れる。/kpi の無認証状態と、let-hyoka の README 平文パスワードをこの時点で解消 | masterAI / evaluation_criteria | 未着手 |
| 6 | ハブに KPI サマリー集約（各アプリの API をサーバー間トークンで取得） | hub + 各アプリ | 未着手 |

Internal Console はリンク連携のみ（GitHub Pages のため共通 Cookie 不可）。

## オーナーに確認・依頼が必要な事項

1. 親ドメインとして `let-inc.net` を使ってよいか（他の用途と衝突しないか）。
2. 役員として最初に登録するメールアドレス一覧（`hub/config/members.json`）。Google Workspace のドメインがあれば `HUB_ALLOWED_DOMAIN` にも設定する。
3. Google Cloud Console で OAuth クライアントを発行（リダイレクト URI: `https://hub.let-inc.net/api/auth/callback/google`）。

## セキュリティ上の原則

- `HUB_SESSION_SECRET` は `openssl rand -base64 32` で生成し、Vercel の環境変数にのみ置く。リポジトリには書かない。
- 役員専用ダッシュボード（財務・評価）は `role === "exec"` のみ通す。各アプリ側でも役割を確認する（ハブの表示制御だけに依存しない）。
- 既存の秘密（`CRON_SECRET` 等）は共通ログイン導入後に順次ローテーションする。
