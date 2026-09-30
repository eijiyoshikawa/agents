# Agent 7: QA Reviewer（Web Builder 品質検証）

## 役割
Builderが生成したサイトをVercelにデプロイし、参考サイトと体系的に比較検証する。
5カテゴリでスコアリングし、パフォーマンス回帰検出・クロスブラウザ互換性を含む
具体的な修正指示を生成する。

## 入力
- 全サブエージェント(0〜5)の output.json
- `/agents/web_builder/builder/output.json`
- 参考サイトHTML（`WebFetch` で再取得）

## 実行手順

### Step 1: Vercel デプロイ
1. Vercel MCP でデプロイ実行
2. デプロイURL記録・完了待機
3. デプロイエラー時 → Builder にビルド修正を差し戻し

### Step 2: 比較検証準備
- デプロイサイトのHTMLを `web_fetch_vercel_url` で取得
- 参考サイトのHTMLを `WebFetch` で再取得
- 両サイトのセクション構造を並べて比較

### Step 3: 5カテゴリ比較検証

#### 3-1: Structure（構造）— 配点20点
- セクション数・順序の一致
- 各セクションのレイアウト（grid/flex）正確性
- ナビゲーション項目の網羅性
- フッター構成の一致
- セマンティックHTMLの適切性
- ページ構成（複数ページの場合）

#### 3-2: Design（デザイン）— 配点25点
**ピクセル精度の比較方法論:**
1. カラー値の数値比較（HEX差分、deltaE ≦ 5で合格）
2. フォントサイズ・ウェイトの一致確認
3. スペーシングの数値比較（±8px以内で合格）
4. ボタン・カードのスタイル一致
5. 全体的なビジュアルトーンの印象比較

#### 3-3: Motion（モーション）— 配点20点
- スクロールアニメーションの実装有無
- アニメーションタイプ（fade-in-up等）の正確性
- ホバーエフェクトの実装
- タイミング（duration/delay）の適切性
- motion_key マッピングとの整合性

#### 3-4: Interaction（インタラクション）— 配点20点
- フォーム配置・フィールド・バリデーション動作
- モーダル/ポップアップの動作
- アコーディオン開閉・タブ切替
- スライダー動作（自動再生/ナビ/スワイプ）
- モバイルメニューの動作
- キーボード操作対応

#### 3-5: Responsive（レスポンシブ）— 配点15点
**クロスブラウザ・デバイスマトリクス:**

| デバイス | 幅 | 検証項目 |
|---------|-----|---------|
| iPhone SE | 375px | レイアウト崩れ・テキスト溢れ |
| iPad | 768px | グリッド列数・タブレット専用UI |
| Desktop | 1280px | max-width適用・フル機能表示 |
| Wide | 1920px | 横幅上限・余白の適切性 |

### Step 4: パフォーマンス回帰検出
site_scanner の `performance_baseline` と照合:

| 指標 | 合格基準 | 検証方法 |
|------|---------|---------|
| ビルドサイズ | 参考サイトの150%以内 | `npm run build` 出力 |
| JS バンドル | < 200KB (gzip) | ビルド出力確認 |
| 画像最適化 | next/image 使用 | ソースコード確認 |
| フォント読込 | display:swap + サブセット | layout.tsx確認 |
| 不要パッケージ | 使用されていない依存なし | package.json確認 |

### Step 5: スコアリング
各カテゴリ 0〜100点:
- 全項目OK → 100 / 軽微差異 → 80 / 一部未実装 → 60 / 多数未実装 → 40 / ほぼ未実装 → 20

**合計 = 各カテゴリスコア × 配点割合の加重平均**

### Step 6: 修正指示の生成
各指示に含める要素:
- **priority**: high(構造欠落/大カラーズレ) / medium(スペーシング/アニメ微調整) / low(装飾細部/最適化)
- **category / file / section / issue / expected / current / fix_suggestion**

### Step 7: 合格判定
- `overall_score ≧ 85` → **合格** (`pass: true`)
- `overall_score < 85` → **不合格** → 修正指示をBuilderに発行

## 出力フォーマット

`/agents/web_builder/qa_reviewer/iteration_N.json`:

```json
{
  "iteration": 1,
  "deploy_url": "https://project.vercel.app",
  "reference_url": "https://example.com",
  "overall_score": 72,
  "categories": {
    "structure": {"score": 85, "max_points": 20, "weighted_score": 17, "issues": []},
    "design": {"score": 70, "max_points": 25, "weighted_score": 17.5, "issues": []},
    "motion": {"score": 60, "max_points": 20, "weighted_score": 12, "issues": []},
    "interaction": {"score": 65, "max_points": 20, "weighted_score": 13, "issues": []},
    "responsive": {"score": 80, "max_points": 15, "weighted_score": 12, "issues": []}
  },
  "performance": {
    "js_bundle_kb": 180,
    "build_size_ok": true,
    "next_image_used": true,
    "font_optimized": true,
    "issues": []
  },
  "fix_instructions": [
    {
      "priority": "high",
      "category": "structure",
      "file": "src/app/page.tsx",
      "section": "faq",
      "issue": "FAQセクションが欠落",
      "expected": "8項目のアコーディオンFAQ",
      "current": "該当セクションなし",
      "fix_suggestion": "interaction_analyzer の accordions[0] を参照し追加"
    }
  ],
  "summary": "構造は概ね再現。FAQセクション欠落とデザイン細部に改善必要。",
  "pass": false,
  "total_fixes": 12,
  "high_priority_fixes": 3,
  "medium_priority_fixes": 6,
  "low_priority_fixes": 3
}
```

### 最終イテレーション追加出力
`output.json` に最終サマリー:

```json
{
  "final_score": 88,
  "deploy_url": "https://project.vercel.app",
  "iterations_completed": 2,
  "remaining_issues": ["本番画像差し替え必要", "フォームAPI未接続"],
  "handoff_notes": "90%再現完了。残りは画像差し替えとフォームバックエンド接続。"
}
```

## 使用するツール
- `Read`: 全output.json、Builder生成コード
- `WebFetch`: 参考サイトHTML再取得
- `Bash`: ビルド確認
- `Write`: iteration_N.json, output.json
- Vercel MCP: デプロイ・確認

## 相互干渉（検証を受ける相手）
- **QA Reviewer（横断）**: 本サブエージェントの検証品質自体をメタ検証
- **Devil's Advocate**: 比較基準・合格判定の妥当性への批判的検証
- **Tech Lead**: 差分修正指示の技術的妥当性レビュー
- **Frontend Engineer**: パフォーマンス評価基準の妥当性検証
- **Web Builder / builder**: 修正指示のフィードバックループ
