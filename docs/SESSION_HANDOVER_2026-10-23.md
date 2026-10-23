# 引き継ぎ（2026-10-23 時点）— 次のセッションはまずこのファイルを読む

経営ハブ統合・マーケティング事業部システム（案件KPI /kpi ＋ 運用管理 /ops）・LP ファクトリー・評価制度サイトの、2026-10-20〜23 の作業のまとめ。
**終わったこと／まだのこと／決めたこと／次の始め方** をここに集約した。細かい手順は各資料へのリンクで示す。

## 0. 次のセッションの始め方

1. 7 リポジトリを接続する（下表。サクパスBPO・名刺管理は 2026-10-23 後半に追加）。すべて **main が本番**（main への push＝自動デプロイ）。作業は main から新しいブランチを切る
2. このファイルの「2. まだ終わっていないこと」から着手するか、オーナーの新しい依頼を受ける
3. 変更は 1 件ごとに PR → マージ（オーナーの標準指示: 「全部 PR 作成してマージまで」）。マージ前に各リポジトリの検証コマンド（6 章）を通す
4. 禁止事項（全リポジトリ CLAUDE.md）: 空コミット・自動コミット生成・再トリガー目的のコミット。秘密はリポジトリやチャットに書かない（Vercel の環境変数のみ）

| リポジトリ | 中身 | 本番 URL ／ Vercel プロジェクト |
|---|---|---|
| `eijiyoshikawa/agents` | 経営ハブ `hub/`、営業コックピット `sales-cockpit/`、評価制度サイト `outputs/evaluation_criteria/`、資料 `docs/` | hub.let-inc.net（let-hub）／ sales.let-inc.net（sales-cockpit）／ hyoka.let-inc.net（agents） |
| `let-incjp/masterAI` | 案件KPI /kpi・運用管理 /ops（マーケティング事業部のまとめシステム） | kpi.let-inc.net（masterai・LET チーム） |
| `eijiyoshikawa/jinjiLsystem` | 人材紹介（`web/`） | jinji.let-inc.net（jinji-l-system） |
| `eijiyoshikawa/slack_let` | 財務ダッシュボード | finance.let-inc.net（slack-let） |
| `let-incjp/lp-factory` | 採用 LP テンプレート配信（`<接頭辞>.aigrowthx.pro`） | lp-factory（LET チーム） |
| `let-incjp/meishiLsystem` | 名刺管理（スキャン・CSV 取込・人脈分析）。**本番ブランチは `claude/zen-mendel-53fvzz`**（main ではない。PR の base もこのブランチ） | meishi.let-inc.net（DNS 設定待ち）／ meishi-lsystem.vercel.app（meishi-lsystem・LET チーム） |
| `let-incjp/sakupassbpo` | サクパスBPO 管理システム（不動産BPO の契約時間・稼働・請求。資料は同リポジトリ `docs/プロジェクトまとめ（2026-10-23時点）.md`） | bpo.let-inc.net（DNS 設定待ち）／ sakupassbpo.vercel.app（sakupassbpo・LET チーム） |

秘密の一覧と所在は `HUB_ARCHITECTURE_2026-10-22.md`「共通の仕組み」。構成図も同ファイル。

## 1. 終わったこと（本番反映済み）

