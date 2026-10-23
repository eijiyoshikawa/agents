# 経営ハブ 構成図（2026-10-22 時点）

経営ハブ（`hub.let-inc.net`）を入口に、共通 Cookie `let_hub` で各ダッシュボードへ再ログインなしで移動する構成。図は Mermaid（GitHub 上でそのまま描画される）。

## 全体図

![経営ハブ 構成図](images/hub-architecture-2026-10-22.png)

同じ図の Mermaid ソース（GitHub 上で描画される）:

```mermaid
flowchart TB
  subgraph users["利用者（役割）"]
    direction LR
    exec["役員 exec"]
    mgr["管理職 manager"]
    staff["運用担当・セールス staff"]
  end

  subgraph hub["経営ハブ hub.let-inc.net ｜ Vercel: let-hub ｜ リポジトリ: agents/hub"]
    login["ログイン画面<br/>メール + パスワード（scrypt）<br/>任意: Google OAuth"]
    auth["Auth.js v5（JWT 30日）<br/>失敗 10回/15分で制限"]
    members[("メンバー<br/>config/members.json（役員3名・固定）<br/>＋ Postgres hub_member（画面で追加・DB が優先）")]
    cookie["let_hub Cookie 発行<br/>HMAC-SHA256 ／ HUB_SESSION_SECRET<br/>Domain=.let-inc.net（初回パスワード変更後）"]
    dash["ダッシュボード一覧<br/>config/dashboards.json<br/>役割（exec＞manager＞staff）と「見られる項目」で絞込"]
    admin["/admin/members（役員のみ）<br/>追加・編集・パスワード再発行・無効化・削除<br/>設定ファイルの役員を DB に取り込み"]
  end

  exec --> login
  mgr --> login
  staff --> login
  login --> auth
  auth -- "メンバー照合" --> members
  auth -- "ログイン成功" --> cookie --> dash
  members -. "メンバーの追加・編集" .- admin
  exec -. "役員のみ" .-> admin

  subgraph apps["各ダッシュボード（同じ HUB_SESSION_SECRET で let_hub を検証・再ログイン不要）"]
    direction TB
    fin["財務・予実・キャッシュフロー<br/>finance.let-inc.net<br/>slack_let ／ Vercel slack-let<br/>必要役割: exec"]
    hyoka["評価制度サイト<br/>hyoka.let-inc.net<br/>agents/outputs/evaluation_criteria ／ Vercel agents<br/>静的サイト + Edge Middleware ／ exec"]
    sales["営業コックピット<br/>sales.let-inc.net<br/>agents/sales-cockpit ／ Vercel sales-cockpit<br/>manager"]
    kpi["案件 KPI（Recruit Ops）<br/>kpi.let-inc.net/kpi<br/>masterAI ／ Vercel masterai<br/>manager"]
    ops["採用マーケティング運用管理<br/>kpi.let-inc.net/ops<br/>masterAI（担当は /ops/staff で登録）<br/>staff"]
    jinji["人材紹介 KPI（求人・求職者）<br/>jinji.let-inc.net<br/>jinjiLsystem/web ／ Vercel jinji-l-system<br/>staff（exec→管理者・CA・RA、それ以外→CA・RA。/settings/users で個別指定）"]
    bpo["サクパスBPO 管理システム<br/>bpo.let-inc.net/hub<br/>let-incjp/sakupassbpo ／ Vercel sakupassbpo<br/>manager（同じメールの登録ユーザーとして入る）"]
    console["Internal Console<br/>GitHub Pages<br/>リンクのみ（SSO 未対応）／ staff"]
  end

  dash --> fin
  dash --> hyoka
  dash --> sales
  dash --> kpi
  dash --> ops
  dash --> jinji
  dash --> bpo
  dash --> console

  subgraph data["データ・外部サービス"]
    direction LR
    pg[("Neon Postgres<br/>hub_member ／ Ops ／ ペルソナ ／ 人材紹介")]
    kv[("Vercel KV<br/>案件 KPI・戦略メモ・制作物リンク・LP入力")]
    notion[("Notion<br/>顧客・商談・担当マッピング・週次実績")]
    mf[("MoneyForward 会計")]
    slack[("Slack 通知")]
    gh[("GitHub let-incjp/lp-factory")]
  end

  members --- pg
  ops --- pg
  jinji --- pg
  kpi --- kv
  kpi --- notion
  sales --- notion
  fin --- mf
  fin --- slack
  ops --- slack

  subgraph lp["LP ファクトリー（ハブ外・公開）"]
    lpf["*.aigrowthx.pro<br/>Vercel lp-factory ／ GitHub Actions sync-domains<br/>採用 LP → 公式 LINE 誘導"]
  end
  kpi -- "「LP を作る」→ sites/slug.json をコミット" --> gh --> lpf
  lpf -. "応募 Webhook（Lステップ等から・未設定）" .-> kpi
```

