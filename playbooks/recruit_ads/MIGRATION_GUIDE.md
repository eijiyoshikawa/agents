# 新規リポジトリへの移行ガイド

> `playbooks/recruit_ads/` を独立リポジトリとして切り出すための完全手順書。
> 所要時間: 15-30分

## 移行の方針

3つのパターンから選択:

| パターン | 説明 | 推奨ケース |
|---|---|---|
| **A. 標準コピー** | playbooks/recruit_ads + 必要参照を新リポへコピー | **本ケース推奨**（完全独立） |
| **B. サブモジュール** | git submodule で参照のみ | 元リポと同期したい場合 |
| **C. モノレポ分割** | git filter-branch で履歴ごと分離 | 過去履歴を保持したい場合 |

以下、パターン A の詳細手順。

## ステップ0: 新リポジトリ名の決定

推奨候補:
- `let-recruit-ads` (LET 専用前提)
- `recruit-ads-playbook` (汎用プレイブックとして展開する場合)

以下は `let-recruit-ads` 想定で記述。

## ステップ1: 自動移行スクリプトの実行

`playbooks/recruit_ads/migrate_to_standalone.sh` を実行:

```bash
cd ~/agents

# 移行先パスを引数に指定
bash playbooks/recruit_ads/migrate_to_standalone.sh ~/let-recruit-ads

# 完了確認
ls ~/let-recruit-ads
```

スクリプトが以下を実行:
1. `~/let-recruit-ads/` ディレクトリ作成
2. `playbooks/recruit_ads/` 配下をコピー
3. `learnings/instincts/recruit_ads.json` をコピー
4. `design-md/feer/` `design-md/motion-library/` をコピー（参照用）
5. `STANDALONE_CLAUDE.md` を `CLAUDE.md` としてコピー
6. `STANDALONE_README.md` を `README.md` としてコピー
7. `.gitignore` を初期化
8. `git init` 実行

## ステップ2: 手動チェック・調整

```bash
cd ~/let-recruit-ads

# 構造確認
tree -L 3 -I 'node_modules|.git'
```

期待される構造:
```
let-recruit-ads/
├── README.md
├── CLAUDE.md
├── HANDOFF.md
├── MIGRATION_GUIDE.md
├── .gitignore
├── docs/
│   ├── 00_strategy/
│   ├── 01_platforms/
│   ├── 02_creative/
│   ├── 03_targeting/
│   ├── 04_measurement/
│   ├── 07_runbook/
│   └── 08_intake/
├── experiments/
│   ├── register.csv
│   ├── template.md
│   └── logs/
│       ├── EXP-20260525-001.md
│       ├── EXP-20260525-002.md
│       └── EXP-20260525-003.md
├── formulas/
├── clients/
│   └── let/
├── learnings/
│   └── instincts/
│       └── recruit_ads.json
└── design-references/
    ├── feer/
    └── motion-library/
```

## ステップ3: 内部リンクの修正

新リポジトリ内のドキュメントは旧リポジトリのパスを参照しているため、書き換えが必要:

```bash
# パス書き換え（macOS BSD sed）
cd ~/let-recruit-ads

# `playbooks/recruit_ads/` を `` (削除) に
find . -name "*.md" -type f -exec sed -i '' 's|playbooks/recruit_ads/||g' {} +

# `05_experiments/experiments/` を `experiments/logs/` に
find . -name "*.md" -type f -exec sed -i '' 's|05_experiments/experiments/|experiments/logs/|g' {} +
find . -name "*.md" -type f -exec sed -i '' 's|05_experiments|experiments|g' {} +

# `06_formulas/formulas/` を `formulas/` に
find . -name "*.md" -type f -exec sed -i '' 's|06_formulas/formulas/|formulas/|g' {} +
find . -name "*.md" -type f -exec sed -i '' 's|06_formulas|formulas|g' {} +

# /design-md/ を /design-references/ に
find . -name "*.md" -type f -exec sed -i '' 's|/design-md/|/design-references/|g' {} +
find . -name "*.md" -type f -exec sed -i '' 's|design-md/|design-references/|g' {} +

# `00_strategy` `01_platforms` 等の prefix を `docs/` に
find . -name "*.md" -type f -exec sed -i '' 's|/00_strategy/|/docs/00_strategy/|g' {} +
find . -name "*.md" -type f -exec sed -i '' 's|/01_platforms/|/docs/01_platforms/|g' {} +
find . -name "*.md" -type f -exec sed -i '' 's|/02_creative/|/docs/02_creative/|g' {} +
find . -name "*.md" -type f -exec sed -i '' 's|/03_targeting/|/docs/03_targeting/|g' {} +
find . -name "*.md" -type f -exec sed -i '' 's|/04_measurement/|/docs/04_measurement/|g' {} +
find . -name "*.md" -type f -exec sed -i '' 's|/07_runbook/|/docs/07_runbook/|g' {} +
find . -name "*.md" -type f -exec sed -i '' 's|/08_intake/|/docs/08_intake/|g' {} +
```