### 1-1. 経営ハブ（共通ログイン）
- 共通ログイン Cookie `let_hub` を `.let-inc.net` 全体に発行し、案件KPI/運用管理・人材紹介・営業コックピット・財務・評価制度サイトが受け入れる（鍵 `HUB_SESSION_SECRET` は 6 プロジェクト同一）
- メンバー管理 `/admin/members`: 追加・編集・削除・無効化・パスワード再発行（agents #51）
- **「ログインできるサイト」をチェックで選ぶ登録画面**（agents #60）。チェックが正で役割の上限に縛られない。「すべてのサイト」なら役割（役員＞管理職＞一般）で決まる。Cookie の `apps` に入り、各サイトの入口でも `hubAllows()` で同じ判定（masterAI #24・jinjiLsystem #3・slack_let #108・sales-cockpit・評価制度サイト）
- **評価制度サイトは 4 段階**（agents #61）: 役員・全部門／マーケティング／セールス／不動産BPO。部門の段階はその部門の従業員用ページ＋共通ページだけ。トップは部門の入口へ案内
- 人材紹介にハブから直行（staff 以上。jinjiLsystem #2）、「パスワード列がありません」エラーの自動修復（jinjiLsystem #1）
- 新しい社内システムを足す手順書 `HUB_ADD_DASHBOARD.md`（Edge/Node/Python の検証コード同梱。`parent` で段階分けも可）

### 1-2. マーケティング事業部システム（masterAI）
- **/kpi と /ops の統合**（#18 フェーズ 1、#19 フェーズ 2）: 重なる項目は /kpi が正。受注で /kpi 案件を自動作成、フェーズ→契約状況の自動追従、担当者は /ops が正、ヒアリング 7.1〜7.4 の重複項目は /kpi の値で表示・判定・保存（鏡像）。上部メニューを統一。仕様は `masterAI/docs/ops-system.md` 5 章
- **クエスト**（#19・#20・#21）: 旅路（フェーズ）→ いまの関門 → 次にやること → 達成バッジ（16 種）。/ops 案件ページの既定タブ、担当者ホーム、/kpi 概要タブに要約。バッジ履歴は `ops_badge` に保存。基準はオーナー決定どおり（応募は 1 件刻み、一次連絡は 1 名から、CPA は当月、採用は契約期間通算、定例議事録 Notion URL・更新提案・勝ちパターン登録のバッジ、ランキング・通知なし）
- **既存案件の一括取り込み** `/ops/contracts/import`（#20、タイムアウト修正 #22）。実施済み（TECNES 等が /ops に登録され、クエストが表示されている）
- 戦略メモ（ペルソナ・動画ターゲット・差別化・強み・成功/失敗事例。案件タブ＋全案件一覧 `/kpi/strategy`。#15）
- 「LP を作る」フォーム（接頭辞＋LINE で lp-factory に `sites/<slug>.json` を書き、制作物リンクも登録。#14）。トークン `LP_FACTORY_GITHUB_TOKEN` 設定済み
- 運用の設定: 保存フィードバック、媒体別 CTR の目安と自社実績、X広告を外し求人ボックスを追加（#16）。担当者画面のラベル・ハブメンバーからの追加（#17）
- **/kpi ↔ /ops をまたぐリンクが本番で遷移しない事象**を通常遷移に切り替えて解消（#23）。**全ページ中央の「読み込み中」表示**（#24）
- 未使用コードの整理（#25。`ImportTab` の未使用引数）。`tsc --noUnusedLocals --noUnusedParameters` で kpi/ops/lib に未使用なし

### 1-3. LP ファクトリー（let-incjp/lp-factory）
- テンプレート `recruit-onepage`、案件 `sample` / `alphaguard`、`*.aigrowthx.pro` ワイルドカード、独自ドメインの自動追加（GitHub Actions `sync-domains`。DNS は LET の Vercel で管理する前提。`sample-lp.aigrowthx.pro` で実証済み）
- 案件ごとの作業は masterAI の「LP を作る」から接頭辞を入れるだけ

