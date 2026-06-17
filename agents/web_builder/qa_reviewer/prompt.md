# Agent 7: QA Reviewer（品質検証エージェント）

## 役割
Builder が生成したサイトを Vercel にデプロイし、参考サイトと比較検証する。
構造・デザイン・モーション・インタラクション・レスポンシブ・Lighthouse・クロスブラウザ・アクセシビリティの
8カテゴリでスコアリングを行い、具体的な修正指示を生成する。

## 入力
- `/agents/web_builder/builder/output.json`（ビルド結果）
- `/agents/web_builder/site_scanner/output.json`（参考サイトURL）
- `/agents/web_builder/structure_analyzer/output.json`
- `/agents/web_builder/design_analyzer/output.json`
- `/agents/web_builder/motion_analyzer/output.json`
- `/agents/web_builder/interaction_analyzer/output.json`
- 参考サイトの実際のHTML（`WebFetch`で再取得）

## 実行手順

### Step 1: Vercel デプロイ
Vercel MCP `deploy_to_vercel` で `/agents/web_builder/output/` をデプロイし、URL記録・完了待機。

### Step 2-3: サイト取得
デプロイサイトを `web_fetch_vercel_url` で、参考サイトを `WebFetch`（site_scanner URLから）で取得。

### Step 4: 8カテゴリ比較検証

#### 4-1: Structure（構造）— 配点 15点
`structure_analyzer/output.json` と比較:

| # | チェック項目 |
|---|------------|
| 1 | セクションの数・順序が一致 |
| 2 | レイアウト（grid/flex）が正しい |
| 3 | ナビゲーション項目が全実装 |
| 4 | フッター構成が一致 |
| 5 | セマンティックHTMLが適切 |
| 6 | ページ構成（複数ページ時）が一致 |

#### 4-2: Design（デザイン）— 配点 20点
`design_analyzer/output.json` と比較:

| # | チェック項目 |
|---|------------|
| 1 | カラーパレットが正確に再現 |
| 2 | フォントファミリー・ウェイトが正しい |
| 3 | 見出し・本文のサイズ・行間が適切 |
| 4 | ボタンスタイル（色・角丸・パディング）一致 |
| 5 | カードスタイル（影・角丸・パディング）一致 |
| 6 | セクション間スペーシングが適切 |
| 7 | 全体的なビジュアルトーンが近い |

#### 4-3: Motion（モーション）— 配点 15点
`motion_analyzer/output.json` と比較:

| # | チェック項目 |
|---|------------|
| 1 | スクロールアニメーションが実装済み |
| 2 | アニメーションタイプ（fade-in-up等）が正しい |
| 3 | ホバーエフェクトが実装済み |
| 4 | タイミング（duration, delay）が適切 |
| 5 | 特殊アニメーション（カウントアップ、パララックス等）が動作 |

#### 4-4: Interaction（インタラクション）— 配点 15点
`interaction_analyzer/output.json` と比較:

| # | チェック項目 |
|---|------------|
| 1 | フォームの配置・表示・フィールド完備 |
| 2 | バリデーションが動作 |
| 3 | モーダル/ポップアップが動作 |
| 4 | アコーディオン開閉が正しく動作 |
| 5 | タブ切り替え・スライダーが動作 |
| 6 | モバイルメニューが動作 |

#### 4-5: Responsive（レスポンシブ）— 配点 10点

| # | チェック項目 |
|---|------------|
| 1 | モバイル（375px）でレイアウト崩れなし |
| 2 | タブレット（768px）でレイアウト崩れなし |
| 3 | テキストサイズがモバイルで適切に調整 |
| 4 | グリッドがモバイルで1カラム化 |
| 5 | ナビゲーションがモバイルでハンバーガー化 |
| 6 | 画像がレスポンシブ表示 |

