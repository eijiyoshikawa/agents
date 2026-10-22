# 未完了タスク一覧（2026-10-22 時点）

経営ハブ統合・マーケ関係システム・LP ファクトリーに関する、まだ終わっていない作業の一覧。完了したら行頭を `[x]` にして日付を書く。
元資料: `HUB_HANDOVER_2026-10-20.md`（引き継ぎ）、`OWNER_TASKS_2026-10-20.md`（手順書）、`MARKETING_OPS_CHECKLIST_2026-10-21.md`（確認リスト）。

## A. オーナー作業（画面操作で完了するもの）

### A-1. 人材紹介システムの users 登録（他メンバー）
- [ ] 画面: https://jinji.let-inc.net/settings/users（ハブに manager 以上でログインした状態で開く）
- 内容: ご自身は管理者・CA・RA で登録済み。他のメンバーを「ユーザーを追加」でメール（ハブと同じ）・氏名・役割（管理者／CA／RA、複数可）で追加。Google ログインを使う人はパスワード欄は空欄
- 補足: 未登録でもハブ経由で入れる（役員→管理者・CA・RA、それ以外→CA・RA）。細かく分けたい人だけ登録すれば足りる
- 先に: 画面に黄色の案内「パスワード列を追加する(003 を実行)」が出ていればボタンを押す（2026-10-22 の修正で自動化済み。出なければ対応不要）

### A-2. 人材紹介の旧共通ログイン削除（A-1 の後） — **2026-10-22 完了**
- [x] 画面: https://vercel.com/let-9aa5c48c/jinji-l-system/settings/environment-variables
- 内容: `SHARED_LOGIN_ID` / `SHARED_LOGIN_PASSWORD`（あれば `SHARED_LOGIN_ROLES`）を Remove → https://vercel.com/let-9aa5c48c/jinji-l-system/deployments の最新 Production を Redeploy
- 当面残すなら: `SHARED_LOGIN_PASSWORD` だけ新しい値に差し替える（パスワードがチャットに残っているため）
- 確認: https://jinji.let-inc.net/settings/users の「社内共有アカウント」が「未設定」になる

### A-3. `MK_AGENDA_TRIGGER_KEY` の作り直し（Vercel と GitHub を同じ値に） — **2026-10-22 完了**
- [x] 値を作る: Mac のターミナルで `openssl rand -hex 32`
- [ ] Vercel: https://vercel.com/let-9aa5c48c/masterai/settings/environment-variables → `MK_AGENDA_TRIGGER_KEY` → Edit → Save
- [ ] GitHub: https://github.com/let-incjp/masterAI/settings/secrets/actions → `MK_AGENDA_TRIGGER_KEY` → Update secret
- [ ] Redeploy: https://vercel.com/let-9aa5c48c/masterai/deployments → 最新 Production → Redeploy
- [ ] 確認: https://github.com/let-incjp/masterAI/actions/workflows/mk-agenda-regen.yml → Run workflow（会議日を入力・notify は off）→ 緑

### A-4. `agents` の未使用 `CRON_SECRET` 削除 — **2026-10-22 完了**
- [x] 画面: https://vercel.com/let-9aa5c48c/agents/settings/environment-variables → `CRON_SECRET` → Remove（Redeploy 不要）
- 代行可: 「3-b は消しておいて」と依頼すればセッション側で削除できる

### A-5. LP ファクトリー用トークンの期限管理 — **2026-10-22 完了（期限が来たら下記手順）**
- [x] GitHub PAT「masterai lp-factory」の期限を確認: https://github.com/settings/personal-access-tokens
- [ ] Vercel トークン「lp-factory sync-domains」の期限を確認: https://vercel.com/account/settings/tokens（無期限なら対応不要）
- [ ] 期限の 2 週間前にカレンダー登録「LP ファクトリーのトークン更新」
- 更新先: https://vercel.com/let-9aa5c48c/masterai/settings/environment-variables の `LP_FACTORY_GITHUB_TOKEN` ／ https://github.com/let-incjp/lp-factory/settings/secrets/actions の `VERCEL_TOKEN`
- 切れたときの症状: 「LP を作る」で 401、lp-factory の Actions `sync-domains` が赤

### A-6. 要件書 10 章の基準値を入力 — **2026-10-22 完了**（媒体別 CTR は目安と自社実績を画面に表示するようにした。let-incjp/masterAI#16）
- [x] 画面: https://kpi.let-inc.net/ops/settings（KPI 基準の欄）
- 内容: 媒体別 CTR 基準・LP 応募率・面接設定率をオーナー判断の値で入力。入力まで案件ページ「概要」の判定は「基準未設定」
- 参考: `masterAI/docs/recruit-ops.md`「KPI 基準の判定」

### A-7. 運用担当・セールスのハブ登録（まだの人がいれば）
- [ ] 画面: https://hub.let-inc.net/admin/members（役員のみ）
- 内容: メール・氏名・役割（staff／manager／exec）・見られる項目 → 「追加して初期パスワードを発行」→ 本人に安全に伝える
- 運用管理（/ops）を使う人は https://kpi.let-inc.net/ops/staff にも同じメールで登録
- 役員 2 名（吉田 翔太・吉川 英治 の let-inc.net）は同じ画面の「編集できるようにする」で DB に取り込める

## B. 確認・判断待ち（オーナーの判断が必要）