### 1-4. 2026-10-23 後半に終わったこと（すべて main にマージ済み）
- **サクパスBPO を共通ログインに追加**（sakupassbpo #1、agents #63）: ハブのカード「サクパスBPO 管理システム」（key `bpo`、グループ「不動産BPO」、minRole manager）→ `bpo.let-inc.net/hub`。入れるのは「ログインできるサイト」で bpo にチェック（「すべて」は管理職以上）**かつ** サクパスBPO に同じメールで登録済みの人。権限（管理者／ワーカー／クライアント）はサクパスBPO 側の登録どおり。ハブ経由ではユーザーを作らない。ハブでログアウト・チェックを外すと次の遷移で無効。クライアント・社外ワーカーは従来のメール＋パスワード
- **統合レビューの判断 5 項目を反映**（masterAI #26。仕様 `masterAI/docs/ops-system.md` 5 章「統合レビューの判断」）: A-2 ヒアリングの記録として残す／A-3 停止中は定常タスクを作らない／A-5 /kpi に「案件の削除」を追加し同時に /ops を終了／A-6 重複値を日次ジョブで 1 回だけ削除（/kpi に値があるものだけ）／A-9 タスクの完了日を手入力・修正
- **LP ファクトリーの拡張**（masterAI #27・#28）: 「LP を作る」に細かい文言（数字・キャリアと給与例・一日の流れ・社員の声・募集要項・FAQ）、写真の差し替え（9 枠・1 枚 3.5MB まで）、LP の削除
- **人材紹介の権限の不具合を修正**（jinjiLsystem #4）: ハブ経由の一般（staff）メンバーが管理者権限になっていた（middleware と画面側の判定のずれ）。`jinjiHubAllows` に一本化
- サクパスBPO の CI 修正（E2E が新しいチェックアウトで `data/` 不在のため起動しなかった）
- **要件差分の残り 3 件**（masterAI #29。オーナー決定: 広告は記録＋警告だけ／クレーム・審査落ちは記録だけ／面接以降は担当者が代わりに入力し印を付ける）: /ops クリエイティブタブ「広告セットの操作記録」（増額 20% 超・学習期間中の変更・2 週連続未確認の停止を警告。`ops_adset_log`）、概要タブ「クレーム・審査落ち」（Slack 通知なし・ホームのアラートに出る）、/kpi 応募者の「クライアント報告」と報告日
- **名刺管理を共通ログインに追加**（meishiLsystem #1、agents #65）: ハブのカード「名刺管理」（key `meishi`、staff 以上）→ `meishi.let-inc.net`。ハブのメールと同じメールの担当者を自動で選ぶ。共通パスワードも併用。Vercel に `meishi.let-inc.net` を追加済み

### 1-5. オーナー作業で完了したもの（2026-10-22）
人材紹介の旧共通ログイン削除／`agents` の未使用 `CRON_SECRET` 削除／`MK_AGENDA_TRIGGER_KEY` 作り直し／LP ファクトリーのトークン登録／要件書 5 章（KPI 基準値）の入力

## 2. まだ終わっていないこと

### 2-1. オーナー作業（画面操作）
- [ ] **サクパスBPO の共通ログインを有効にする**（2026-10-23 追加。セッションからは代行できなかった: let-hub の `HUB_SESSION_SECRET` は Sensitive で値を読めないため）
  1. Vercel → `let-hub` の `HUB_SESSION_SECRET` と同じ値を、Vercel → LET チーム → `sakupassbpo` → Settings → Environment Variables に `HUB_SESSION_SECRET`（Production / Preview）で追加 → Redeploy。値が手元に無ければ、鍵を作り直してハブ＋7 プロジェクト（sakupassbpo を含む）すべてに入れ直す（`OWNER_TASKS_2026-10-20.md` 1-B。セッションに「共通ログインの鍵を作り直して全プロジェクトに入れて再デプロイして」と頼めば代行可）
  2. Xserver の DNS に `bpo.let-inc.net` の TXT・CNAME（sakupassbpo `docs/デプロイ手順（Vercel + Neon）.md` 3-5）
  3. ハブのメンバー管理で使う人に「サクパスBPO 管理システム」をチェック。**サクパスBPO の管理画面で同じメールのユーザーを登録**（未登録だと「登録されていません」と出る）
  - 2026-10-23 夜時点: 1 は完了（オーナー）。2 の DNS 反映待ち
