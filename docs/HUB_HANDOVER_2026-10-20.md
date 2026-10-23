# 経営ハブ統合 — 引き継ぎメモ（2026-10-20 時点）

次のセッションでは、まずこのファイルと `docs/HUB_INTEGRATION_PLAN.md` の「次にやること」を読む。オーナー作業の具体的な手順は `docs/OWNER_TASKS_2026-10-20.md`。

## 次のセッションで接続するリポジトリ

| リポジトリ | 役割 | 作業ブランチ |
|---|---|---|
| `eijiyoshikawa/agents` | 経営ハブ本体（`hub/`）、営業コックピット（`sales-cockpit/`）、評価制度サイト（`outputs/evaluation_criteria/`）、この引き継ぎ資料（`docs/`） | `main`（2026-10-21 マージ済み。新しい作業は main から新ブランチ） |
| `let-incjp/masterAI` | 案件KPI（/kpi）・運用管理（/ops）・CPA目標・ペルソナシート・応募 Webhook・制作物リンク | `main`（同上） |
| `eijiyoshikawa/jinjiLsystem` | 人材紹介管理（`web/`） | `main`（同上） |
| `eijiyoshikawa/slack_let` | 財務ダッシュボード | `main`（同上） |
| `let-incjp/lp-factory` | **LP ファクトリー**（採用 LP テンプレート。`<slug>.aigrowthx.pro` で全案件を配信。2026-10-21 新設） | `main`（push が本番。Vercel LET チーム `lp-factory`） |
| `eijiyoshikawa/genbacareer` | 対象外（特定商取引法ページの代表者名修正 1 件だけ作業ブランチにある） | 必要なときだけ |

**2026-10-21**: 4 リポジトリとも main にマージ済み。main への push（マージ）が本番デプロイになるので、main には動作確認済みのものだけを入れる。

## 本番の URL と Vercel プロジェクト

| 画面 | URL | Vercel プロジェクト（チーム） | 共通ログイン |
|---|---|---|---|
| 経営ハブ | https://hub.let-inc.net | let-hub（eijiyoshikawa's projects） | 入口 |
| 案件KPI | https://kpi.let-inc.net/kpi | masterai（LET） | 対応 |
| 運用管理 | https://kpi.let-inc.net/ops | masterai（LET） | 対応 |
| 営業コックピット | https://sales.let-inc.net | sales-cockpit（eijiyoshikawa's projects） | 対応（管理職以上） |
| 人材紹介 | https://jinji.let-inc.net/dashboard | jinji-l-system（eijiyoshikawa's projects） | 対応（管理職以上。役員=admin） |
| 財務 | https://finance.let-inc.net/api/financial/dashboard | slack-let（eijiyoshikawa's projects） | 対応（役員のみ） |
| 評価制度サイト | https://hyoka.let-inc.net （従来の https://let-hyoka.vercel.app はパスワード式のまま） | agents（eijiyoshikawa's projects） | 対応（役員のみ） |

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

## メンバー登録（2026-10-23 変更）

- `hub.let-inc.net/admin/members` の「メンバーを追加」は、メール・氏名のあとに **「ログインできるサイト」をチェックで選ぶ** 形にした。チェックしたサイトだけがハブに表示され、共通 Cookie の `apps` に入るので、各サイト（案件KPI/運用管理・人材紹介・営業コックピット・財務・評価制度サイト）の入口でも同じ判定で弾く
- 「すべてのサイト」にチェックすると従来どおり役割（役員＝全部／管理職／一般）で決まる。今後サイトが増えたときも自動で増える
- 登録の流れ: メール・氏名を入れる → サイトにチェック → 権限（役員だけメンバー管理ができる）→「追加して初期パスワードを発行」→ 表示された初期パスワードを本人に渡す（初回ログインで変更を求める）
- **評価制度サイトは 4 段階**（2026-10-23）: 「役員・全部門」（経営陣ページ＝経営側P&Lを含む全部）／「マーケティング」／「セールス」／「不動産BPO」。部門の段階はその部門の従業員用ページ（`/demo/部門` `/manual/部門`、マーケは `/marketing/v2` も）と共通ページ（`/new-system` `/my/*`）だけ見られ、他部門・経営陣ページは 403。トップ `/` は部門の入口へ案内する
- 部門ページのパスワード入力を自動で済ませたい場合は、Vercel `agents` プロジェクトに `HYOKA_PASSWORD_SALES` / `HYOKA_PASSWORD_MARKETING` / `HYOKA_PASSWORD_BPO`（各部門の従業員用パスワード）を設定する（任意。未設定なら従来どおり各ページで入力）