### B-1. 「LP を作る」の初回実走
- [ ] 画面: 任意の案件 → https://kpi.let-inc.net/kpi → 案件 → 制作物・リンク タブ → 「LP を作る」
- 内容: 接頭辞（例 `trial-xxx`）と LINE の URL、「検索に載せない」ON で作成 → 「作成しました」→ https://github.com/let-incjp/lp-factory/commits/main にコミット → 数分後に `https://<接頭辞>.aigrowthx.pro/` が開く
- まだ GitHub への実書き込みが 1 回も走っていない。試作は GitHub で `sites/<接頭辞>.json` を削除すれば消える

### B-2. alphaguard の複製 LP の扱い
- [ ] URL: https://alphaguard.aigrowthx.pro/（既存クライアントの LP を複製したもの。noindex で公開中）
- 判断: クライアントに見せるか／消すか。消す場合は https://github.com/let-incjp/lp-factory/tree/main/sites の `alphaguard.json` と `public/sites/alphaguard/` を削除

### B-3. LINE → 応募者タブの自動連携を誰が設定するか
- [ ] 受け口: `POST https://kpi.let-inc.net/api/kpi/applicants`（合言葉 `RECRUIT_INTAKE_KEY` は設定済み）
- 内容: Lステップ等の Webhook に URL・合言葉・案件 ID を設定する担当と期日を決める。未設定の間は応募者タブに手入力
- 手順: `masterAI/docs/recruit-ops.md`「応募の自動登録」

### B-4. 独自ドメインを使う案件の有無
- 内容: LET の Vercel（https://vercel.com/let-9aa5c48c/~/domains）で管理するドメインだけ自動追加できる。使う案件が無ければ `*.aigrowthx.pro` 運用で十分。初回は実ドメインで 1 件通して確認（手順: lp-factory README「独自ドメイン」）

### B-5. Notion「デマント・ジャパン株式会社」レコード
- [ ] URL: https://app.notion.com/p/303c57ee1f608131a8a9c6267ce98f0a
- 内容: 代表者名・会社URL・住所が社名と不一致。営業担当に確認して修正か削除

### B-6. 実物確認チェックリストの実施
- [ ] 資料: `agents/docs/MARKETING_OPS_CHECKLIST_2026-10-21.md`（A〜H）
- 内容: フローが通るか・一人でできるか・準備物の漏れを実物で確認し、NG の行番号をセッションに伝える

## C. 開発の次フェーズ（依頼があれば着手）

### C-1. 新しい社内システムの連携（リポジトリ共有待ち）
- [ ] オーナーがリポジトリを共有 → `agents/docs/HUB_ADD_DASHBOARD.md` の 0 章（8 項目）を確認 → A リンクのみ／B 共通ログイン／C 役割連動で連携
- 受け入れ側（手順書・Node／Edge／Python の検証コード）は準備済み

### C-1b. /kpi と /ops の統合 — フェーズ 1 完了（2026-10-22、let-incjp/masterAI#18）。残りはフェーズ 2
- [x] 正の所在を /kpi に統一（会社名・単価・広告予算・期間・開始/終了日・目標値・担当者名・数字）。受注で /kpi 案件を自動作成、フェーズ→契約状況の自動追従、上部メニュー統一（`masterAI/docs/ops-system.md` 5 章）
- [ ] フェーズ 2: 7.1〜7.4 ヒアリングの重複項目（会社情報・SNS/広告アカウント ID・ピクセル・LP URL）を /kpi からの表示に置き換える（現状は受注時に一度だけ転記）
- [ ] 実物確認: /ops で商談中 → 受注 → /kpi に「準備中」で案件ができる → /kpi で単価変更 → /ops に反映 → 配信中で「稼働中」になる

### C-2. LP ファクトリーの拡張
- [ ] 写真アップロード（現状は GitHub `public/sites/<接頭辞>/` に置く）
- [ ] 細かい文言（給与例・一日の流れ・社員の声・募集要項・FAQ）のフォーム編集（現状は GitHub の JSON）
- [ ] masterAI からの LP 削除ボタン
- [ ] 採用サイト型（複数ページ）テンプレート

### C-3. 要件差分レポートの未実装分
- 資料: `masterAI/docs/recruit-marketing-ops-gap-report.md` 5 章
- [ ] 広告セット単位の判断ルール（2 週連続で停止・増額 20% まで・学習 7 日間は変更禁止）
- [ ] エスカレーション（クレーム・審査落ち。達成率 70% 未満は実装済み）
- [ ] クライアント入力（面接以降の結果）の区別

### C-4. 人材紹介 `users` の役割を細かく制御する機能
- 内容: 現状は users 登録かハブ役割の既定（exec→管理者、他→CA・RA）。部署や担当範囲で絞る必要が出たら設計

### C-5. 工数表の補正
- [ ] 2 ヶ月分の作業時間が集まったら https://kpi.let-inc.net/ops/settings の工数表を実績で補正

## D. 定期的に見るもの
- lp-factory の独自ドメイン追加結果: https://github.com/let-incjp/lp-factory/actions/workflows/sync-domains.yml
- masterai の本番デプロイ: https://vercel.com/let-9aa5c48c/masterai/deployments
- ハブの本番デプロイ: https://vercel.com/let-9aa5c48c/let-hub/deployments
- 秘密の一覧と所在: `agents/docs/HUB_ARCHITECTURE_2026-10-22.md`「共通の仕組み」