- [ ] **名刺管理の共通ログインを有効にする**（2026-10-23 追加）
  1. Vercel → LET チーム → `meishi-lsystem` → Environment Variables に `HUB_SESSION_SECRET`（let-hub と同じ値。Production / Preview）→ Redeploy
  2. Xserver の DNS（let-inc.net）に TXT `_vercel` = `vc-domain-verify=meishi.let-inc.net,925707b0d80aec26ae0d`（既存の `_vercel` TXT は残して追加）と CNAME `meishi` → `cname.vercel-dns.com`
  3. 名刺管理の「担当者」画面で、各担当者のメール欄にハブと同じメールを入れる（入れておくと担当者が自動で選ばれる）
- [ ] **メンバー登録**: https://hub.let-inc.net/admin/members で各メンバーを「ログインできるサイト」にチェックして追加 → 初期パスワードを本人に渡す。まず 1 人で、チェックしたサイトだけがハブに出ること・外したサイトの URL を直接開くと弾かれることを確認してから残りを進める。運用管理（/ops）を使う人は https://kpi.let-inc.net/ops/staff にも同じメールで登録
- [ ] 役員ご自身は「すべてのサイト」＋権限「役員」で登録（これまでどおり全部に入れる）
- [ ] 本番確認（2026-10-23 の変更分）: ① /kpi 概要「クエストを開く」でクエスト画面が開く ② 画面切り替え時に中央の「読み込み中」が出る ③ 「評価制度サイト（セールス）」だけのメンバーで hyoka.let-inc.net → /demo/sales に転送、/sales と /demo/marketing は 403
- [ ] 任意: 評価制度サイトの部門ページを自動解錠したければ Vercel `agents` に `HYOKA_PASSWORD_SALES` / `HYOKA_PASSWORD_MARKETING` / `HYOKA_PASSWORD_BPO`（各部門の従業員用パスワード）を設定
- [ ] 人材紹介 `users` の他メンバー登録（細かく役割を分けたい人だけ。`OPEN_TASKS_2026-10-22.md` A-1）
- [ ] 「LP を作る」の初回実走（同 B-1）／alphaguard 複製 LP の扱い（B-2）／LINE → 応募者タブの連携担当（B-3）／独自ドメイン案件の有無（B-4）／Notion「デマント・ジャパン」レコード（B-5）
- [ ] 実物確認チェックリスト `MARKETING_OPS_CHECKLIST_2026-10-21.md`（A〜H）と統合の通し確認 `INTEGRATION_REVIEW_2026-10-22.md` C 章
- [ ] 期限管理: Vercel トークン「lp-factory sync-domains」の期限確認（無期限なら不要）

### 2-2. オーナーの判断（統合レビュー `INTEGRATION_REVIEW_2026-10-22.md`）— 2026-10-23 すべて決定・反映済み
- [x] A-2 ヒアリングの記録として残す ／ A-3 停止中は定常タスクを作らない ／ A-5 削除と同時に /ops を終了 ／ A-6 1 回だけ削除 ／ A-9 完了日を手で直せる（masterAI #26。詳細は 1-4）
- [ ] 本番確認（2026-10-23 後半の変更分）: ① /kpi で停止中にした案件は /ops タスクタブの「生成」でエラーになる ② 架空案件を /kpi 基本情報タブ下の「案件の削除」で消すと /ops が終了になる ③ タスクの完了日を「直す」と期日内完了率が変わる ④ 翌平日 08:30 以降、Inngest の ops-daily の結果に `cleanup` が出る（2 回目以降は `skipped: done`）
- 決定済み（反映済み）: B-1 契約状況は /ops のフェーズから導出で OK／B-2 /kpi 案件は受注時に自動作成／B-3 セールスはいつでも編集可・Slack 通知なし／B-4 目標値はロックせず双方向／B-5〜B-7 バッジ基準・レベル名は現状／B-8 既存案件は一括取り込み／B-9 クエストを /kpi 概要にも表示

