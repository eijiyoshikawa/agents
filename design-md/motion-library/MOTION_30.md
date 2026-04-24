# WEBコンテンツ・モーション 30選

> **目的**: Web制作・システム開発時のモーション演出リファレンス。デザイン段階から実装段階まで、一貫した語彙で演出を指定・再現できるようにする。
>
> **適用範囲**: LP / コーポレートサイト / サービスサイト / ダッシュボード / 採用ページ など全Web成果物
>
> **参照エージェント**: Designer / UI/UX Designer / Engineer / Frontend Engineer / Web Builder（motion_analyzer / builder）
>
> **運用原則**:
> - モーションを追加・変更する際は、まず本ドキュメントから該当する motion_key を選ぶ
> - 該当するものがなければ本ドキュメントに新規追加してから実装（勝手に実装しない）
> - すべてのモーションは `prefers-reduced-motion: reduce` に対応し、ユーザー設定を尊重する
> - ページ内に同時発火する重いモーションは 2 つまで（パフォーマンス確保）

## 使い方

### デザイン段階（Designer / UI/UX Designer）
デザイン指示書に `motion_key: circle-reveal` のように記載する。

### 実装段階（Engineer / Frontend Engineer / Web Builder builder）
`motion_key` を元に本ドキュメントの「推奨実装」「サンプル」セクションを参照する。

### 解析段階（Web Builder motion_analyzer）
参考サイトで検出したモーションを、最も近い `motion_key` にマッピングして出力する。

## カテゴリ索引

1. [ナビゲーション・遷移系](#1-ナビゲーション遷移系)（6）
2. [テキスト・タイポグラフィ系](#2-テキストタイポグラフィ系)（6）
3. [インタラクション系](#3-インタラクションホバークリック系)（6）
4. [スクロール・背景系](#4-スクロール背景系)（6）
5. [ベンチャー・先進性特化系](#5-ベンチャー先進性特化系)（6）

## アクセシビリティ共通ルール

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

すべてのモーション実装は上記グローバル CSS を前提とする。加えて、モーションに依存して情報を伝える演出（例: タイピング・エフェクト）は、reduced-motion 環境では **即時表示** にフォールバックする。

---

## 1. ナビゲーション・遷移系

<!-- MOTIONS_SECTION_1 -->

## 2. テキスト・タイポグラフィ系

<!-- MOTIONS_SECTION_2 -->

## 3. インタラクション（ホバー・クリック）系

<!-- MOTIONS_SECTION_3 -->

## 4. スクロール・背景系

<!-- MOTIONS_SECTION_4 -->

## 5. ベンチャー・先進性特化系

<!-- MOTIONS_SECTION_5 -->

---

## 改訂履歴

| 日付 | 改訂内容 | 担当 |
|------|---------|------|
| 2026-04-24 | 初版作成（30モーション収録） | Claude Code |