## 残っている作業

### オーナー
- [ ] ハブ `/admin/members` で運用担当・セールスを登録し初期パスワードを配布。運用管理を使う人は `kpi.let-inc.net/ops/staff` にも登録
- [ ] 役員 2 名への初期パスワード配布。前回のメモは消えているので作り直す: ハブ `/admin/members` で役員のメールを「メンバーを追加」（役割 exec・見られる項目すべて）すると初期パスワードが 1 回表示される（DB のメンバーが設定ファイルより優先されるので、この方法で役員のパスワードも再発行できる）
- [x] Vercel の `let-hyoka` プロジェクトの削除 — 2026-10-21 オーナー実施
- [ ] 作業ブランチを main にマージする判断（4 リポジトリ）。マージ後は main への push で自動デプロイになる

### 評価制度サイトの共通ログインを有効にする（2026-10-20 追記）
コードは `outputs/evaluation_criteria/middleware.js` に実装済み（検証 `node outputs/evaluation_criteria/scripts/test-middleware.mjs`）。
`*.vercel.app` では従来どおりなので、デプロイしても今の使い方は変わらない。有効化に必要なのは次の 3 つ。
- [x] **オーナー**: Xserver の DNS に CNAME `hyoka` → `cname.vercel-dns.com` を追加 — 2026-10-20 反映済み（Vercel で Valid Configuration）
- [x] `HUB_SESSION_SECRET` を作り直し、let-hub / masterai / sales-cockpit / jinji-l-system / slack-let / agents の 6 つに同じ値を設定して全部再デプロイ — 2026-10-20 完了（役員はハブに再ログインが必要）
- [x] `agents` の作業ブランチを本番デプロイ、ハブ（let-hub）も作業ブランチで再デプロイ（評価サイトのカードが `hyoka.let-inc.net` に） — 2026-10-20 完了。未ログインで hyoka.let-inc.net を開くとハブのログインへ転送されることを確認済み
- 設定済み: `agents` の `HUB_URL`、`HYOKA_EXEC_PASSWORD`（経営陣パスワード。役員は入力なしで開ける）
- 検証済み: プレビュー環境で未ログイン→ハブのログインへ 302、役員→200＋解錠 Cookie、管理職→経営陣ページ 403・従業員ページ 200 を確認。`agents` の Preview 環境変数 `DELETE_ME_TEST_*` 3 件はその検証の残骸なので削除してよい
- `*.vercel.app` では何も変わらないので、作業ブランチを本番デプロイ済み（let-hyoka.vercel.app は従来どおり）

### LP ファクトリー（2026-10-21 新設。詳細は `docs/LP_FACTORY_PROPOSAL.md` と lp-factory の README）
- [x] リポジトリ `let-incjp/lp-factory`、Vercel プロジェクト `lp-factory`（LET チーム）、`*.aigrowthx.pro` のワイルドカードドメイン付与、初回デプロイ
- [x] テンプレート `recruit-onepage`（アルファガード構成 × 八百一の CSS 変数設計）、案件 `sample` / `alphaguard`、LINE 待機ページ、共通ストック写真、計測タグ
- [x] 独自ドメインの自動追加（`sites/*.json` の `domains` → GitHub Actions `sync-domains` が Vercel に追加）。前提は **DNS は LET の Vercel で管理**（クライアントに DNS 設定を依頼しない）。Vercel 管理のドメインなら追加だけで自動設定、そうでなければ LET 側の作業を Summary に出す
- [x] **オーナー**: GitHub `lp-factory` の Secret `VERCEL_TOKEN` 登録 — 2026-10-21 完了（`sample-lp.aigrowthx.pro` で push → 自動追加 → 公開まで実証済み）
- [x] masterAI 案件ページ「制作物・リンク」タブに **「LP を作る」** フォーム（接頭辞＋LINE で `sites/<slug>.json` を GitHub に書き、制作物リンクも自動登録）— 2026-10-21 masterAI #14 で main 反映（`docs/recruit-ops.md`「LP を作る」）
- [ ] **オーナー**: 「LP を作る」の有効化 — GitHub の Fine-grained PAT（Resource owner `let-incjp`、Repository access は lp-factory のみ、Permissions は Contents: Read and write）を作り、Vercel → masterai → Environment Variables に `LP_FACTORY_GITHUB_TOKEN` として追加 → Redeploy。未設定の間は画面に案内が出て保存できない
- [ ] 次: 写真アップロード（現状は GitHub の `public/sites/<slug>/` に置く）、採用サイト型テンプレート、masterAI の「LP を作る」で細かい文言（給与例・一日の流れ・声）も編集できるようにする