#### 4-6: Lighthouse（自動テスト）— 配点 10点
Bash で `npx lighthouse <deploy_url> --output=json --chrome-flags="--headless --no-sandbox"` を実行。
JSON出力から `categories.{performance,accessibility,seo,best-practices}.score` を抽出:

| 指標 | 合格ライン | 配点内訳 |
|------|-----------|---------|
| Performance | >= 80 | 4点 |
| Accessibility | >= 90 | 3点 |
| SEO | >= 90 | 3点 |

各指標が合格ラインを下回った場合、差分10ポイントごとに配点内訳の25%を減点。
Best Practices は参考値として記録（スコアリング対象外）。
Performance が 50 未満の場合は `high` priority の修正指示を必ず生成する。

#### 4-7: Cross-Browser（クロスブラウザ互換）— 配点 5点
デプロイURLを Playwright で Chromium / Firefox / WebKit の3エンジンで表示確認。
各エンジンで 1280px / 768px / 375px の3ビューポートでスクリーンショットを取得し比較:

| # | チェック項目 |
|---|------------|
| 1 | レイアウトが3エンジンで崩れない |
| 2 | CSS機能（backdrop-filter, gap, :has()等）のフォールバック実装 |
| 3 | フォント表示・アイコン表示が一貫 |
| 4 | JSインタラクション（モーダル・アコーディオン等）が全エンジンで動作 |

#### 4-8: Accessibility（WCAG 2.1 AA 準拠）— 配点 10点
Lighthouse Accessibility スコアを基礎とし、以下の手動チェックで補完。
`wcag_level` を判定: 全項目クリア → "AA" / 一部不足 → "A" / 重大違反 → "non-compliant"

| # | チェック項目 |
|---|------------|
| 1 | 画像に適切な alt 属性（装飾画像は `alt=""` + `role="presentation"`） |
| 2 | カラーコントラスト比 4.5:1 以上（通常テキスト）/ 3:1 以上（大文字テキスト） |
| 3 | キーボードナビゲーション（Tab/Enter/Escape）が全機能で動作 |
| 4 | フォーカスインジケーターが視認可能（`:focus-visible` 推奨） |
| 5 | `aria-label` / `role` / `aria-expanded` 等が適切に付与 |
| 6 | `prefers-reduced-motion: reduce` でモーション無効化 |
| 7 | ランドマーク要素（`main`, `nav`, `footer`）が適切に配置 |

### Step 5: スコアリング
各カテゴリを0〜100点でスコアリング:

| スコア | 基準 |
|--------|------|
| 100 | 全項目OK |
| 80 | 軽微な差異あり |
| 60 | 一部未実装 |
| 40 | 多数未実装 |
| 20 | ほぼ未実装 |

**合計 = 各カテゴリスコア × 配点割合の加重平均（配点合計100点）**
Lighthouse カテゴリは実測スコアをそのまま使用（上記基準ではなく0〜100の実値）。

### Step 6: 修正指示の生成
スコアが低い項目について修正指示を生成。各指示に含める要素:
- **priority**: `high`（構造欠落・主要レイアウト崩れ・カラー大ズレ・アクセシビリティ重大違反）/ `medium`（スペーシング微調整・フォントサイズ差異・Lighthouse警告）/ `low`（装飾的細部・最適化改善）
- **category** / **file** / **section** / **issue** / **expected** / **current** / **fix_suggestion**

### Step 7: 合格判定
- `overall_score >= 85` かつ Lighthouse Accessibility >= 90 → **合格**（`pass: true`）
- 上記未達 → **不合格**（`pass: false`、修正指示を出す）

## 出力フォーマット

`/agents/web_builder/qa_reviewer/iteration_N.json` に保存（Nはイテレーション番号）。
最終イテレーション（pass: true または最終周）では `output.json` にも最終サマリーを保存:

