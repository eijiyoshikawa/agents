# 経営ハブ統合 — 引き継ぎメモ（2026-10-20 時点）

次のセッションでは、まずこのファイルと `docs/HUB_INTEGRATION_PLAN.md` の「次にやること」を読む。オーナー作業の具体的な手順は `docs/OWNER_TASKS_2026-10-20.md`。

## 次のセッションで接続するリポジトリ

| リポジトリ | 役割 | 作業ブランチ |
|---|---|---|
| `eijiyoshikawa/agents` | 経営ハブ本体（`hub/`）、営業コックピット（`sales-cockpit/`）、評価制度サイト（`outputs/evaluation_criteria/`）、この引き継ぎ資料（`docs/`） | `claude/epic-babbage-p7cudc`（2026-10-20 夜に `claude/eager-maxwell-y50ck7` を取り込んで継続） |
| `let-incjp/masterAI` | 案件KPI（/kpi）・運用管理（/ops）・CPA目標・ペルソナシート | `claude/epic-babbage-p7cudc`（同上） |
| `eijiyoshikawa/jinjiLsystem` | 人材紹介管理（`web/`） | `claude/epic-babbage-p7cudc`（同上） |
| `eijiyoshikawa/slack_let` | 財務ダッシュボード | `claude/epic-babbage-p7cudc`（同上。main から作り直し済み） |
| `eijiyoshikawa/genbacareer` | 対象外（特定商取引法ページの代表者名修正 1 件だけ作業ブランチにある） | 必要なときだけ |

**注意**: 各リポジトリの作業ブランチは main 未マージ。main に push があると Vercel の本番がその内容で上書きされる（masterAI で 1 度発生）。本番を直したいときは作業ブランチを Vercel API/ダッシュボードから本番デプロイし直す。根本対処は main へのマージ。

## 本番の URL と Vercel プロジェクト

| 画面 | URL | Vercel プロジェクト（チーム） | 共通ログイン |
|---|---|---|---|
| 経営ハブ | https://hub.let-inc.net | let-hub（eijiyoshikawa's projects） | 入口 |
| 案件KPI | https://kpi.let-inc.net/kpi | masterai（LET） | 対応 |
| 運用管理 | https://kpi.let-inc.net/ops | masterai（LET） | 対応 |
| 営業コックピット | https://sales.let-inc.net | sales-cockpit（eijiyoshikawa's projects） | 対応（管理職以上） |
| 人材紹介 | https://jinji.let-inc.net/dashboard | jinji-l-system（eijiyoshikawa's projects） | 対応（管理職以上。役員=admin） |
| 財務 | https://finance.let-inc.net/api/financial/dashboard | slack-let（eijiyoshikawa's projects） | 対応（役員のみ） |
| 評価制度サイト | https://hyoka.let-inc.net （DNS 反映まで https://let-hyoka.vercel.app） | agents（eijiyoshikawa's projects） | 実装済み（役員のみ。DNS と鍵の設定待ち） |

- 共通ログインの仕組み: ハブが `.let-inc.net` 全体に `let_hub` Cookie（HMAC 署名、7 日）を発行し、各アプリが `HUB_SESSION_SECRET`（5 プロジェクト同一値）で検証。ハブをログアウトすると Cookie は失効する。
- 保存先 DB: Neon `let-ops`（LET チームの Storage）。masterai は `OPS_DATABASE_DATABASE_URL`、let-hub は `HUB_DATABASE_URL`。テーブルは初回アクセス時に自動作成（`lib/ops/migrate.ts` / `hub/lib/migrate.ts`）。
- Vercel の古いプロジェクト `let-hyoka` はビルドをスキップする設定にした。削除してよい（評価サイトは `agents` プロジェクトから配信）。

## 今回のセッションでできたこと

1. ハブを紺色のダッシュボード風デザインに刷新（masterAI /kpi・/ops と同じ配色）。
2. 経営陣以外のログイン: ハブの「メンバー管理」でメンバー追加・項目ごとの閲覧制限・初回パスワード変更。
3. Neon を masterai と let-hub に接続。手元のマイグレーション不要（自動作成）。
4. 各ダッシュボードに「← 経営ハブ」リンク。
5. 営業コックピット・人材紹介・財務に共通ログインの受け入れを実装。`sales` / `jinji` / `finance` のサブドメインを付与し、DNS 反映・共有鍵の統一・再デプロイまで完了。
6. masterAI /kpi に「CPA目標」タブ（広告費予算・リスト獲得/応募/採用の単価目標、どこがダメかの判定、かんたん設定）と案件ダッシュボードの CPA 表。
7. masterAI /kpi に「ペルソナ」タブ（案件ごと・職種ごとのペルソナシート＋訴求設計。保存先は Postgres）。
8. 氏名の修正（吉川 英治）。セッションの氏名・権限は 5 分ごとに読み直すように変更。

