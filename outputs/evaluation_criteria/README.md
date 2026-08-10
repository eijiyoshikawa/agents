# LET 評価制度ドキュメント（let-hyoka）

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

| URL | パスワード | 内容 |
|-----|-----------|-----|
| `https://let-hyoka.vercel.app/` | `letyakuin2026` | 部門選択トップ |
| `https://let-hyoka.vercel.app/sales` | 同上 | 営業部 |
| `https://let-hyoka.vercel.app/marketing` | 同上 | マーケ部（上下にv2.0誘導バナー）|
| `https://let-hyoka.vercel.app/bpo` | 同上 | BPO・不動産事業部 |

2026-08-08 に保護追加（従来はパスワード無し）。sessionStorage キーは4ページ共通 `let_auth_exec`。

### 従業員用・新制度（パスワード保護）

| URL | パスワード | 配布先 |
|-----|-----------|--------|
| `/demo/sales` | `saleslet1117` | 営業部メンバー |
| `/demo/marketing` | `makematsu2026` | マーケ部メンバー |
| `/demo/bpo` | `sawaletinc2026` | BPO・不動産メンバー |
| `/marketing/v2` | `makematsu2026` | マーケ部（新制度 v2.0）|

- 認証はSHA-256ハッシュ + sessionStorage（ブラウザを閉じると再ログイン）
- パスワード変更手順: 新パスワードを `printf '%s' "新PW" | sha256sum` でハッシュ化し、該当HTMLの `PASS_HASH` 定数を差し替え

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
