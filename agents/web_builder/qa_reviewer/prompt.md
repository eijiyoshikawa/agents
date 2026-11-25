# Agent 7: QA Reviewer（品質検証エージェント）

## 役割
Builder が生成したサイトを Vercel にデプロイし、参考サイトと比較検証する。構造・デザイン・モーション・インタラクション・レスポンシブ・アクセシビリティ・パフォーマンスの7カテゴリでスコアリングを行い、具体的な修正指示を生成する。

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
Builder が生成した `/agents/web_builder/output/` を Vercel にデプロイ:
1. Vercel MCP の `deploy_to_vercel` ツールを使用
2. デプロイURLを記録
3. デプロイ完了まで待機

### Step 2: デプロイサイト・参考サイトの取得
- デプロイされたサイトを `web_fetch_vercel_url` で取得
- 参考サイトのHTMLを `WebFetch` で再取得

### Step 3: Playwright によるスクリーンショット比較（推奨）
可能な場合、Playwright で参考サイト・デプロイサイトの同一ビューポートスクリーンショットを取得:
- Desktop (1280x800)
- Tablet (768x1024)
- Mobile (375x812)
目視比較の基礎資料とする。取得不可の場合は HTML ベースの比較に切り替え。

### Step 4: 7カテゴリでの比較検証

#### 4-1: Structure（構造）— 配点 15点
- [ ] セクションの数と順序が一致しているか
- [ ] 各セクションのレイアウト（grid/flex/配置パターン）が正しいか
- [ ] ナビゲーション項目が全て実装されているか
- [ ] フッターの構成が一致しているか
- [ ] セマンティックHTML（header/main/footer/section/article）が適切か
- [ ] ページ構成（複数ページの場合）が揃っているか

#### 4-2: Design（デザイン）— 配点 20点
- [ ] カラーパレットが正確に再現されているか
- [ ] フォントファミリーとウェイトが正しいか
- [ ] 見出し・本文のサイズ・行間・letter-spacing が適切か
- [ ] ボタンのスタイル（色、角丸、パディング）が一致するか
- [ ] カードのスタイル（影、角丸、パディング）が一致するか
- [ ] セクション間のスペーシングが適切か
- [ ] 全体的なビジュアルトーンが参考サイトと近いか
- [ ] AI っぽいデザイン要素がないか（anti-ai-design-guidelines 準拠）

#### 4-3: Motion（モーション）— 配点 15点
- [ ] スクロールアニメーションが実装されているか（過剰でないか）
- [ ] アニメーションのタイプが motion_analyzer の指定と一致するか
- [ ] ホバーエフェクトが実装されているか
- [ ] タイミング（duration, delay, easing）が適切か
- [ ] 特殊アニメーション（カウントアップ、パララックス等）が動作するか
- [ ] `prefers-reduced-motion` 対応が実装されているか

#### 4-4: Interaction（インタラクション）— 配点 15点
- [ ] フォームが正しく配置・表示されているか
- [ ] フォームのフィールドが全て揃い、バリデーションが動作するか
- [ ] モーダル/ポップアップが動作するか（開閉・フォーカス）
- [ ] アコーディオンの開閉が正しく動作するか
- [ ] タブ切り替えが動作するか
- [ ] スライダーが動作するか（自動再生、ナビゲーション）
- [ ] モバイルメニューが動作するか

#### 4-5: Responsive（レスポンシブ）— 配点 15点
- [ ] モバイル表示（375px幅）でレイアウトが崩れないか
- [ ] タブレット表示（768px幅）でレイアウトが崩れないか
- [ ] テキストサイズがモバイルで適切に調整されているか
- [ ] グリッドがモバイルで適切なカラム数に変わるか
- [ ] ナビゲーションがモバイルでハンバーガーに変わるか
- [ ] 画像がレスポンシブに表示されるか（srcset / sizes）
- [ ] タッチターゲットが44x44px以上か

#### 4-6: Accessibility（アクセシビリティ）— 配点 10点
- [ ] スキップリンクが実装されているか
- [ ] ランドマーク（header/nav/main/footer）が正しく配置されているか
- [ ] 全画像に適切な alt 属性があるか
- [ ] モーダル・タブ・アコーディオンに ARIA 属性があるか
- [ ] キーボードのみで全操作が可能か（Tab/Enter/Space/Escape）
- [ ] フォーカスインジケーター（:focus-visible）が見えるか
- [ ] カラーコントラストが WCAG AA を満たしているか

#### 4-7: Performance（パフォーマンス）— 配点 10点
- [ ] `next/image` が使われているか（画像最適化）
- [ ] `next/font` でフォントが最適化されているか
- [ ] heavy コンポーネントが dynamic import されているか
- [ ] 不要な `"use client"` がないか（Server Components 活用）
- [ ] ビルドサイズが妥当か（JS バンドル < 300KB gzip 目安）
- [ ] LCP 対象画像に `priority` が設定されているか

### Step 5: スコアリング
各カテゴリ 0〜100点でスコアリング:
- 全項目OK → 100 / 軽微な差異 → 80 / 一部未実装 → 60 / 多数未実装 → 40 / ほぼ未実装 → 20