## 残っている作業

### オーナー
- [ ] ハブ `/admin/members` で運用担当・セールスを登録し初期パスワードを配布。運用管理を使う人は `kpi.let-inc.net/ops/staff` にも登録
- [ ] 役員 2 名への初期パスワード配布と、メモ（scratchpad の hub-initial-passwords.txt）の削除
- [ ] Vercel の `let-hyoka` プロジェクトの削除（任意）
- [ ] 作業ブランチを main にマージする判断（4 リポジトリ）。マージ後は main への push で自動デプロイになる

### 評価制度サイトの共通ログインを有効にする（2026-10-20 追記）
コードは `outputs/evaluation_criteria/middleware.js` に実装済み（検証 `node outputs/evaluation_criteria/scripts/test-middleware.mjs`）。
`*.vercel.app` では従来どおりなので、デプロイしても今の使い方は変わらない。有効化に必要なのは次の 3 つ。
- [ ] **オーナー**: Xserver の DNS に CNAME `hyoka` → `cname.vercel-dns.com` を追加（`hyoka.let-inc.net` は Vercel の `agents` プロジェクトに追加済み。今は Xserver の A レコードを向いている）
- [ ] **オーナー**: `agents` プロジェクトの `HUB_SESSION_SECRET`（Sensitive）にハブと同じ値を入れる。値は Sensitive で読み出せないので、分からなければ `openssl rand -base64 32` で作り直し、let-hub / masterai / sales-cockpit / jinji-l-system / slack-let / agents の 6 つに同じ値を入れて全部 Redeploy（全員ハブに再ログイン）。次のセッションに「鍵を作り直して」と頼めば代行する
- [ ] 上記のあと `agents` の作業ブランチを本番デプロイし、ハブ（let-hub）も Redeploy（`dashboards.json` の評価サイトを `hyoka.let-inc.net` / sso ready に変更済み）
- 設定済み: `agents` の `HUB_URL`、`HYOKA_EXEC_PASSWORD`（経営陣パスワード。役員は入力なしで開ける）
- 検証済み: プレビュー環境で未ログイン→ハブのログインへ 302、役員→200＋解錠 Cookie、管理職→経営陣ページ 403・従業員ページ 200 を確認。`agents` の Preview 環境変数 `DELETE_ME_TEST_*` 3 件はその検証の残骸なので削除してよい
- `*.vercel.app` では何も変わらないので、作業ブランチを本番デプロイ済み（let-hyoka.vercel.app は従来どおり）

### 次のセッション（開発）
- [ ] 作業ブランチの main マージ（オーナー了承後）。masterAI は main が先行しているため `origin/main` を取り込んでから
- [x] 評価制度サイト（静的）の共通ログイン対応（Edge Middleware で `let_hub` 検証。`agents` プロジェクト）— 2026-10-20 実装。有効化は上記
- [ ] 人材紹介の `users` テーブルに役員・管理職を登録して役割を細かく制御（未登録時は 役員=admin / 管理職=CA・RA）
- [ ] 要件書 10 章の未確定値（CTR 基準・LP 応募率・面接設定率）を `/ops/settings` に入力（オーナー判断の値）
- [x] 応募の自動登録（LP フォーム・LINE の受け口）— 2026-10-20 masterAI に `POST /api/kpi/applicants` を実装（`docs/recruit-ops.md`「応募の自動登録」）。有効化は **オーナー**: masterai の環境変数 `RECRUIT_INTAKE_KEY` に合言葉を設定して Redeploy し、LP フォーム／Lステップ等の Webhook に同じ合言葉と案件 ID を設定
- [ ] 2 ヶ月分の作業時間が集まったら工数表を補正
- [ ] `CRON_SECRET` 等の既存秘密のローテーション
- [ ] Notion の DB_顧客管理「デマント・ジャパン株式会社」の「代表者名」が「吉川 英二」（顧客側の代表者欄。レコード自体が社名と URL・住所が不一致なので営業担当に確認して修正/削除。手順書 7.）
- [x] masterAI 案件ページに「制作物・リンク」タブ（LP 等を 公開URL / GitHub / Vercel / Claude Code の 3 点セットで登録、上部にクイックリンク）— 2026-10-20 本番反映
