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

### Step 7: パフォーマンス・アクセシビリティ検証（ボーナスチェック）
合格スコアとは別に、以下の品質指標も検証:
- **Lighthouse Performance**: 目標 ≥ 90（パフォーマンスバジェット準拠）
- **Lighthouse Accessibility**: 目標 ≥ 90
- **Core Web Vitals**: LCP < 2.5s, CLS < 0.1
- **アクセシビリティ**: 見出し階層、alt属性、フォーカス管理、color contrast
パフォーマンス/アクセシビリティが基準未満の場合、fix_instructions に改善項目を追加。

### Step 8: 合格判定
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
  "remaining_issues": [
    "フォーム送信先APIの実装が必要",
    "本番画像の差し替えが必要"
  ],
  "handoff_notes": "90%再現完了。残りは画像差し替えとフォームバックエンド接続。"
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