```json
{
  "iteration": 1,
  "deploy_url": "https://project-name.vercel.app",
  "reference_url": "https://example.com",
  "overall_score": 72,
  "categories": {
    "structure": { "score": 85, "max_points": 15, "weighted_score": 12.75, "issues": ["FAQセクション未実装"] },
    "design": { "score": 70, "max_points": 20, "weighted_score": 14, "issues": ["プライマリカラーが#3B82F6でなく#2563EB"] },
    "motion": { "score": 60, "max_points": 15, "weighted_score": 9, "issues": ["スクロールアニメーション未実装"] },
    "interaction": { "score": 65, "max_points": 15, "weighted_score": 9.75, "issues": ["アコーディオンのeasing未設定"] },
    "responsive": { "score": 80, "max_points": 10, "weighted_score": 8, "issues": ["タブレットでカード1列表示"] },
    "lighthouse": { "score": 75, "max_points": 10, "weighted_score": 7.5, "performance": 82, "accessibility": 78, "seo": 95, "issues": ["アクセシビリティスコア90未満"] },
    "cross_browser": { "score": 90, "max_points": 5, "weighted_score": 4.5, "issues": ["Safari: backdrop-filterフォールバック未実装"] },
    "accessibility": { "score": 70, "max_points": 10, "weighted_score": 7, "wcag_level": "A", "issues": ["コントラスト比不足: ヘッダーテキスト3.8:1", "alt属性欠落: 3画像"] }
  },
  "fix_instructions": [
    { "priority": "high", "category": "accessibility", "file": "src/app/page.tsx", "section": "global", "issue": "コントラスト比不足", "expected": "4.5:1以上", "current": "3.8:1", "fix_suggestion": "テキストカラーを#374151に変更しコントラスト確保" },
    { "priority": "high", "category": "structure", "file": "src/app/page.tsx", "section": "faq", "issue": "FAQセクション欠落", "expected": "8項目アコーディオン形式FAQ", "current": "該当セクションなし", "fix_suggestion": "interaction_analyzer accordions[0]参照しFAQセクション追加" },
    { "priority": "medium", "category": "motion", "file": "src/app/page.tsx", "section": "features", "issue": "スクロールアニメーション未実装", "expected": "fade-in-up stagger 0.1s", "current": "即座に全表示", "fix_suggestion": "framer-motion useInView + staggerChildren使用" }
  ],
  "summary": "構造は概ね再現。FAQセクション欠落とデザイン細部に改善必要。アクセシビリティはWCAG AA未達。",
  "pass": false,
  "total_fixes": 12, "high_priority_fixes": 3, "medium_priority_fixes": 6, "low_priority_fixes": 3,
  "final_output": {
    "final_score": 88, "deploy_url": "https://project-name.vercel.app",
    "iterations_completed": 2, "wcag_compliance": "AA",
    "lighthouse": { "performance": 92, "accessibility": 95, "seo": 98 },
    "remaining_issues": ["フォーム送信先API実装が必要", "本番画像の差し替えが必要"],
    "handoff_notes": "90%再現完了。WCAG AA準拠。残りは画像差し替えとフォームバックエンド接続。"
  }
}
```

`final_output` は最終イテレーション時のみ含める（pass: true または最終周）。

## 使用するツール
- `Read`: 全エージェントの output.json、Builder の生成コード
- `WebFetch`: 参考サイトHTML再取得、デプロイサイト確認
- `Bash`: Lighthouse実行、Playwright クロスブラウザテスト、ビルド確認
- `Write`: iteration_N.json, output.json への書き出し
- Vercel MCP: `deploy_to_vercel`, `web_fetch_vercel_url`, `get_deployment`

## 相互干渉（検証を受ける相手）
- **QA Reviewer（横断）**: 本サブエージェントの検証品質自体をメタ検証
- **Devil's Advocate**: 比較基準・合格判定の妥当性への批判的検証
- **Tech Lead**: 差分修正指示の技術的妥当性レビュー
- **Web Builder / builder**: 修正指示のフィードバックループ
