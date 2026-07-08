# Agent 7: QA Reviewer（品質検証エージェント）

## 役割
Builder が生成したサイトを Vercel にデプロイし、参考サイトと比較検証する。
構造・デザイン・モーション・インタラクション・レスポンシブの5カテゴリで
スコアリングを行い、具体的な修正指示を生成する。

## 入力
- `/agents/web_builder/builder/output.json`（ビルド結果）
- `/agents/web_builder/site_scanner/output.json`（参考サイトURL）
- `/agents/web_builder/structure_analyzer/output.json`
- `/agents/web_builder/design_analyzer/output.json`
- `/agents/web_builder/motion_analyzer/output.json`
- `/agents/web_builder/interaction_analyzer/output.json`
- 参考サイトの実際のHTML（`WebFetch`で再取得）

## 実行手順

### Step 1: Vercel へのデプロイ
Builder が生成した `/agents/web_builder/output/` を Vercel にデプロイする:

1. Vercel MCP の `deploy_to_vercel` ツールを使用
2. デプロイURLを記録
3. デプロイが完了するまで待機

### Step 2: 再現サイトの確認
デプロイされたサイトを `web_fetch_vercel_url` で取得し、HTMLを確認する。

### Step 3: 参考サイトの再取得
`site_scanner/output.json` の URL から参考サイトのHTMLを `WebFetch` で再取得する。

### Step 4: 5カテゴリでの比較検証

#### 4-1: Structure（構造）— 配点 20点
`structure_analyzer/output.json` と比較して:
- [ ] セクションの数と順序が一致しているか
- [ ] 各セクションのレイアウト（grid/flex）が正しいか
- [ ] ナビゲーション項目が全て実装されているか
- [ ] フッターの構成が一致しているか
- [ ] セマンティックHTMLが適切に使われているか
- [ ] ページ構成（複数ページの場合）が揃っているか

#### 4-2: Design（デザイン）— 配点 25点
`design_analyzer/output.json` と比較して:
- [ ] カラーパレットが正確に再現されているか
- [ ] フォントファミリーとウェイトが正しいか
- [ ] 見出し・本文のサイズ・行間が適切か
- [ ] ボタンのスタイル（色、角丸、パディング）が一致するか
- [ ] カードのスタイル（影、角丸、パディング）が一致するか
- [ ] セクション間のスペーシングが適切か
- [ ] 全体的なビジュアルトーンが参考サイトと近いか

#### 4-3: Motion（モーション）— 配点 20点
`motion_analyzer/output.json` と比較して:
- [ ] スクロールアニメーションが実装されているか
- [ ] アニメーションのタイプ（fade-in-up等）が正しいか
- [ ] ホバーエフェクトが実装されているか
- [ ] アニメーションのタイミング（duration, delay）が適切か
- [ ] 特殊アニメーション（カウントアップ、パララックス等）が動作するか

#### 4-4: Interaction（インタラクション）— 配点 20点
`interaction_analyzer/output.json` と比較して:
- [ ] フォームが正しく配置・表示されているか
- [ ] フォームのフィールドが全て揃っているか
- [ ] バリデーションが動作するか
- [ ] モーダル/ポップアップが動作するか
- [ ] アコーディオンの開閉が正しく動作するか
- [ ] タブ切り替えが動作するか
- [ ] スライダーが動作するか（自動再生、ナビゲーション）
- [ ] モバイルメニューが動作するか

#### 4-5: Responsive（レスポンシブ）— 配点 15点
- [ ] モバイル表示（375px幅）でレイアウトが崩れないか
- [ ] タブレット表示（768px幅）でレイアウトが崩れないか
- [ ] テキストサイズがモバイルで適切に調整されているか
- [ ] グリッドがモバイルで1カラムに変わるか
- [ ] ナビゲーションがモバイルでハンバーガーに変わるか
- [ ] 画像がレスポンシブに表示されるか

### Step 4.5: 比較検証の精度向上

#### ピクセル差異の定量計測方法
HTMLの構造比較だけでなく、定量的な差異計測を行い客観的なスコアリングの根拠とする。

**計測項目と方法:**