## 構成要素の一覧

| 要素 | URL | リポジトリ ／ Vercel | 認証 | データ | 必要役割 |
|---|---|---|---|---|---|
| 経営ハブ | hub.let-inc.net | agents/hub ／ let-hub | Auth.js（メール+パスワード、任意で Google）→ `let_hub` 発行 | config/members.json ＋ Postgres hub_member | 全員 |
| 財務・予実・CF | finance.let-inc.net | slack_let ／ slack-let | `let_hub`（exec） | MoneyForward・Notion・Slack | exec |
| 評価制度サイト | hyoka.let-inc.net | agents/outputs/evaluation_criteria ／ agents | Edge Middleware で `let_hub`（exec） | 静的 | exec |
| 営業コックピット | sales.let-inc.net | agents/sales-cockpit ／ sales-cockpit | `let_hub` | Notion | manager |
| 案件 KPI（Recruit Ops） | kpi.let-inc.net/kpi | masterAI ／ masterai | `let_hub` | Vercel KV・Notion | manager |
| 採用マーケ運用管理 | kpi.let-inc.net/ops | masterAI ／ masterai | `let_hub` ＋ /ops/staff | Postgres（Neon） | staff |
| 人材紹介 KPI | jinji.let-inc.net | jinjiLsystem/web ／ jinji-l-system | `let_hub`（staff 以上。`HUB_MIN_ROLE` で絞り込み可）＋ /settings/users | Postgres | staff |
| サクパスBPO 管理システム | bpo.let-inc.net | let-incjp/sakupassbpo ／ sakupassbpo | `let_hub`（`/hub` で同じメールの登録ユーザーのセッションを発行）＋通常ログイン（クライアント・ワーカー） | Postgres（Neon） | manager |
| Internal Console | GitHub Pages | agents/console | なし（リンクのみ） | 静的 | staff |
| LP ファクトリー（ハブ外） | *.aigrowthx.pro | let-incjp/lp-factory ／ lp-factory | なし（公開） | sites/*.json（masterAI「LP を作る」から生成） | — |

## 共通の仕組み

- **共通ログイン**: ハブでログイン → 初回パスワード変更後に `let_hub`（HMAC-SHA256、`HUB_SESSION_SECRET`、Domain `.let-inc.net`、payload は email/name/role/期限）を発行。各アプリは同じ秘密で検証するだけで、ユーザー DB を持たない
- **役割**: `exec` ＞ `manager` ＞ `staff`。ハブの「見られる項目」でさらに絞れる。人材紹介は staff 以上を通し、exec→管理者・CA・RA、それ以外→CA・RA を既定として `/settings/users` で個別指定。運用管理は `/ops/staff` の登録で担当者になる
- **メンバー管理**: `/admin/members`（役員のみ）。設定ファイルの役員 3 名は固定だが「編集できるようにする」で DB に取り込める（DB が優先）
- **秘密の所在**: `HUB_SESSION_SECRET`（ハブ＋7 プロジェクト共通。2026-10-23 に sakupassbpo を追加）、`HUB_PASSWORD_HASHES`（設定ファイル役員のパスワード）、`HUB_DATABASE_URL`（メンバー DB）。各アプリ固有: `CRON_SECRET`（slack-let / sales-cockpit）、`RECRUIT_INTAKE_KEY`・`LP_FACTORY_GITHUB_TOKEN`・`MK_AGENDA_TRIGGER_KEY`（masterai）、`VERCEL_TOKEN`（lp-factory の GitHub Secret）

## 関連ドキュメント

- 設計・計画: `docs/HUB_INTEGRATION_PLAN.md`
- 引き継ぎ: `docs/HUB_HANDOVER_2026-10-20.md`
- オーナー手順: `docs/OWNER_TASKS_2026-10-20.md`
- 実物確認チェックリスト: `docs/MARKETING_OPS_CHECKLIST_2026-10-21.md`
- ハブの実装: `hub/README.md`
