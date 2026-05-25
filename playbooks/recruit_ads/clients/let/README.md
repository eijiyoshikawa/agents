# 株式会社LET 自社採用広告プロジェクト

`playbooks/recruit_ads/` の枠組みを使った最初の本番案件。自社求人を題材に方程式化のサイクルを回す。

## ディレクトリ構成

```
clients/let/
├── README.md         このファイル
├── intake.md         案件オンボーディング（最初に埋める）
├── data/             受領データ置き場
│   ├── job_descriptions/   募集要項
│   ├── brand/              会社概要・ブランドガイド
│   ├── past_ads/           過去広告データ
│   ├── employees/          採用済社員（PIIマスク済）
│   ├── interviews/         社員ヒアリング録
│   └── competitors/        競合分析
├── assets/           素材（小サイズのみ、動画はDrive）
└── output/           生成物（戦略案・実験ログ・CRTVスクリプト等）
```

## 担当エージェント（このプロジェクト）

- **PM**: Project Manager
- **戦略**: Marketing
- **媒体運用**: Ad Operations
- **クリエイティブ**: Content Creator
- **LP・実装**: Engineer / Designer
- **データ**: Data Analyst
- **法務**: Legal
- **批判検証**: Devil's Advocate
- **品質**: QA Reviewer

## 状態（2026-05-25）

- [x] プロジェクト枠組み作成
- [ ] intake.md 記入（職種・エリア・予算等の基本情報待ち）
- [ ] 既存データ受領（`08_intake/data_sharing_guide.md` 参照）
- [ ] 媒体アカウント整備
- [ ] LP方針決定
- [ ] 計測タグ設置
- [ ] Phase 1 探索開始

## 次のステップ

1. `intake.md` のセクション 1-3（ビジネスサマリ / 採用ニーズ / 目標KPI）を埋める
2. 既存資産チェック（intake セクション 5）に基づき、ある分を `data/` に配置
3. 不足分の代替案を Marketing が提示
4. 初動アクション D1-D14 のスケジュール確定