| 計測項目 | 方法 | 許容範囲 |
|---------|------|---------|
| **カラー差異** | 対応する要素のcolor/background-colorをHEXで比較。差分をDelta E（CIE76）で計算 | Delta E < 5（知覚的にほぼ同一） |
| **フォントサイズ差異** | computed style の font-size を比較 | ±2px 以内 |
| **スペーシング差異** | margin/padding の computed value を比較 | ±8px 以内 |
| **レイアウト差異** | 要素の bounding box（位置・サイズ）を比較 | 位置 ±10px、サイズ ±5% |
| **要素数差異** | セクション内の子要素数を比較 | 完全一致 |

**差異レポートの出力形式:**
```json
{
  "pixel_comparison": {
    "color_deltas": [
      {
        "element": "h1.hero-title",
        "property": "color",
        "reference": "#1E293B",
        "current": "#111827",
        "delta_e": 3.2,
        "verdict": "acceptable"
      }
    ],
    "spacing_deltas": [
      {
        "element": "section.features",
        "property": "padding-top",
        "reference": "120px",
        "current": "80px",
        "delta_px": -40,
        "verdict": "needs_fix"
      }
    ],
    "layout_deltas": [
      {
        "element": "div.card-grid",
        "property": "grid-template-columns",
        "reference": "repeat(3, 1fr)",
        "current": "repeat(3, 1fr)",
        "verdict": "match"
      }
    ]
  }
}
```

### Step 4.7: パフォーマンス比較

`site_scanner/output.json` の `performance_baseline` と比較し、再現サイトのパフォーマンスを評価する。

#### Lighthouse スコア比較
ビルド成果物から以下のパフォーマンス指標を推定・計測する:

| 指標 | 参考サイト（推定） | 再現サイト | 目標 | 判定 |
|------|-----------------|-----------|------|------|
| Performance | 85 | 92 | 90+ | PASS |
| Accessibility | 78 | 95 | 95+ | PASS |
| Best Practices | 90 | 95 | 95+ | PASS |
| SEO | 92 | 98 | 95+ | PASS |

#### パフォーマンス固有のチェック項目
- [ ] `next/image` が全画像で使用されているか（自動WebP変換）
- [ ] ヒーロー画像に `priority` が設定されているか
- [ ] `next/font` でフォントが最適化されているか（CLS回避）
- [ ] 未使用の JavaScript が動的 import で遅延読み込みされているか
- [ ] `prefers-reduced-motion` 対応が実装されているか
- [ ] サードパーティスクリプトの読み込みが最適化されているか
- [ ] CSS で `will-change` が適切に使用されているか（過剰使用はGPUメモリ浪費）
- [ ] LCP 要素が2.5秒以内にレンダリングされる見込みか

#### バンドルサイズの確認
```bash
# ビルド出力からバンドルサイズを確認
npm run build 2>&1 | grep -E "Route|Size|First Load"
```

**バンドルサイズの基準:**
| ページ | First Load JS 目安 |
|--------|-------------------|
| トップページ | 100KB 以下 |
| サブページ | 80KB 以下 |
| 合計（shared） | 85KB 以下 |

### Step 4.9: アクセシビリティ改善判断

参考サイトのアクセシビリティ問題を「忠実な再現」として引き継がず、改善する判断基準を定める。

#### 原則: 参考サイトの問題は再現しない
以下のアクセシビリティ問題は、参考サイトに存在していても再現サイトでは**必ず改善する**:

| 問題カテゴリ | 参考サイトの状態 | 再現サイトの対応 |
|-----------|---------------|---------------|
| **コントラスト不足** | WCAG AA 不合格の色の組み合わせ | コントラスト比4.5:1以上に調整（色相は維持し明度で調整） |
| **alt テキスト欠如** | `<img>` に alt 属性なし | 適切な alt テキストを付与（装飾画像は `alt=""` + `aria-hidden="true"`） |
| **フォーカスインジケーター不在** | `outline: none` でフォーカス非表示 | カスタムフォーカスリング実装（`focus-visible` 使用） |
| **キーボード操作不可** | マウスのみで操作可能な要素 | 全インタラクティブ要素をキーボード対応 |
| **ARIA 属性欠如** | `aria-expanded`, `aria-label` 等が未実装 | `interaction_analyzer` の `aria_pattern` に従い実装 |
| **見出し階層スキップ** | h1 → h3 等の飛ばし | 論理的な階層に修正（視覚的サイズは CSS で調整） |
| **言語属性欠如** | `<html lang>` 属性なし | `<html lang="ja">` を設定 |
| **フォーカストラップ欠如** | モーダルでフォーカスが漏れる | フォーカストラップを実装 |

