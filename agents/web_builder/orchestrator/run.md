# Web Builder パイプライン一括実行プロンプト

以下のプロンプトを Claude Code にそのまま貼り付けて実行してください。
`{{参考URL}}` を実際の参考サイトURLに置き換えてから使ってください。

---

## 実行プロンプト

```
以下の Web Builder パイプラインを実行し、参考サイト「{{参考URL}}」を
Next.js + Tailwind CSS で高再現度に再構築してください。

各エージェントのプロンプトは /agents/web_builder/<agent_name>/prompt.md に定義されています。
各ステップで prompt.md を読み、指示に従って output.json を生成してください。

### 実行順序:

1. **Site Scanner**: WebFetchで「{{参考URL}}」を取得し、技術スタック・ページ構成を
   解析して /agents/web_builder/site_scanner/output.json に保存

2. 以下4つを並列実行:
   - **Structure Analyzer**: セクション構成・レイアウト解析
     → /agents/web_builder/structure_analyzer/output.json
   - **Design Analyzer**: カラー・タイポグラフィ・スペーシング抽出
     → /agents/web_builder/design_analyzer/output.json
   - **Motion Analyzer**: アニメーション・ホバー・スクロールエフェクト特定
     → /agents/web_builder/motion_analyzer/output.json
   - **Interaction Analyzer**: フォーム・モーダル・タブ・スライダー解析
     → /agents/web_builder/interaction_analyzer/output.json

3. **Asset Collector**: 画像・フォント・アイコンを収集・整理
   → /agents/web_builder/asset_collector/output.json

4. **Builder (Iteration 1)**: 全解析結果を統合してNext.jsプロジェクトを実装
   → /agents/web_builder/output/ にプロジェクト生成
   → npm run build で動作確認

5. **QA Reviewer (Iteration 1)**: Vercelにデプロイし参考サイトと比較検証
   → /agents/web_builder/qa_reviewer/iteration_1.json に修正指示を保存

6. **Builder (Iteration 2)**: iteration_1.json の修正指示をpriority順に実装
   → npm run build で動作確認

7. **QA Reviewer (Iteration 2)**: 再デプロイし最終検証
   → /agents/web_builder/qa_reviewer/iteration_2.json に最終スコア
   → /agents/web_builder/qa_reviewer/output.json に最終サマリー

各ステップ完了後、output.json の要約を簡潔に報告してから次に進んでください。
最終的に Vercel のデプロイURLと最終スコアを報告してください。
```
