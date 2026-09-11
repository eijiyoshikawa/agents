# 引き継ぎ文書 — 新評価制度・広告費直課プロジェクト

最終更新: 2026-09-11 ／ 作業ブランチ: claude/evaluation-finance-dashboard-d0u7iz（agents / slack_let 共通・mainへマージ済み）
前セッション: https://claude.ai/code/session_01CEs8t44U3YAbgJGVMxLpfg

> 旧評価シートの引き継ぎは `outputs/evaluation_criteria/HANDOVER.md`（保管扱い）。本書は**新評価制度（2026-10-01施行予定）と広告費のクライアント別直課**の現在地と未完了タスクをまとめる。

---

## 1. 現在の稼働状態（すべて本番反映済み）

### 評価サイト（let-hyoka.vercel.app ／ Vercelプロジェクト `agents`）
- **個人URL制**: `/my/ehara` `/my/hamasaki` `/my/matsumoto` `/my/matsuoka` `/my/sawaguchi`（本人パスワード＋役員のみ）。`/new-system` は役員専用。パスワード原本はNotion「MF連携設定」`eval_page_password_*`（Gitにコミットしない）
- 実体は静的HTML。`my/*.html` は `new-system.html` の完全コピー×2ミラー（`outputs/evaluation_criteria/` と同 `public/`）。**new-system.html更新時は my/5枚×2ミラーへの同期コピー必須**
- 制度内容: プール式ボーナス（営業マーケ合同・半期実チーム粗利×15%・ガードなし・ランクウェイトR1 0.8〜R5 1.6）／BPOは原価率40%以下で月給1ヶ月（固定残業0円確定）／個人昇降格は役割配分方式（正本: `outputs/new-evaluation/PERSONAL-EVAL.md`、決定ログ: 同`SPEC.md`）

### slack-let（Vercelプロジェクト `slack-let`・kix1）
- **広告費のクライアント別直課**: MF補助科目「クライアント広告費」を、Meta API消化額＋Notion「広告費配賦台帳」の**月次合算比率で自動按分**（lib/eval-contribution.js。合計は必ずMF計上額と一致・実績なし月はプール一括控除に縮退）。「マーケティング関連外注」はプール原資から控除（個別振り分けは未実装・台帳待ち）
- **Meta API**: 5アカウント登録済み（アルファガード866751242929526／JUNKI 1269785775233286／八百一1532913418481528／弘陽電設1449325797210992／小川工業2162203467975184）。トークンは`META_ACCESS_TOKEN`（Vercel env・システムユーザー adsystem20260910・アプリ eijiyoshikawa.2026dev・ads_read）
- **月次PL**: 分類はMF正式分類（/accounts）ベースに置換済み（lib/mf-reports.js loadClassifier）。**毎月5日=速報・20日=確報**の2本配信（api/cron/monthly-pl.js・JST15日以降は確報ラベル）。8/1速報ズレの真因は月末後の仕訳入力（403件中310件）で、分類は無罪と確定済み
- タスク通知: 毎朝8:30 個人DM＋#sakubuzz_task（C0BV54LUQS3）まとめ、期日変更は毎時
- 診断: `/api/mf/pl-diag?month=YYYY-MM&token=` ／ アラートセンター `/api/financial/alerts`（広告費突合含む）

## 2. 未完了タスク一覧（次セッションの引き継ぎ）

### すぐ動ける（ユーザー回答待ち → 回答が来たらNotion登録）
1. **JUNKI建設・小川工業の「担当者」「MF取引先名」** — 担当マッピングDBに行は作成済みだが空欄。売上名寄せと個人計上に必要
2. **求人ボックス9月分の確定額更新** — 台帳に暫定¥2,000×2件（JUNKI・アルファガード）。月末に請求確定後スクショをもらい更新（備考に暫定と記載済み）
3. **TikTok月次運用** — 毎月「By month付きxlsx」をもらい配賦台帳に差分登録（2026-02〜09の16行は登録済み）。求人ボックス/Airworkは請求スクショで随時（Airworkの**LET自社採用分は台帳対象外**＝自社経費）
4. **自社採用広告のMF仕訳確認** — 補助科目「クライアント広告費」に自社分を混ぜない運用の徹底（混ざるとボーナス原資が過小に）

### 期限あり
5. **Metaトークン再生成** — 60日発行の場合、**2026年11月上旬に期限切れ**。切れるとアラートセンターに「Invalid OAuth」エラーが出る。再生成→`npx vercel env rm/add META_ACCESS_TOKEN production`→`npx vercel --prod`
6. **T-MF-003のクローズ** — 確報cron追加のデプロイ確認後、NotionタスクT-MF-003を「完了」に

### 制度の本実装（情報が揃い次第）
7. **個人評価の正式判定** — 担当マッピングDBの「フェーズ」「担当割合」列（追加済み・未入力）＋各人のG目標設定後、役割配分×担当割合の自動集計と個人ゲージの正式化を実装（現在は旧基準の参考表示）
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
- リモートセッションからのmain反映手順: branchへcommit/push → `git checkout -B main origin/main && git merge --no-ff origin/claude/evaluation-finance-dashboard-d0u7iz && git push origin main`（ユーザー承認済みの定型運用）