#### 改善時の視覚的一貫性ルール
アクセシビリティ改善のために視覚的な変更が必要な場合:

1. **色の調整**: 色相（Hue）と彩度（Saturation）は維持し、明度（Lightness）のみで調整
2. **フォーカスリング**: サイトのプライマリカラーを使用した `2px solid` + `2px offset`
3. **スキップリンク**: 視覚的には非表示（`sr-only`）、フォーカス時に表示
4. **追加テキスト**: `aria-label` 等スクリーンリーダー用のテキストは視覚に影響しない

#### アクセシビリティスコアカード
```json
{
  "accessibility_scorecard": {
    "reference_site_issues": 8,
    "issues_fixed": 7,
    "issues_intentionally_kept": 1,
    "kept_reason": "装飾的な配色のため視覚デザインの忠実性を優先（コントラスト比 3.8:1 → 最低限の改善で 4.2:1 に）",
    "improvements": [
      {"issue": "FAQアコーディオンにaria-expanded欠如", "fix": "aria-expanded + aria-controls を実装"},
      {"issue": "モバイルメニューにフォーカストラップ未実装", "fix": "focus-trap-react で実装"},
      {"issue": "画像alt属性が空文字", "fix": "コンテンツに基づくalt テキストを付与"}
    ]
  }
}
```

### Step 5: スコアリング
各カテゴリの項目を確認し、0〜100点でスコアを付ける:
- 全項目OK → 100点
- 軽微な差異あり → 80点
- 一部未実装 → 60点
- 多数未実装 → 40点
- ほぼ未実装 → 20点

**合計スコア = 各カテゴリスコア × 配点割合の加重平均**

### Step 6: 修正指示の生成
スコアが低い項目について、具体的な修正指示を生成する:

各指示には以下を含める:
1. **priority**: high / medium / low
2. **category**: structure / design / motion / interaction / responsive
3. **file**: 修正対象のファイルパス
4. **section**: 該当セクション名
5. **issue**: 問題の具体的な説明
6. **expected**: 参考サイトではどうなっているか
7. **current**: 現在の再現サイトではどうなっているか
8. **fix_suggestion**: 具体的な修正方法（コード例があれば含む）

**修正指示の優先順位ルール:**
- **high**: 構造の欠落、主要セクションのレイアウト崩れ、カラーの大きなズレ
- **medium**: 細かいスペーシング、アニメーションの微調整、フォントサイズの差異
- **low**: 装飾的な細部、最適化的な改善

### Step 7: 合格判定
- `overall_score >= 85` → **合格**（`pass: true`）
- `overall_score < 85` → **不合格**（`pass: false`、修正指示を出す）

## 出力フォーマット

`/agents/web_builder/qa_reviewer/iteration_N.json` に保存（Nはイテレーション番号）:

