# LET 評価制度ドキュメント（let-hyoka）【旧評価シート・保管】

> ⚠️ **【2026-08-25 決定】このディレクトリ配下の評価シート一式（v1.4系 + マーケv2.0）は「旧評価シート」として保管扱い。**
> 新評価シートは別途作成する（このディレクトリには追加しない・両者を混同しないこと）。
> 公開URL（let-hyoka.vercel.app）は新シートへの移行が完了するまで現状のまま稼働を続ける。
> 旧シートへの変更は、稼働維持に必要な修正（バグ・データ更新・セキュリティ）のみとする。
> 📌 **【2026-08-30 追記】新評価制度の告知を本サイトに追加（役員指示）。**
> `/new-system`（new-system.html）= 新評価制度の制度説明ページ（2026-10-01施行予定・4種いずれのパスワードでも閲覧可）を新規作成し、
> 全8ページ（index/sales/marketing/bpo/marketing-v2/demo×3）の main-content 直後に告知バナー `#new-system-banner` を注入した。
> 旧シート本体のロジック・実績表示には手を入れていない（保管方針は維持）。新制度の実データ連動（2本ゲージ）は別途実装（GO済み・slack-let側の役割売上集計から着手）。

株式会社LET 3部門の評価制度を静的HTMLで公開・運用するプロジェクト。
**経営陣用**（パスワードなし）と**従業員用・新制度**（パスワード保護）の2系統。

> 🔰 **新セッションでの作業開始前に必ず [`HANDOVER.md`](./HANDOVER.md) を読むこと**（デプロイ構成の注意点・進行中タスクを記載）

## ファイル構成

```
outputs/evaluation_criteria/          ← Vercel「agents」プロジェクトのRoot Directory（ここが配信される）
├── index.html          # 経営陣用 部門選択トップ
├── sales.html          # 経営陣用 営業部 v1.4
├── marketing.html      # 経営陣用 マーケ部 v1.4（v2.0誘導バナーあり）
├── bpo.html            # 経営陣用 BPO・不動産事業部
├── demo/               # 従業員用（パスワード保護・相互ナビなし・P&L非表示）
│   ├── sales.html
│   ├── marketing.html
│   └── bpo.html
├── marketing/
│   └── v2.html         # マーケ評価制度 v2.0（チーム評価版）※v2.1改定進行中
├── assets/
│   └── eval-section.js # リアルタイム実績セクション（暗号化データの復号+描画）
├── data/               # 暗号化済み実績データ（bake-eval-data.mjs が生成）
├── scripts/
│   ├── bake-eval-data.mjs      # slack-let→暗号化焼き付け（要CRON_SECRET）
│   └── inject-eval-section.js  # 実績セクションのページ注入（冪等）
├── public/             # 事故時保険のミラー（配信の本体ではない）
├── vercel.json         # クリーンURL・rewrites・セキュリティヘッダ
├── HANDOVER.md         # 引き継ぎ文書（デプロイ構成・進行中タスク）
├── MARKETING_DATA_AUDIT.md  # マーケ実績データの出所・精度の記録／不明項目の回収状況
└── README.md           # 本ファイル
```

## 公開URL・パスワード

### 経営陣用（パスワード保護・4ページ共通解錠）

| URL | 入り方 | 内容 |
|-----|-------|-----|
| `https://hyoka.let-inc.net/` | 経営ハブの共通ログイン（役員） | 部門選択トップ |
| `https://hyoka.let-inc.net/sales` | 同上 | 営業部 |
| `https://hyoka.let-inc.net/marketing` | 同上 | マーケ部（上下にv2.0誘導バナー）|
| `https://hyoka.let-inc.net/bpo` | 同上 | BPO・不動産事業部 |
| `https://let-hyoka.vercel.app/…` | 経営陣パスワード（従来どおり） | 上記と同じ内容 |

- 経営陣パスワードは担当者管理（Vercel `agents` プロジェクトの環境変数 `HYOKA_EXEC_PASSWORD` と同じ値。このリポジトリには書かない）
- 2026-08-08 に保護追加（従来はパスワード無し）。sessionStorage キーは4ページ共通 `let_auth_exec`
- 2026-10-20 経営ハブの共通ログイン対応（`middleware.js`。詳細は下記「共通ログイン」）

### 従業員用・新制度（パスワード保護）

| URL | パスワード | 配布先 |
|-----|-----------|--------|
| `/demo/sales` | 営業部用（担当者管理） | 営業部メンバー |
| `/demo/marketing` | マーケ部用（担当者管理） | マーケ部メンバー |
| `/demo/bpo` | BPO用（担当者管理） | BPO・不動産メンバー |
| `/marketing/v2` | マーケ部用、または経営陣パスワード | マーケ部（新制度 v2.0）|

- 認証はSHA-256ハッシュ + sessionStorage（ブラウザを閉じると再ログイン）。平文パスワードはリポジトリに書かない
- パスワード変更手順: 新パスワードを `printf '%s' "新PW" | sha256sum` でハッシュ化し、該当HTMLの `PASS_HASH` / `DEPT_HASH` / `EXEC_HASH` 定数を差し替え（経営陣パスワードを変えたら `HYOKA_EXEC_PASSWORD` も更新）

### 共通ログイン（経営ハブ / 2026-10-20）

