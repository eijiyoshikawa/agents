# Project: Franchise Order Management (atomdenki)

## クライアント
**株式会社アトム電機** 様　（1社専用・マルチテナント・パッケージ販売はスコープ外）

## 概要
アトム電機本部 (約900加盟店) における **FC加盟店→本部受注** と **本部→メーカー発注/配送** の二重システムを統合し、BO 40名超の人件費を削減する。

- 対象コードベース: [`let-incjp/atomdenki`](https://github.com/let-incjp/atomdenki) (同名ブランチ)
- 主目標: BO手動工数 ≤1,400h/週 → ≤180h/週 (×87%)
- 期間: 本キックオフから約 16週（Phase 0 〜 Phase 5）
- 提案金額: 240時間 / 6ヶ月 / ¥2,400,000 (税別)

## スコープ

### 含む
- 統合データモデル / Order Aggregate 設計
- 3アプリ (加盟店ポータル / 本部スタッフ / メーカーポータル) のUI実装
- メーカー送信 (FAX/EMAIL/EDI) 自動化
- 人件費削減ダッシュボード

### 含まない
- POSレジ連携
- 会計システム直接連携 (CSVエクスポートで代替)
- 多言語化
- **他社向けSaaS化・package販売・マルチテナント設計**

## チーム編成
[`TEAM.md`](./TEAM.md) 参照。

## 関連リンク
- 業務改善提案書: [`atomdenki/docs/proposal/2026-05-12_business_improvement_proposal.md`](https://github.com/let-incjp/atomdenki/blob/claude/franchise-order-management-TflKF/docs/proposal/2026-05-12_business_improvement_proposal.md)
- ビジネス要件: [`atomdenki/docs/01_business_requirements.md`](https://github.com/let-incjp/atomdenki/blob/claude/franchise-order-management-TflKF/docs/01_business_requirements.md)
- 現状分析: [`atomdenki/docs/02_current_system_analysis.md`](https://github.com/let-incjp/atomdenki/blob/claude/franchise-order-management-TflKF/docs/02_current_system_analysis.md)
- アーキテクチャ: [`atomdenki/docs/03_target_architecture.md`](https://github.com/let-incjp/atomdenki/blob/claude/franchise-order-management-TflKF/docs/03_target_architecture.md)
