# Project: Franchise Order Management (atomdenki)

## 概要
家電フランチャイズ本部 (約900加盟店) における **FC加盟店→本部受注** と **本部→メーカー発注/配送** の二重システムを統合し、BO 40名超の人件費を削減する。

- 対象コードベース: [`let-incjp/atomdenki`](https://github.com/let-incjp/atomdenki) (同名ブランチ)
- 主目標: BO手動工数 ≤1,400h/週 → ≤180h/週 (×87%)
- 期間: 本キックオフから約 16週（Phase 0 〜 Phase 5）

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

## チーム編成

[`TEAM.md`](./TEAM.md) 参照。

## 関連リンク
- ビジネス要件: [`atomdenki/docs/01_business_requirements.md`](https://github.com/let-incjp/atomdenki/blob/claude/franchise-order-management-TflKF/docs/01_business_requirements.md)
- 現状分析: [`atomdenki/docs/02_current_system_analysis.md`](https://github.com/let-incjp/atomdenki/blob/claude/franchise-order-management-TflKF/docs/02_current_system_analysis.md)
- アーキテクチャ: [`atomdenki/docs/03_target_architecture.md`](https://github.com/let-incjp/atomdenki/blob/claude/franchise-order-management-TflKF/docs/03_target_architecture.md)
- データモデル: [`atomdenki/docs/04_data_model.md`](https://github.com/let-incjp/atomdenki/blob/claude/franchise-order-management-TflKF/docs/04_data_model.md)
- リリース計画: [`atomdenki/docs/06_phased_rollout.md`](https://github.com/let-incjp/atomdenki/blob/claude/franchise-order-management-TflKF/docs/06_phased_rollout.md)