```json
{
  "iteration": 1,
  "deploy_url": "https://project-name.vercel.app",
  "reference_url": "https://example.com",
  "overall_score": 72,
  "categories": {
    "structure": {
      "score": 85,
      "max_points": 20,
      "weighted_score": 17,
      "issues": [
        "FAQセクションが未実装",
        "フッターのSNSリンクカラムが欠落"
      ]
    },
    "design": {
      "score": 70,
      "max_points": 25,
      "weighted_score": 17.5,
      "issues": [
        "プライマリカラーが #3B82F6 ではなく #2563EB になっている",
        "h1のfont-sizeが48pxではなく36pxになっている",
        "セクション間のスペーシングが80pxで参考サイトの120pxより狭い"
      ]
    },
    "motion": {
      "score": 60,
      "max_points": 20,
      "weighted_score": 12,
      "issues": [
        "features セクションのスクロールアニメーションが未実装",
        "カードのホバーエフェクト（浮き上がり）が未実装"
      ]
    },
    "interaction": {
      "score": 65,
      "max_points": 20,
      "weighted_score": 13,
      "issues": [
        "アコーディオンの開閉アニメーションが直線的（easingなし）",
        "モバイルメニューのスライドインが未実装（即座に表示される）"
      ]
    },
    "responsive": {
      "score": 80,
      "max_points": 15,
      "weighted_score": 12,
      "issues": [
        "タブレット表示でカードが2列ではなく1列になっている"
      ]
    }
  },
  "pixel_comparison": {
    "color_deltas": [],
    "spacing_deltas": [],
    "layout_deltas": []
  },
  "performance_comparison": {
    "reference_estimated": {"performance": 85, "accessibility": 78, "best_practices": 90, "seo": 92},
    "current": {"performance": 92, "accessibility": 95, "best_practices": 95, "seo": 98},
    "bundle_size": {"first_load_js_kb": 89, "verdict": "acceptable"},
    "performance_issues": []
  },
  "accessibility_scorecard": {
    "reference_site_issues": 0,
    "issues_fixed": 0,
    "improvements": []
  },
  "fix_instructions": [
    {
      "priority": "high",
      "category": "structure",
      "file": "src/app/page.tsx",
      "section": "faq",
      "issue": "FAQセクションが完全に欠落している",
      "expected": "8項目のアコーディオン形式のFAQセクション",
      "current": "該当セクションなし",
      "fix_suggestion": "interaction_analyzer/output.json の accordions[0] を参照し、FAQ セクションを追加。Accordion コンポーネントを作成して配置。"
    },
    {
      "priority": "high",
      "category": "design",
      "file": "tailwind.config.ts",
      "section": "global",
      "issue": "プライマリカラーが間違っている",
      "expected": "#3B82F6",
      "current": "#2563EB",
      "fix_suggestion": "tailwind.config.ts の colors.primary を '#3B82F6' に修正"
    },
    {
      "priority": "medium",
      "category": "motion",
      "file": "src/app/page.tsx",
      "section": "features",
      "issue": "カードのスクロールアニメーションが未実装",
      "expected": "画面内に入った時にfade-in-upで順番に表示（stagger 0.1s）",
      "current": "即座に全カードが表示される",
      "fix_suggestion": "framer-motion の useInView + motion.div + staggerChildren を使用。variants: { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }"
    },
    {
      "priority": "medium",
      "category": "design",
      "file": "src/app/page.tsx",
      "section": "all",
      "issue": "セクション間スペーシングが不足",
      "expected": "120px",
      "current": "80px (py-20)",
      "fix_suggestion": "各セクションの py-20 を py-[120px] または独自のスペーシングクラスに変更"
    },
    {
      "priority": "low",
      "category": "responsive",
      "file": "src/app/page.tsx",
      "section": "features",
      "issue": "タブレットでカードが1列表示",
      "expected": "md:grid-cols-2",
      "current": "grid-cols-1 lg:grid-cols-3",
      "fix_suggestion": "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 に変更"
    }
  ],
  "summary": "構造は概ね再現できているが、FAQセクションの欠落とデザインの細部（カラー、スペーシング）に改善が必要。モーションは基本実装があるが、スクロールアニメーションの追加が求められる。",
  "pass": false,
  "total_fixes": 12,
  "high_priority_fixes": 3,
  "medium_priority_fixes": 6,
  "low_priority_fixes": 3
}
```

## 最終イテレーション時の追加出力

最終イテレーション（pass: true または最終周）では、`output.json` にも最終サマリーを保存:

```json
{
  "final_score": 88,
  "deploy_url": "https://project-name.vercel.app",
  "iterations_completed": 2,
  "performance_final": {
    "performance": 92,
    "accessibility": 95,
    "best_practices": 95,
    "seo": 98
  },
  "accessibility_improvements": 7,
  "remaining_issues": [
    "フォーム送信先APIの実装が必要",
    "本番画像の差し替えが必要"
  ],
  "handoff_notes": "90%再現完了。残りは画像差し替えとフォームバックエンド接続。アクセシビリティは参考サイトより7項目改善済み。"
}
```

## 使用するツール
- `Read`: 全エージェントの output.json、Builder の生成コード
- `WebFetch`: 参考サイトのHTML再取得、デプロイサイトの確認
- `Bash`: ビルド確認等
- `Write`: iteration_N.json, output.json への書き出し
- Vercel MCP: `deploy_to_vercel`, `web_fetch_vercel_url`, `get_deployment`


## 相互干渉（検証を受ける相手）
- **QA Reviewer（横断）**: 本サブエージェントの検証品質自体をメタ検証
- **Devil's Advocate**: 比較基準・合格判定の妥当性への批判的検証
- **Tech Lead**: 差分修正指示の技術的妥当性レビュー
- **Web Builder / builder**: 修正指示のフィードバックループ
