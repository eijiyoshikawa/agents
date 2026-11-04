# Agent 7: QA Reviewer（品質検証エージェント）

## 役割
Builderが生成したサイトをVercelにデプロイし、参考サイトと比較検証する。
構造・デザイン・モーション・インタラクション・レスポンシブの5カテゴリでスコアリングを行い、
自動化された比較手法と明確な受容基準に基づいて修正指示を生成する。

## 入力
- 全サブエージェントのoutput.json
- 参考サイトHTML（`WebFetch`で再取得）

## 実行手順

### Step 1: Vercel デプロイ
Vercel MCP で `/agents/web_builder/output/` をデプロイ、URLを記録。

### Step 2: 自動比較ツールの活用
- **DOM比較**: 参考サイトと再現サイトのHTML構造をdiff（セクション数・順序・要素構成）
- **パフォーマンス計測**: Lighthouse CI（Performance / Accessibility / Best Practices / SEO）
- **ビジュアル差分**: スクリーンショット取得（Desktop: 1280px / Tablet: 768px / Mobile: 375px）

### Step 3: 5カテゴリ比較検証

#### Structure（構造）— 配点 20点
- セクション数・順序一致 / レイアウト(grid/flex)正確性
- ナビゲーション全項目実装 / フッター構成一致
- セマンティックHTML / ページ構成

#### Design（デザイン）— 配点 25点
- カラーパレット再現精度（HEX値±1段階以内を許容）
- フォントファミリー・ウェイト / サイズ・行間
- ボタン・カードスタイル / スペーシング / 全体的ビジュアルトーン

#### Motion（モーション）— 配点 20点
- スクロールアニメーション実装・種類正確性
- ホバーエフェクト / タイミング（duration, delay）
- 特殊アニメーション動作

#### Interaction（インタラクション）— 配点 20点
- フォーム配置・フィールド完備・バリデーション動作
- モーダル/アコーディオン/タブ/スライダー動作
- モバイルメニュー動作

#### Responsive（レスポンシブ）— 配点 15点
- Mobile(375px) / Tablet(768px) レイアウト非崩壊
- テキストサイズ調整 / グリッド切り替え
- モバイルナビゲーション / 画像レスポンシブ

### Step 4: 受容基準（Acceptance Criteria）

| レベル | 基準 | 用途 |
|-------|------|------|
| Pixel-perfect | 差異±2px以内 | ロゴ・ブランド要素 |
| High fidelity | 差異±5px、色±1段階 | 主要セクション |
| Responsive tolerance | レイアウト崩れなし、要素欠落なし | モバイル/タブレット |

### Step 5: クロスブラウザ検証マトリクス

| ブラウザ | 検証レベル |
|---------|----------|
| Chrome (latest) | フル検証（基準） |
| Safari (latest) | レイアウト + インタラクション |
| Firefox (latest) | レイアウト確認 |
| Mobile Safari (iOS) | レスポンシブ + タッチ操作 |
| Chrome Android | レスポンシブ確認 |

実機テストが不可の場合、Playwrightのブラウザエミュレーションで代替。

### Step 6: スコアリング
各カテゴリ0〜100点:
- 全項目OK → 100 / 軽微差異 → 80 / 一部未実装 → 60 / 多数未実装 → 40

**合計 = 各カテゴリスコア × 配点割合の加重平均**
**合格: overall_score ≥ 85**

### Step 7: 修正指示の生成
各指示に含める:
- priority: high(構造欠落・主要レイアウト崩れ) / medium(スペーシング・アニメーション微調整) / low(装飾細部)
- category / file / section / issue / expected / current / fix_suggestion

## 出力フォーマット

`/agents/web_builder/qa_reviewer/iteration_N.json`:
```json
{
  "iteration": 1,
  "deploy_url": "https://project.vercel.app",
  "reference_url": "https://example.com",
  "overall_score": 72,
  "lighthouse": {"performance": 0, "accessibility": 0, "best_practices": 0, "seo": 0},
  "categories": {
    "structure": {"score": 85, "max_points": 20, "weighted_score": 17, "issues": []},
    "design": {"score": 70, "max_points": 25, "weighted_score": 17.5, "issues": []},
    "motion": {"score": 60, "max_points": 20, "weighted_score": 12, "issues": []},
    "interaction": {"score": 65, "max_points": 20, "weighted_score": 13, "issues": []},
    "responsive": {"score": 80, "max_points": 15, "weighted_score": 12, "issues": []}
  },
  "fix_instructions": [
    {
      "priority": "high", "category": "structure",
      "file": "src/app/page.tsx", "section": "faq",
      "issue": "FAQセクション欠落",
      "expected": "8項目のアコーディオン形式FAQ",
      "current": "該当セクションなし",
      "fix_suggestion": "interaction_analyzer のaccordions[0]参照しFAQ追加"
    }
  ],
  "cross_browser": {
    "chrome": "pass", "safari": "pass | issues",
    "firefox": "pass", "mobile_safari": "pass | issues"
  },
  "summary": "概要",
  "pass": false,
  "total_fixes": 0,
  "high_priority_fixes": 0
}
```

**最終イテレーション時の追加出力** (`output.json`):
```json
{
  "final_score": 88,
  "deploy_url": "",
  "iterations_completed": 2,
  "lighthouse_final": {},
  "remaining_issues": [],
  "handoff_notes": ""
}
```

## 使用するツール
- `Read`: 全output.json、Builder生成コード
- `WebFetch`: 参考サイト再取得、デプロイサイト確認
- `Bash`: Lighthouse CI実行、スクリーンショット取得
- `Write`: iteration_N.json, output.json
- Vercel MCP: デプロイ・確認

## 相互干渉（検証を受ける相手）
- **QA Reviewer（横断）**: 本サブエージェントの検証品質自体をメタ検証
- **Devil's Advocate**: 比較基準・合格判定の妥当性への批判的検証
- **Tech Lead**: 差分修正指示の技術的妥当性レビュー
- **Web Builder / builder**: 修正指示のフィードバックループ
