# 引き継ぎ文書 — 新評価制度・広告費直課プロジェクト

最終更新: 2026-09-11（第2版）／ 作業ブランチ: claude/beautiful-mayer-ad0uoj（agents / slack_let 共通・mainからの派生。旧 claude/evaluation-finance-dashboard-d0u7iz はmainへマージ済み）
前セッション: https://claude.ai/code/session_01CEs8t44U3YAbgJGVMxLpfg ／ 本セッション: https://claude.ai/code/session_018vuHaQjWTV5N2aCGk459Ye

> 旧評価シートの引き継ぎは `outputs/evaluation_criteria/HANDOVER.md`（保管扱い）。本書は**新評価制度（2026-10-01施行予定）と広告費のクライアント別直課**の現在地と未完了タスクをまとめる。

---

## 1. 現在の稼働状態（すべて本番反映済み）

### 評価サイト（let-hyoka.vercel.app ／ Vercelプロジェクト `agents`）
- **個人URL制**: `/my/ehara` `/my/hamasaki` `/my/matsumoto` `/my/matsuoka` `/my/sawaguchi`（本人パスワード＋役員のみ）。`/new-system` は役員専用。パスワード原本はNotion「MF連携設定」`eval_page_password_*`（Gitにコミットしない）
- 実体は静的HTML。`my/*.html` は `new-system.html` の完全コピー×2ミラー（`outputs/evaluation_criteria/` と同 `public/`）。**new-system.html更新時は my/5枚×2ミラーへの同期コピー必須**
- 制度内容: プール式ボーナス（営業マーケ合同・半期実チーム粗利×15%・ガードなし・ランクウェイトR1 0.8〜R5 1.6）／BPOは原価率40%以下で月給1ヶ月（固定残業0円確定）／個人昇降格は役割配分方式（正本: `outputs/new-evaluation/PERSONAL-EVAL.md`、決定ログ: 同`SPEC.md`）
- **個人昇降格の正式判定（役割配分方式）を実装済み（2026-09-11・本番未デプロイ）**: 各メンバーカードに「🧭 昇降格の正式判定」ブロックを追加。台帳（フェーズ・担当割合）と半期目標Gが揃った人は「本人評価粗利 ÷ G」の正式ゲージ、揃うまでは「判定準備中」と未入力の案件・不足項目を列挙する（未入力はゼロ扱いしない）。旧基準ゲージ（粗利÷月給×1.15×倍率）は折りたたみの参考表示に格下げ

### slack-let（Vercelプロジェクト `slack-let`・kix1）
- **広告費のクライアント別直課**: MF補助科目「クライアント広告費」を、Meta API消化額＋Notion「広告費配賦台帳」の**月次合算比率で自動按分**（lib/eval-contribution.js。合計は必ずMF計上額と一致・実績なし月はプール一括控除に縮退）。「マーケティング関連外注」はプール原資から控除（個別振り分けは未実装・台帳待ち）
- **Meta API**: 5アカウント登録済み（アルファガード866751242929526／JUNKI 1269785775233286／八百一1532913418481528／弘陽電設1449325797210992／小川工業2162203467975184）。トークンは`META_ACCESS_TOKEN`（Vercel env・システムユーザー adsystem20260910・アプリ eijiyoshikawa.2026dev・ads_read）
- **個人評価（役割配分方式）の集計** — lib/new-eval.js `computeRoleEval`（2026-09-11・本番未デプロイ）。本人評価粗利 = 案件粗利 × 役割配分率（SNS初回 営業50/マーケ50・SNS更新後 10/90・クロスセル単発 50/50・人材紹介コミット型 営業20/マーケ50/CA30・人材紹介一般型 営業50/CA50・不動産/BPO 100%）× 本人担当割合。入力元は担当マッピングDBの「フェーズ」「担当割合」列（担当割合は 0.6 でも 60 でも可）と MF連携設定 **`neweval_targets`**（例: `{"松本":{"G":1200000,"N":1500000},"松岡":{"G":900000}}` または `松本:G=1200000/N=1500000,松岡:G=900000`）。昇格ライン = max(G×110%, N)・降格ライン = G×70%（暫定）。営業役割は「営業担当」列で帰属（営業内担当割合は任意列「営業担当割合」を追加すれば読む・無ければ100%）。ペイロードは各メンバーの `personal_eval`（system は `new-evaluation-v2`）
- **担当マッピングDBの列名対応**: 「社内担当者」列（旧「担当者」）をコードが読んでいなかった不整合を修正（両方の列名に対応）。修正前は運用担当（マーケ/BPO）の案件帰属が空になり得たので、デプロイ後に `/my/*` の実績が出ているか確認する
- **月次PL**: 分類はMF正式分類（/accounts）ベースに置換済み（lib/mf-reports.js loadClassifier）。**毎月5日=速報・20日=確報**の2本配信（api/cron/monthly-pl.js・JST15日以降は確報ラベル）。8/1速報ズレの真因は月末後の仕訳入力（403件中310件）で、分類は無罪と確定済み
- タスク通知: 毎朝8:30 個人DM＋#sakubuzz_task（C0BV54LUQS3）まとめ、期日変更は毎時
- 診断: `/api/mf/pl-diag?month=YYYY-MM&token=` ／ アラートセンター `/api/financial/alerts`（広告費突合含む）

## 2. 未完了タスク一覧（次セッションの引き継ぎ）

