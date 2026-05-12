# Project: Franchise Order Management (atomdenki)

## クライアント
**株式会社アトム電機** 様　（1社専用・マルチテナント・パッケージ販売はスコープ外）

## 概要
アトム電機本部 (約900加盟店) における **FC加盟店→本部受注** と **本部→メーカー発注/配送** の二重システムを統合し、BO 30名の人件費とレガシー保守費 (月 ¥165,000) を同時に削減する。

- 対象コードベース: [`let-incjp/atomdenki`](https://github.com/let-incjp/atomdenki) (同名ブランチ)
- 提案公開URL: [https://atomdenki.vercel.app](https://atomdenki.vercel.app)
- 主目標: BO 30名 → 5名相当（▲83%） / レガシー保守費 ▲90%
- 期間: 12ヶ月（Phase 0 〜 全店展開・レガシー停止）
- 提案金額: 月額 ¥800,000 (税別) × 12ヶ月 = 年間 ¥9,600,000 (税別)

## 期待されるネット効果 (年間)

| 項目 | 金額 |
|---|---|
| BO人件費削減（30名×300万円 → 5名×300万円） | ▲¥75,000,000 |
| システム維持費削減（¥165k/月 → ¥17k/月） | ▲¥1,780,000 |
| 本提案 契約料 | +¥9,600,000 |
| **年間ネット効果** | **約 +¥67,180,000** |

## スコープ

### 含む
- 統合データモデル / Order Aggregate 設計
- 3アプリ (加盟店ポータル / 本部スタッフ / メーカーポータル) のUI実装
- メーカー送信 (FAX/EMAIL/EDI) 自動化
- 人件費削減ダッシュボード
- 全店本番切替・レガシー停止支援

### 含まない
- POSレジ連携
- 会計システム直接連携 (CSVエクスポートで代替)
- 多言語化
- **他社向けSaaS化・package販売・マルチテナント設計**

## チーム編成
[`TEAM.md`](./TEAM.md) 参照。

## 関連リンク
- 業務改善提案書（HTML / 公開URL）: [https://atomdenki.vercel.app](https://atomdenki.vercel.app)
- 業務改善提案書（Markdown）: [`atomdenki/docs/proposal/2026-05-12_business_improvement_proposal.md`](https://github.com/let-incjp/atomdenki/blob/claude/franchise-order-management-TflKF/docs/proposal/2026-05-12_business_improvement_proposal.md)
- データモデル: [`atomdenki/docs/04_data_model.md`](https://github.com/let-incjp/atomdenki/blob/claude/franchise-order-management-TflKF/docs/04_data_model.md)
- コスト削減 KPI: [`atomdenki/docs/07_cost_reduction_kpi.md`](https://github.com/let-incjp/atomdenki/blob/claude/franchise-order-management-TflKF/docs/07_cost_reduction_kpi.md)