- `middleware.js`（Vercel Edge Middleware）が `hyoka.let-inc.net` で `let_hub` Cookie を検証する。未ログインは `hub.let-inc.net/login` へ
- 見られる範囲は 4 段階。ハブのメンバー管理「ログインできるサイト」で選ぶ（2026-10-23）:

  | ハブのチェック（key） | 見られるページ |
  |---|---|
  | 評価制度サイト（役員・全部門）`hyoka` | すべて。経営陣ページ `/` `/sales` `/marketing` `/bpo`（経営側P&Lを含む）＋全部門の従業員ページ |
  | 評価制度サイト（マーケティング）`hyoka_marketing` | `/demo/marketing` `/manual/marketing` `/marketing/v2` ＋ 共通ページ |
  | 評価制度サイト（セールス）`hyoka_sales` | `/demo/sales` `/manual/sales` ＋ 共通ページ |
  | 評価制度サイト（不動産BPO）`hyoka_bpo` | `/demo/bpo` `/manual/bpo` ＋ 共通ページ |

  共通ページ = `/new-system` `/manual` `/my/*`。他部門のページ・経営陣ページを開くと 403。トップ `/` は役員以外には部門の入口を案内（1 部門だけならそこへ転送）。
  サイトを個別に選んでいないメンバー（「すべてのサイト」）は従来どおり: 役員は全部、それ以外は従業員ページ全部門
- 解錠: 役員には `HYOKA_EXEC_PASSWORD`、部門ページにはその部門の `HYOKA_PASSWORD_SALES` / `HYOKA_PASSWORD_MARKETING` / `HYOKA_PASSWORD_BPO`（任意）を解錠用 Cookie（`let_hyoka_unlock`）で渡し、`assets/hub-unlock.js` がページのパスワード入力を自動で済ませる（実績データの暗号化はパスワードのまま）。部門のパスワードを環境変数に入れなければ、従来どおり各ページでパスワードを入力する
- `*.vercel.app` では middleware は何もしない（従来どおり）。`HYOKA_PROTECT=1` で検証用に強制できる
- 必要な環境変数（Vercel `agents` プロジェクト）: `HUB_SESSION_SECRET`（ハブと同じ値）・`HUB_URL`・`HYOKA_EXEC_PASSWORD`・任意で `HYOKA_PASSWORD_SALES` / `HYOKA_PASSWORD_MARKETING` / `HYOKA_PASSWORD_BPO`
- 検証: `node outputs/evaluation_criteria/scripts/test-middleware.mjs`

## デプロイ構成（詳細は HANDOVER.md）

- **リポジトリ**: `eijiyoshikawa/agents`
- **作業ブランチ**: `claude/evaluation-finance-dashboard-50w8t9`（旧 `claude/evaluation-criteria-framework-mkp6W` をマージ済み）
- **デプロイブランチ**: `let-hyoka`（pushで自動デプロイ）
- **Vercel「agents」プロジェクト**: Root Directory = `outputs/evaluation_criteria` / Framework = Other / Build・Output・Install Override 全てOFF
- ⚠️ 別プロジェクト「let-hyoka」（let-recruit求人アプリ・Root=let-recruit）とは**無関係。触らない**
- ⚠️ mainブランチのデプロイは常に失敗する（`outputs/evaluation_criteria` が無いため）— 仕様であり無害

## 制度の現状サマリ

| 部門 | バージョン | ボーナス式 |
|------|-----------|-----------|
| 営業 | v1.4 | 基準額(月給×1ヶ月) × 個人達成率 × チーム係数（6段階）|
| マーケ | v1.4 ＋ v2.0公開中（v2.1改定進行中）| v1.4: ×継続率係数あり ／ v2.0: チーム一律（基本給×1ヶ月 × チーム達成率 × 定着率）|
| BPO・不動産 | v1.4拡張 | 基準額 × 個人達成率のみ（チーム評価なし）＋ 外注費40%以下の年次特別ボーナス |

チーム係数（営業・マーケv1.4共通）: 120%+=×1.10 / 100-119=×1.00 / 80-99=×0.90 / 70-79=×0.80 / 60-69=×0.70 / 60%未満=×0.60

## バージョン履歴

- **Ver 1.0** / 2026-04-22 — 営業部・マーケ部 初版
- **Ver 1.1** / 2026-04-22 — BPO・不動産事業部追加（年次特別ボーナス）
- **Ver 1.2** / 2026-04-26 — パスワード認証ゲート追加
- **Ver 1.3** / 2026-04-27 — 従業員用 `/demo/*` 新設・四半期目標表追加・経営側P&L（経営陣のみ）
- **Ver 1.4** / 2026-04-28 — チーム係数6段階化・マーケ実質粗利化＋継続率係数・BPOチーム評価廃止・ボーナス月給×1ヶ月化・マーケG1粗利150万
- **Ver 2.0** / 2026-07-21 — マーケ `/marketing/v2` 新設（チーム評価版・M1〜M4等級）
- **2026-07-21** — Vercelビルド事故復旧（Root Directory復元・public/ミラー追加）
- **2026-07-27** — v2.1（コミット型主軸）レビュー完了・Notion役員会議ページに懸念点追記（7項目の決定待ち）

## 議事録・関連Notionページ

- 第9期役員会議 2026-04-22（制度の原点）: `34ac57ee1f60802da2a0c8bce04585e7`
- 役員会議 2026-04-28 lunch（実質粗利・コミッション検討）: `350c57ee1f6080849349fe1da380f083`
- 定性評価チェックリスト20問: `34fc57ee1f60813b8668d660fb3ba4db`
- 2026/07/27 役員会議アジェンダ（v2.1レビュー追記済み）: `23e4a4d1b8424a9b9bfd999376fce672`