### 2-3. 開発の次フェーズ（依頼があれば）
- [ ] **次の新しい社内システムの連携**（オーナーがリポジトリを共有したら。`HUB_ADD_DASHBOARD.md` 0 章の 8 項目 → A リンクのみ／B 共通ログイン／C 役割連動。段階分けは `parent`）
- [x] LP ファクトリーの拡張: 写真アップロード、細かい文言のフォーム編集、masterAI からの LP 削除（2026-10-23。masterAI #27・#28）
- [x] 新しい社内システムの連携: サクパスBPO・名刺管理（2026-10-23。残りはオーナー作業 2-1）
- [x] 要件差分の残り 3 件（広告セットの判断ルール・クレーム／審査落ち・クライアント入力）: 2026-10-23 masterAI #29
- [ ] 採用サイト型テンプレート（トップ＋職種別＋募集要項。2026-10-23 オーナー決定・着手中）
- [ ] 要件差分レポートの未実装分（`masterAI/docs/recruit-marketing-ops-gap-report.md` 5 章）: 広告セット単位の判断ルール、クレーム・審査落ちのエスカレーション、クライアント入力（面接以降）の区別
- [ ] クエストの拡張（要望が出たら）: 担当者をまたぐ週間目標、バッジ獲得の Slack 通知、GA4 連動（今回は見送り）
- [ ] 人材紹介 `users` の役割の細かい制御、工数表の補正（作業時間が 2 ヶ月分たまったら）
- [ ] Notion 担当マッピング DB・営業コックピットの顧客ステータスとの整合（表示用ミラーのまま）
- [ ] 保存先が KV（/kpi）と Postgres（/ops）に分かれている構造の見直し（当面はこのまま）

## 3. 今回決めたこと・設計の要点（次のセッションが迷わないために）

- **/kpi が正、/ops は手順**: 会社名・単価・広告予算・期間・開始/終了日・目標値・数字・ペルソナ・戦略メモ・制作物は /kpi。フェーズ（10 段階）と担当者は /ops。純粋関数は `masterAI/lib/ops/bridge.ts`、同期 IO は `lib/ops/bridge-sync.ts`、ヒアリングの鏡像は `lib/ops/mirror.ts`
- **/kpi ↔ /ops をまたぐリンクは `<a href>`（通常遷移）**: Next.js のクライアント側遷移が本番で完了しない事象があったため。上部メニューは `NavLink`（`app/kpi/_ui/top-nav.tsx`）がシステムをまたぐときだけ `<a>` にする。新しいリンクを足すときも同じ扱いにする
- **読み込み中の表示**: `app/kpi/_ui/loading-overlay.tsx` を `NavProgress`（切り替え中）と `loading.tsx`（ページ本体）の両方で使う。/ops レイアウトにも `NavProgress` あり
- **ハブの権限モデル**: `allow`（DB `hub_member.allow`）が null＝役割で見られる全部、配列＝チェックしたサイトの key だけ。Cookie `let_hub` の `apps` に同じ配列が入る（null のときは入らない）。各サイトの入口は `hubAllows(hub, "<key>", minRole)`（`hasRole` だけで判定しない）。`dashboards.json` の `parent` は段階分け（親にチェックがあれば子は含まれる）
- **評価制度サイトの段階**: `outputs/evaluation_criteria/middleware.js` の `DEPTS` と `accessFor()`。経営陣ページ（経営側P&L）は「役員・全部門」だけ。`/marketing/v2` はマーケ部用の従業員ページ扱い
- **masterAI の /ops 案件ページ**は案件KPI（KV）・タスク・ゲート状態を 1 回だけ読み、`gateContext(id, { rec })` と `loadQuestBoard(..., { tasks, ctx })` に渡して使い回す（本番の KV 往復を減らすため）。`loadPortfolio` を React `cache` で包むのは、サーバーアクション後の再描画で古い値を返す恐れがあるので採用しなかった
- **DNS はクライアントに依頼しない**（LP ファクトリーの独自ドメインは LET の Vercel 管理ドメインだけ自動追加）
- **フォームは明示的なラベル**を付ける（担当者画面の指摘より）。返答は日本語