### すぐ動ける（ユーザー回答待ち → 回答が来たらNotion登録）
1. **JUNKI建設・小川工業の「MF取引先名」** — 担当マッピングDBに行は作成済み（社内担当者=松本・営業担当=役員は入力済み）だが **MF取引先名が空欄**（2026-09-11時点）。売上名寄せに必要
2. **求人ボックス9月分の確定額更新** — 台帳に暫定¥2,000×2件（JUNKI・アルファガード）。月末に請求確定後スクショをもらい更新（備考に暫定と記載済み）
3. **TikTok月次運用** — 毎月「By month付きxlsx」をもらい配賦台帳に差分登録（2026-02〜09の16行は登録済み）。求人ボックス/Airworkは請求スクショで随時（Airworkの**LET自社採用分は台帳対象外**＝自社経費）
4. **自社採用広告のMF仕訳確認** — 補助科目「クライアント広告費」に自社分を混ぜない運用の徹底（混ざるとボーナス原資が過小に）

### 期限あり
5. **Metaトークン再生成** — 60日発行の場合、**2026年11月上旬に期限切れ**。切れるとアラートセンターに「Invalid OAuth」エラーが出る。再生成→`npx vercel env rm/add META_ACCESS_TOKEN production`→`npx vercel --prod`
6. ~~T-MF-003のクローズ~~ — **完了済み**（Notion上「完了」・本番デプロイ dpl_8vHmKUeuseTEsxjhjCnbJVHcwXW7 = main 534488c に確報cron入りを確認 2026-09-11）
6b. **本セッション分のデプロイ** — slack-let（役割配分集計・列名修正）と評価サイト（正式判定ブロック）を §4 の手順で本番反映する。反映後 `/my/matsumoto` 等で「判定準備中」ブロックと旧基準の折りたたみが出ることを確認

### 制度の本実装（情報が揃い次第）
7. **個人評価の正式判定のデータ入力** — 集計・表示は実装済み。残りは入力のみ: (a) 担当マッピングDBの稼働中案件に「フェーズ」「担当割合」を入力（2026-09-11時点 全行未入力。実績のある案件が未入力だとその人は「判定準備中」のまま）(b) MF連携設定に `neweval_targets` を登録（各人のG・N）。人材紹介コミット型 20/50/30 は初期値（期首に正式採用を確認）。「営業担当割合」列は必要になったら追加（役員紹介案件の営業内持分用）
8. **社員へのSlackドラフト送信** — 5名分作成済み・未送信（最後まで保留の指示。送信はユーザー自身がSlackドラフトから）

### 制度・労務（サイト外）
9. 代表の最終承認（まとめ資料§14）／ 就業規則改定（現行Word待ち→新旧対照表作成）／ CA賞与方式（未定・採用後）／ 10/1施行時の旧ページ（/demo/*）の扱い（保留）

### 将来の改善候補
10. TikTok Marketing API自動化（キャンペーン名にクライアント名を入れる命名規則→開発者アプリ申請）
11. 外注費のクライアント別振り分け（配賦台帳に外注行を追加する運用が決まれば按分対象を外注にも拡張。コードはeval-contribution.jsの広告按分と同型でよい）

## 3. 重要リソース（ID一覧）

| リソース | ID / URL |
|---|---|
| 担当マッピングDB | page 1bf24c541f564a679510de3554dcdceb ／ data_source 0dcce66e-e8ad-4f4e-a2b7-8677139d5439 |
| メンバーマスタDB | 9dbb5eb285e94a0b8dd4f7e1df75f778（5名: 江原35万・松本30万・松岡31.5万・澤口27.5万・濵﨑32万） |
| MF連携設定DB | page 391c57ee1f6081afaf70dbc54c65f0cb ／ data_source 391c57ee-1f60-8120-8860-000bd65c3b92 |
| 広告費配賦台帳DB | page 0d169ceb1eda45daac8d9eb8fa01d592 ／ data_source 3e605681-7f61-4a78-bbb3-db49f070ca29（設定キー eval_ad_ledger_db_id） |
| タスクDB（LET Task Bot） | db 1efae97924e5450ba8b0b1bd544b43be ／ data_source f3fc5218-b0cc-478d-a5a9-48d511d2c9ec |
| Slack ID | 江原U0B2JLSTY49・濵﨑U0BMB9USFB5・松本U0AQPKCTMQQ・松岡U0AQPKFCBGQ・澤口(若槻)U0AQPKE3QUQ・吉川U0AP50L19UP・#sakubuzz_task C0BV54LUQS3 |

## 4. デプロイ（両リポ共通の注意はCLAUDE.md参照）

```bash
# slack-let
cd ~/work/slack_let && git checkout main && git pull origin main && npx vercel --prod  # 1行目 slack-let 確認
# 評価サイト
cd ~/work/agents && git checkout main && git pull origin main && npx vercel --prod    # 1行目 agents 確認
```

- GitHub→Vercel自動デプロイ停止中。mainマージ後にユーザーがCLIで実行する運用
- 空コミット・自動コミット生成は絶対禁止（CLAUDE.md恒久ルール）
- リモートセッションからのmain反映手順: branchへcommit/push → `git checkout -B main origin/main && git merge --no-ff origin/claude/beautiful-mayer-ad0uoj && git push origin main`（ユーザー承認済みの定型運用。**本セッションのcommitはmain未マージ** — ユーザー確認後にマージ）