### リマインド（オーナーから共有待ち）
- [ ] **新しい社内システムの連携** — オーナーがリポジトリを共有したら、`docs/HUB_ADD_DASHBOARD.md` の 0 章（8 項目）を確認して連携する（A リンクのみ → B 共通ログイン → C 役割連動）。受け入れ側（手順書・Python 版検証コード）は 2026-10-22 に準備済み
- [x] 人材紹介（jinji.let-inc.net）にハブから直行 — 2026-10-22 staff 以上を通すよう変更（jinjiLsystem #2、agents のカード minRole を staff に）。共有 ID（let-staff）はハブ外の人向けに残置。パスワードはチャットで共有されたので作り直し推奨（Vercel jinji-l-system の `SHARED_LOGIN_PASSWORD`）

### 次のセッション（開発）
- [x] 作業ブランチの main マージ — 2026-10-21 完了（agents #47 / masterAI #12 / slack_let #107。jinjiLsystem は既にマージ済み）。以後は main への push で自動デプロイ。本番は main の内容で稼働中
- [x] 評価制度サイト（静的）の共通ログイン対応（Edge Middleware で `let_hub` 検証。`agents` プロジェクト）— 2026-10-20 実装。有効化は上記
- [ ] 人材紹介の `users` テーブルに役員・管理職を登録して役割を細かく制御（未登録時は 役員=admin / 管理職=CA・RA）
- [ ] 要件書 10 章の未確定値（CTR 基準・LP 応募率・面接設定率）を `/ops/settings` に入力（オーナー判断の値）
- [x] 応募の自動登録（LP フォーム・LINE の受け口）— 2026-10-20 masterAI に `POST /api/kpi/applicants` を実装（`docs/recruit-ops.md`「応募の自動登録」）。有効化は **オーナー**: masterai の環境変数 `RECRUIT_INTAKE_KEY` に合言葉を設定して Redeploy し、LP フォーム／Lステップ等の Webhook に同じ合言葉と案件 ID を設定
- [ ] 2 ヶ月分の作業時間が集まったら工数表を補正
- [x] `CRON_SECRET` の作り直し（slack-let / sales-cockpit）— 2026-10-21 完了・main デプロイで反映。財務画面の旧ログイン（?token= の Cookie）は無効になった（役員は共通ログインで入る）。`agents` の未使用 `CRON_SECRET` と masterai の `MK_AGENDA_TRIGGER_KEY`（GitHub Actions secret と同時更新が必要）は未実施
- [x] masterai に `RECRUIT_INTAKE_KEY` を設定（2026-10-21）。値はオーナーに伝達済み。LP フォーム／Lステップ側に同じ値と案件 ID を設定すれば応募が自動登録される
- [ ] Notion の DB_顧客管理「デマント・ジャパン株式会社」の「代表者名」が「吉川 英二」（顧客側の代表者欄。レコード自体が社名と URL・住所が不一致なので営業担当に確認して修正/削除。手順書 7.）
- [x] masterAI 案件ページに「制作物・リンク」タブ（LP 等を 公開URL / GitHub / Vercel / Claude Code の 3 点セットで登録、上部にクイックリンク）— 2026-10-20 本番反映