Linux GNU sed の場合は `sed -i ''` を `sed -i` に置換。

## ステップ4: 初回コミット

```bash
cd ~/let-recruit-ads

git add .
git commit -m "init: import recruit_ads playbook as standalone repo

ベース: eijiyoshikawa/agents @ claude/optimistic-faraday-RKPlx (2026-05-25)
内容: 採用広告プレイブック + LET 自社採用 (法人セールス) Sprint 1 準備一式"
```

## ステップ5: GitHub リポジトリ作成・push

```bash
# GitHub CLI でリポジトリ作成（gh auth login 済の前提）
gh repo create eijiyoshikawa/let-recruit-ads --private --source=. --remote=origin --push

# または手動
# 1. https://github.com/new でリポジトリ作成
# 2. リモート追加
git remote add origin https://github.com/eijiyoshikawa/let-recruit-ads.git
git branch -M main
git push -u origin main
```

## ステップ6: 検証

新リポジトリで以下を確認:

- [ ] `README.md` が表示される
- [ ] `HANDOFF.md` が読める
- [ ] ディレクトリ構造が想定通り
- [ ] 内部リンクが切れていない（適当に2-3個クリック確認）
- [ ] `clients/let/data/lps/lp-a.html` `lp-b.html` がある
- [ ] `learnings/instincts/recruit_ads.json` がある
- [ ] `experiments/register.csv` がある（3行のEXP）

## ステップ7: 旧リポジトリの該当箇所のクリーンアップ（任意）

新リポジトリ側で運用が安定したら、旧 `agents` リポジトリの `playbooks/recruit_ads/` を削除する判断:

```bash
# 旧リポジトリ側で
cd ~/agents

git rm -rf playbooks/recruit_ads/
# CLAUDE.md の関連記述（採用広告プレイブック / 事業領域）も整理
git commit -m "chore: move recruit_ads playbook to standalone repo eijiyoshikawa/let-recruit-ads"
git push
```

ただし、**最初の数スプリントは旧リポジトリも残しておく**（参照用）ことを推奨。

## ステップ8: Claude を新リポジトリで起動

```bash
cd ~/let-recruit-ads
claude
```

最初の発話:
```
このリポジトリは HANDOFF.md を読んでください。
これまでの経緯と現在の状態が全部書いてあります。
本日の作業は __________ から始めたいです。
```

Claude が HANDOFF.md → intake.md → 関連戦略文書を順に読んで状況把握。

## トラブルシューティング

### Q. 内部リンクが大量に切れた
A. ステップ3の sed コマンドが特定パスを取りこぼした可能性。エディタの「全文検索」で旧パス文字列（`playbooks/recruit_ads`等）を検索して残骸を駆逐。

### Q. LP HTML が大きすぎてリポジトリが重い
A. `lp-a.html` `lp-b.html` (合計 270KB) は許容範囲。これ以上素材を増やす場合は `.gitignore` で `clients/let/assets/*.{mp4,mov,jpg,png}` を除外し、Drive / S3 連携を検討。

### Q. CRMやAPIキーをコミットしてしまった
A. すぐ rotate（無効化）して、`git filter-branch` で履歴削除。詳細は GitHub の Secret Scanning ドキュメント参照。

### Q. 古い Claude セッションのコンテキストが残っていない
A. HANDOFF.md と clients/let/intake.md だけで全文脈は復元可能。HANDOFF.md を更新し続ける限り、Claude セッションを再起動しても問題なし。

## 移行後の運用

新リポジトリで以下を運用:

1. **HANDOFF.md を毎スプリント末に更新**（プロジェクト経緯セクションに追記）
2. **intake.md の進捗ログを更新**
3. **experiments/register.csv に新EXP追加**
4. **learnings/instincts/recruit_ads.json を月次レビュー**

Claude セッションを跨いだ継続性は HANDOFF.md がすべて担保する。