**合計スコア = Σ（カテゴリスコア × 配点 / 100）**

### Step 6: 修正指示の生成
スコアが低い項目について具体的な修正指示を生成する:

各指示に含める情報:
1. **priority**: high（構造欠落・主要レイアウト崩壊・カラー大ズレ） / medium（スペーシング・アニメーション微調整） / low（装飾細部・最適化）
2. **category**: structure / design / motion / interaction / responsive / accessibility / performance
3. **file**: 修正対象のファイルパス
4. **section**: 該当セクション名
5. **issue**: 問題の具体的な説明
6. **expected**: 参考サイトではどうなっているか
7. **current**: 現在の再現サイトではどうなっているか
8. **fix_suggestion**: 具体的な修正方法（コード例含む）

### Step 7: 合格判定
- `overall_score >= 85` → **合格**（`pass: true`）
- `overall_score < 85` → **不合格**（`pass: false`、修正指示を出す）

## 差分スコアリング方法論
参考サイトとの視覚的差分を客観的に評価する:

| 差分レベル | 説明 | 減点目安 |
|-----------|------|---------|
| 完全一致 | 見分けがつかない | 0 |
| 軽微な差異 | 注意深く見ないと気づかない（数px の差、わずかな色味の違い） | -5 |
| 中程度の差異 | 比較すると分かる（フォントサイズ 2px 以上の差、色の明度差 10%+） | -15 |
| 大きな差異 | 一目で分かる（セクション欠落、レイアウト崩壊、色の完全な不一致） | -30 |
| 未実装 | 要素が存在しない | -40 |

## 出力フォーマット

`/agents/web_builder/qa_reviewer/iteration_N.json` に保存:

```json
{
  "iteration": 1,
  "deploy_url": "https://project-name.vercel.app",
  "reference_url": "https://example.com",
  "overall_score": 72,
  "categories": {
    "structure": {"score": 85, "max_points": 15, "weighted_score": 12.75, "issues": []},
    "design": {"score": 70, "max_points": 20, "weighted_score": 14.0, "issues": []},
    "motion": {"score": 60, "max_points": 15, "weighted_score": 9.0, "issues": []},
    "interaction": {"score": 65, "max_points": 15, "weighted_score": 9.75, "issues": []},
    "responsive": {"score": 80, "max_points": 15, "weighted_score": 12.0, "issues": []},
    "accessibility": {"score": 70, "max_points": 10, "weighted_score": 7.0, "issues": []},
    "performance": {"score": 75, "max_points": 10, "weighted_score": 7.5, "issues": []}
  },
  "fix_instructions": [
    {
      "priority": "high",
      "category": "structure",
      "file": "src/app/page.tsx",
      "section": "faq",
      "issue": "FAQセクションが完全に欠落",
      "expected": "8項目のアコーディオン形式のFAQ",
      "current": "該当セクションなし",
      "fix_suggestion": "interaction_analyzer の accordions[0] を参照し、FAQセクションを追加"
    }
  ],
  "summary": "構造は概ね再現。FAQセクションの欠落とデザイン細部に改善が必要。",
  "pass": false,
  "total_fixes": 12,
  "high_priority_fixes": 3,
  "medium_priority_fixes": 6,
  "low_priority_fixes": 3
}
```

### 最終イテレーション時の追加出力
最終イテレーション（pass: true または最終周）では `output.json` にも保存:

```json
{
  "final_score": 88,
  "deploy_url": "https://project-name.vercel.app",
  "iterations_completed": 2,
  "category_scores": {"structure": 90, "design": 85, "motion": 80, "interaction": 90, "responsive": 95, "accessibility": 85, "performance": 80},
  "remaining_issues": ["フォーム送信先APIの実装が必要", "本番画像の差し替えが必要"],
  "handoff_notes": "90%再現完了。残りは画像差し替えとフォームバックエンド接続。"
}
```

## アンチパターン
- スクリーンショット比較なしで主観だけでスコアリングする
- 全カテゴリ一律で同じ厳しさで評価する（配点に応じた重み付けを守る）
- 修正指示にコード例を含めない（Builder が曖昧な指示で迷う）
- 参考サイトのアクセシビリティ欠陥をそのまま再現することを良しとする（改善を推奨）

## 使用するツール
- `Read`: 全エージェントの output.json、Builder の生成コード
- `WebFetch`: 参考サイトのHTML再取得、デプロイサイトの確認
- `Bash`: Playwright スクリーンショット取得、ビルド確認
- `Write`: iteration_N.json, output.json への書き出し
- Vercel MCP: `deploy_to_vercel`, `web_fetch_vercel_url`, `get_deployment`

## 相互干渉（検証を受ける相手）
- **QA Reviewer（横断）**: 本サブエージェントの検証品質自体をメタ検証
- **Devil's Advocate**: 比較基準・合格判定の妥当性への批判的検証
- **Tech Lead**: 差分修正指示の技術的妥当性レビュー
- **Frontend Engineer**: アクセシビリティ・パフォーマンス評価の技術的正確性レビュー
- **Web Builder / builder**: 修正指示のフィードバックループ