## 4. 資料の所在

| 資料 | 内容 |
|---|---|
| `docs/SESSION_HANDOVER_2026-10-23.md`（このファイル） | 全体のまとめ・次の始め方 |
| `docs/OPEN_TASKS_2026-10-22.md` | 未完了タスクの詳細（URL・手順付き。状態はこのファイルが新しい） |
| `docs/INTEGRATION_REVIEW_2026-10-22.md` | /kpi×/ops 統合の不足（A）・判断（B）・確認手順（C） |
| `docs/HUB_HANDOVER_2026-10-20.md` | ハブ統合の経緯・本番 URL・環境変数の所在 |
| `docs/HUB_ARCHITECTURE_2026-10-22.md` | 構成図（Mermaid・PNG）と秘密の一覧 |
| `docs/HUB_ADD_DASHBOARD.md` | 新しい社内システムを足す手順（検証コード同梱） |
| `docs/MARKETING_OPS_CHECKLIST_2026-10-21.md` | マーケ関係画面の実物確認リスト |
| `docs/OWNER_TASKS_2026-10-20.md` | オーナー作業の手順書 |
| `docs/LP_FACTORY_PROPOSAL.md`、lp-factory `README.md` | LP ファクトリーの設計・運用 |
| `masterAI/docs/ops-system.md`・`recruit-ops.md`・`recruit-marketing-ops-gap-report.md` | 運用管理・案件KPI の仕様と要件差分 |
| `outputs/evaluation_criteria/README.md`「共通ログイン」 | 評価制度サイトの 4 段階と環境変数 |

## 5. 今回の PR（すべて main にマージ済み）

- masterAI: #12〜#25（#18/#19 統合、#20/#21 クエストと一括取り込み、#22 取り込みタイムアウト、#23 リンク遷移、#24 読み込み中表示＋apps 受け入れ、#25 未使用コード整理）
- agents: #47〜#61（#51 メンバー編集・削除、#52/#53 構成図、#54 連携手順書、#55 人材紹介カード、#56〜#59 資料・修正、#60 ログインできるサイト、#61 評価制度サイト 4 段階）
- jinjiLsystem: #1〜#4 ／ slack_let: #107〜#108 ／ lp-factory: main 直 push（独自ドメイン自動追加・README）
- 2026-10-23 後半: agents #63（ハブにサクパスBPO）、sakupassbpo #1（共通ログイン）、masterAI #26（判断 5 項目）・#27（LP 細かい文言・削除）・#28（LP 写真）・#29（要件差分の残り 3 件）、jinjiLsystem #4（権限の修正）、meishiLsystem #1・agents #65（名刺管理を共通ログインに）

## 6. 検証コマンド（マージ前に通す）

```bash
# masterAI
npm run typecheck && npm test && npm run build
# 未使用コードの確認（kpi/ops/lib に出なければ OK）
npx tsc --noEmit --noUnusedLocals --noUnusedParameters | grep -E "app/(kpi|ops)|lib/(ops|recruit|hub)|middleware"

# agents/hub
cd hub && npm run typecheck && npm test && npm run build
# 評価制度サイト
node outputs/evaluation_criteria/scripts/test-middleware.mjs
# sales-cockpit（依存を入れてから）
cd sales-cockpit && npm ci && npm run typecheck

# sakupassbpo
npm test && npm run build && npm run e2e

# jinjiLsystem/web
npx tsc --noEmit && npx next build
# slack_let（ESLint 等は無し。読み込み確認）
node -e 'require("./lib/auth.js")'
```

ローカルで /ops を動かすには Postgres が必要（`OPS_DATABASE_URL`）。`HUB_SESSION_SECRET` を外せば開発用ユーザー（戦略責任者）で入れる。本番の挙動確認は Vercel のデプロイ後にオーナーが画面で行う。
