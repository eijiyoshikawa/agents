# AI Agent Organization — 法人経営エージェント群

## プロジェクト概要
法人経営を0から100まで遂行可能なAIエージェント組織。
CEO Agentを頂点とし、COO Agentが業務執行を統括する35体のエージェント（+ Web Builder サブエージェント8体）が、相互に検証（チェック&バランス）しながら経営全機能をカバーする。
企画・戦略立案から実際のプロダクト開発・サービス化まで一気通貫で実行可能。
Claude Code の Maxプラン内で動作し、追加API費用なし。

## 組織図

```
                         ┌──────────────┐
                         │  CEO Agent   │ ← 経営戦略・最終意思決定・対外
                         └──────┬───────┘
                                │
                         ┌──────▼───────┐
                         │  COO Agent   │ ← 業務執行統括・オペレーション・対内
                         └──────┬───────┘
                                │
     ┌──────────┬───────────────┼───────────────┬──────────┐
     │          │               │               │          │
┌────▼────┐┌────▼─────┐ ┌──────▼──────┐ ┌──────▼────┐┌────▼────────┐
│ 営業部門 ││ 管理部門  │ │コンサル事業部│ │ 開発部門   ││ 横断チーム   │
└────┬────┘└────┬─────┘ └──────┬──────┘ └──────┬────┘└────┬────────┘
     │          │              │               │          │
  Sales      Finance     Retriever        Tech Lead    QA Reviewer
  Marketing  HR          Issue Str.       Frontend E.  KPI Dashboard
  CS         Legal       Market Res.      Backend E.   Project Manager
  SNS Op.                Analogy F.       Infrastructure Data Analyst
  Ad Ops.                Marketing An.    QA Engineer   Devil's Advocate
  Content C.             Strategist       UI/UX Designer
  PR                     Devil's Adv.     Data Engineer
                         Report B.        Designer
                         Document B.      Engineer
                                          Web Builder
                                            └─ 8 sub-agents
```

## エージェント構成（全35体 + サブ8体 = 43名 / 上限50名）
各エージェントのプロンプトは `/agents/<agent_name>/prompt.md` に定義。
出力は `/agents/<agent_name>/output.json` に保存される。

### 統括（2名）
1. **CEO Agent** (`ceo`) — 経営戦略・最終意思決定・投資判断・組織最適化
2. **COO Agent** (`coo`) — 業務執行統括・プロセス管理・エージェント間調整

### コンサルティング事業部（9名）
3. **Retriever** (`retriever`) — Notion議事録取得・構造化
4. **Issue Structurer** (`issue_structurer`) — ビジネス課題の言語化・構造化
5. **Market Researcher** (`market_researcher`) — 市場・競合・顧客分析（並列実行）
6. **Analogy Finder** (`analogy_finder`) — 異業種アナロジー事例収集（並列実行）
7. **Marketing Analyst** (`marketing_analyst`) — 競合マーケティング施策の深掘り分析（並列実行）
8. **Strategist** (`strategist`) — 戦略構築
9. **Devil's Advocate** (`devils_advocate`) — 独立した批判的検証（全部門の重要意思決定対象）
10. **Report Builder** (`report_builder`) — Google Slides提案資料の構成作成
11. **Document Builder** (`document_builder`) — 対話型提案資料作成（テンプレート活用）

### 営業・マーケティング部門（7名）
12. **Sales Agent** (`sales`) — リード管理・商談パイプライン・受注管理
13. **Marketing Agent** (`marketing`) — 自社マーケティング・ブランディング・リード獲得
14. **Customer Success Agent** (`customer_success`) — 顧客満足度・リテンション・アップセル
15. **SNS Operator** (`sns_operator`) — Instagram/TikTok/YouTube日常運用・エンゲージメント管理
16. **Ad Operations** (`ad_operations`) — Google/Meta/TikTok広告運用・ROAS最適化
17. **Content Creator** (`content_creator`) — SNS投稿・ブログ・動画脚本・広告コピー制作
18. **PR Agent** (`pr`) — 広報・プレスリリース・メディア対応・危機管理広報

### 管理部門（3名）
19. **Finance Agent** (`finance`) — 経理・財務・見積・請求・PL管理・補助金
20. **HR Agent** (`hr`) — 組織設計・採用・評価・エージェント組織管理
21. **Legal Agent** (`legal`) — 契約書・コンプライアンス・知財・リスク法務

### 開発部門（10名 + サブ8名）
22. **Tech Lead** (`tech_lead`) — CTO的技術統括・アーキテクチャ設計・技術選定
23. **Frontend Engineer** (`frontend_engineer`) — Next.js App Router UI実装・SEO最適化
24. **Backend Engineer** (`backend_engineer`) — API設計・DB・認証・Stripe決済連携
25. **Infrastructure** (`infrastructure`) — デプロイ・CI/CD・監視・セキュリティ・コスト管理
26. **QA Engineer** (`qa_engineer`) — テスト自動化・品質保証（Jest/Playwright）
27. **UI/UX Designer** (`ui_ux_designer`) — デザインシステム構築・Figma連携・ユーザビリティ改善
28. **Data Engineer** (`data_engineer`) — クローラー・データパイプライン・データ品質管理
29. **Designer** (`designer`) — Web/LP/UIデザイン生成（AI Designer MCP活用）
30. **Engineer** (`engineer`) — LP/Web/AIシステム実装（Next.js/Python/WordPress）
31. **Web Builder** (`web_builder`) — 参考サイト分析→Next.js再現パイプライン
    - `site_scanner` — サイト偵察・技術検出
    - `structure_analyzer` — HTML構造・レイアウトパターン解析
    - `design_analyzer` — カラー・タイポグラフィ・スペーシング抽出
    - `motion_analyzer` — アニメーション・トランジション特定
    - `interaction_analyzer` — フォーム・モーダル・タブ等UI要素解析
    - `asset_collector` — 画像・フォント・アイコン収集（著作権配慮）
    - `builder` — 全解析結果統合→Next.js + Tailwind CSS実装
    - `qa_reviewer` — Vercelデプロイ後の比較検証・修正指示

### 横断チーム（4名）
32. **Project Manager Agent** (`project_manager`) — プロジェクト進捗・リソース配分・納期管理
33. **QA Reviewer Agent** (`qa_reviewer`) — 全出力の品質検証・相互整合性チェック（Quality Assurance機能統合済み）
34. **KPI Dashboard Agent** (`kpi_dashboard`) — 全社KPI集計・異常検知・レポーティング
35. **Data Analyst** (`data_analyst`) — 横断データ分析・インサイト抽出・意思決定支援

### 廃止済み
- ~~Quality Assurance (`quality_assurance`)~~ — 2026-04-08 QA Reviewer に統合

## 相互干渉（チェック&バランス）

全エージェントはQA Reviewerによる品質チェックを受ける。
さらに各エージェントは最低3体以上の他エージェントからの検証を受ける（`prompt.md` 内の「相互干渉」セクション参照）。
平均干渉数は5.46体/エージェント（2026-04-28時点）。
全エージェントが「検証を受ける側」と「検証する側」の双方向の役割を持つ（89%が明示的な検証対象セクションを保有。残り4体はCEO/Devil's Advocate/QA Reviewer/Web Builderで、検証自体が本務のため不要）。

### CEO/COO の役割分担
- **CEO**: 経営戦略・最終意思決定・投資判断・対外コミュニケーション
- **COO**: 業務執行・オペレーション管理・エージェント間調整・日常品質運用

### 検証の独立性
- **Devil's Advocate**: 全部門の重要意思決定に対し独立した批判的検証を実施
- **QA Reviewer**: 全エージェント出力のスキーマ・コンテンツ・クロスリファレンス・ビジネス妥当性を検証
- **Data Analyst**: 定量データに基づく施策効果検証

### 主要な相互連携

| 連携 | 内容 |
|------|------|
| CEO ↔ COO | 経営方針 ↔ 実行状況報告 |
| CEO ↔ Devil's Advocate | 戦略判断 ↔ 批判的検証 |
| Sales → Retriever | 商談ヒアリング議事録の取得トリガー |
| Sales ↔ Finance | 見積依頼・受注通知 ↔ 請求・入金管理 |
| Sales → PM | 受注後プロジェクト立ち上げ |
| PM → Tech Lead | 開発プロジェクトの技術方針決定 |
| Tech Lead ↔ Frontend/Backend/Infra | 開発タスク振り分け ↔ 技術レビュー |
| Designer → Frontend Engineer | デザイン→実装ハンドオフ |
| UI/UX Designer → Designer | デザインシステム・トークン提供 |
| Backend Engineer ↔ Infrastructure | デプロイ依頼 ↔ インフラ構成検証 |
| QA Engineer → Frontend/Backend | テスト結果・バグ報告 |
| Data Engineer → KPI Dashboard | データパイプライン→集計基盤 |
| PM ↔ Finance | 工数実績・請求トリガー ↔ 予算検証 |
| PM → CS | 納品後ハンドオフ |
| CS ↔ Sales | アップセル機会・リファラル ↔ 顧客情報 |
| Marketing → Content Creator → SNS Op. | コンテンツ企画→制作→配信 |
| Marketing → Ad Operations | 広告戦略→運用実行 |
| Marketing ↔ Sales | リード引き渡し ↔ リード品質FB |
| PR ↔ Marketing | 広報戦略 ↔ ブランドメッセージ整合 |
| PR → Legal | プレスリリース法的チェック |
| Data Analyst → CEO | 分析レポート・意思決定支援 |
| Finance → CEO | 週次PL・キャッシュフロー |
| KPI Dashboard → CEO | 日次KPI・異常アラート |
| QA Reviewer → 全体 | 品質差し戻し・改善指示 |
| Devil's Advocate → 全体 | 重要意思決定への批判的検証 |
| CEO → COO → 全体 | 優先度指示・リソース配分・最終承認 |

## エージェント定義
各エージェントのプロンプトは `/agents/<agent_name>/prompt.md` に定義。
出力は `/agents/<agent_name>/output.json` に保存される。
各エージェントのプロンプトには「相互干渉（検証を受ける相手）」セクションが含まれ、チェック&バランスが明文化されている。

## 実行方法

### 戦略提案パイプライン
```
/agents/orchestrator/PIPELINE.md の手順に従って、
Notion の議事録ページ「会議名」からパイプラインを実行してください。
```

### ワンショット実行（コピペ用プロンプト）
`/agents/orchestrator/run.md` にコピペ用プロンプトを用意。
`{{会議名}}` を置き換えて Claude Code に貼り付けるだけで全ステップが実行される。

### 日次レポート
`/daily_reports/YYYY-MM-DD.md` に全エージェントの稼働状況・組織診断を記録。
CEO Agentが各エージェントの業務状況、組織診断、改善計画を管理。

### 他の人と共有する場合
1. このリポジトリを `git clone` する
2. Claude Code（Max プラン）を開く
3. MCP サーバーを設定する（Notion / Google Drive）
4. 上記いずれかの方法で実行

## 共有リソース

### デザインシステム（awesome-design-md）
`/design-md/` に54社以上の企業デザインシステム（DESIGN.md）を格納。
LP制作・Web制作・提案資料作成時のデザインリファレンスとして、Marketing Agent と Report Builder Agent が参照する。

- 一覧: `/design-md/README.md`
- 個別: `/design-md/{company-name}/DESIGN.md`
- 出典: [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md)

### モーションライブラリ（MOTION_30）
`/design-md/motion-library/MOTION_30.md` に Web コンテンツ向けモーション30選を収録。
LP・Webサイト・ダッシュボード等の制作時に、Designer / UI/UX Designer / Engineer / Frontend Engineer / Web Builder（motion_analyzer / builder）が共通語彙として参照する。

- 5カテゴリ（ナビ遷移 / テキスト / インタラクション / スクロール背景 / 先進性）× 各6モーション
- 各モーションに `motion_key` / 演出 / 活用例 / 推奨実装 / サンプルコード / アクセシビリティ注意を記載
- **必須ルール**:
  - モーション指定・実装は必ず `motion_key` を引用
  - 該当モーションが無い場合はドキュメントに追加してから使用
  - `prefers-reduced-motion: reduce` 対応を全モーションで実装

## 事業領域
- SNSマーケティング（Instagram, TikTok, YouTube 運用/広告/クリエイティブ）
- 不動産業界特化型BPO（AIエージェント活用）
- AIシステム制作（補助金活用）
- LP等のWeb制作

## ゴール
全ての業務に対してプロのエージェントが存在し、法人経営を0から100まで行える組織配置と、マネジメント力のある統括エージェント（CEO Agent）の育成。
エージェント上限は50名。追加が必要な場合はその根拠と提案をCEOに上申する。

## 開発標準（Development Standards）

### コード品質基準
全開発エージェント（Tech Lead / Frontend / Backend / Infrastructure / QA / Engineer）が準拠する基準。

| 基準 | ルール |
|------|--------|
| 関数の行数 | **50行以内**（超過時は分割を検討） |
| ファイルの行数 | **800行以内**（超過時はモジュール分割） |
| ネストの深さ | **4段階以内**（早期リターンで解消） |
| テストカバレッジ | **ステートメント80%以上**（ユニット + 結合 + E2E） |
| 命名 | 明確で意図が伝わる名前。略語は一般的なもののみ |
| コメント | ロジックが自明でない箇所のみ。WHYを書く |
| エラーハンドリング | システム境界（ユーザー入力・外部API）で必ずバリデーション |
| 不変性 | 既存オブジェクトを直接変更しない。新しいオブジェクトを生成 |

### TDD（テスト駆動開発）ワークフロー
開発部門は以下のサイクルを標準とする:

```
1. RED    — 失敗するテストを先に書く
2. GREEN  — テストを通す最小限のコードを実装
3. REFACTOR — テストを維持しつつリファクタリング
```

**テストピラミッド**:
- ユニットテスト: 70%（ビジネスロジック・ユーティリティ）
- 結合テスト: 20%（API・サービス間連携）
- E2Eテスト: 10%（クリティカルユーザーフロー / Playwright）

### Git ワークフロー

#### コミットメッセージ規約（Conventional Commits）
```
<type>(<scope>): <description>

feat:     新機能
fix:      バグ修正
refactor: リファクタリング（機能変更なし）
test:     テスト追加・修正
docs:     ドキュメントのみの変更
style:    コードスタイル修正（動作に影響なし）
chore:    ビルド・補助ツール・設定の変更
perf:     パフォーマンス改善
ci:       CI/CD設定の変更
```

#### ブランチ命名規則
```
feature/<短い説明>   — 新機能
fix/<短い説明>       — バグ修正
refactor/<短い説明>  — リファクタリング
hotfix/<短い説明>    — 緊急修正
```

#### PRワークフロー
1. 機能ブランチで開発
2. テスト通過を確認
3. PR作成（タイトル70文字以内 + Summary + Test Plan）
4. QA Reviewer / Tech Lead のレビュー
5. CI通過後にマージ

## セキュリティ基準（Security Standards）

### コミット前の必須チェック
全開発エージェントはコミット前に以下を確認する:

- [ ] **シークレット漏洩なし** — APIキー・パスワード・トークンのハードコードがないこと
- [ ] **入力バリデーション** — ユーザー入力は必ずサニタイズ
- [ ] **SQLインジェクション対策** — パラメータ化クエリを使用
- [ ] **XSS対策** — HTMLは必ずエスケープ / サニタイズ
- [ ] **CSRF対策** — 状態変更リクエストにCSRFトークンを付与
- [ ] **認証・認可** — エンドポイントに適切なアクセス制御
- [ ] **レート制限** — 公開APIにレート制限を実装
- [ ] **エラーメッセージ** — 内部情報を漏洩しない安全なメッセージ

### シークレット管理
```
・ハードコード禁止 → 環境変数 or シークレットマネージャー使用
・.env ファイルは .gitignore に含めること
・シークレット漏洩が疑われた場合 → 即座にローテーション
・起動時にシークレットの存在チェックを実行
```

### セキュリティスキャン（AgentShield ライト版）
ECC の AgentShield を参考に構築したプロジェクト専用スキャナ。

```bash
bash scripts/security-scan.sh          # ターミナル出力
bash scripts/security-scan.sh --json   # JSON出力（CI/CD統合用）
bash scripts/security-scan.sh --report # security-report.json 生成
```

**5つのスキャンカテゴリ:**
1. シークレット検出（12パターン: AWS/OpenAI/Anthropic/GitHub/Slack等）
2. 設定ファイル監査（.claude/settings.json のHook設定検証）
3. Hookスクリプト検査（インジェクション・外部通信・破壊的操作の検出）
4. .gitignore検証（必須パターンの存在確認）
5. エージェントプロンプト検査（相互干渉・セキュリティ記述の確認）

**グレード:** A(90-100) / B(75-89) / C(60-74) / D(40-59) / F(0-39)

**推奨実行タイミング:** リリース前・月次レビュー・新エージェント追加時

### セキュリティインシデント対応
1. 作業を中断
2. 該当エージェント + Tech Lead + Infrastructure に報告
3. クリティカルな脆弱性は修正完了まで他作業を停止
4. 漏洩したシークレットを即ローテーション
5. 同種の脆弱性がないかコードベース全体をスキャン

## トークン最適化・コンテキスト管理

### コンテキスト管理の原則
Claude Code のMaxプラン内で効率的に動作するための指針。

| 原則 | 説明 |
|------|------|
| **必要な情報だけ渡す** | エージェント間の受け渡しは output.json のみ。不要な中間データは渡さない |
| **大きなファイルは部分読み込み** | ファイル全体ではなく必要な行範囲のみ読む |
| **並列実行の活用** | 独立したエージェント（Market Researcher / Analogy Finder / Marketing Analyst）は並列実行 |
| **戦略的コンパクション** | 長いセッションでは論理的な区切りで `/compact` を活用 |
| **出力のJSON標準化** | 全エージェントがJSON形式で出力し、後工程の解析コストを最小化 |

### コンテキスト予算の閾値
各コンポーネントのサイズ上限（超過時は最適化を検討）:

| コンポーネント | 上限目安 | 理由 |
|-------------|---------|------|
| CLAUDE.md | **300行** | セッション開始時に全量読み込まれる |
| エージェントプロンプト | **200行/体** | 実行時に毎回読み込まれる |
| output.json | **2000トークン** | 後工程に受け渡す際に消費 |
| MCP サーバー | **10個以内** | 各ツールスキーマ ≈ 500トークン消費 |
| アクティブツール | **80個以内** | 超過するとコンテキスト圧迫 |

**MCP は最大のコンテキスト消費源。** 不要な MCP サーバーの無効化が最も効果的な最適化。

### 戦略的コンパクション（/compact）のタイミング

**コンパクションすべきタイミング:**
```
・リサーチ完了 → 実装開始（リサーチコンテキストは大量消費）
・計画完了 → 実装開始（計画はファイルに書き出してからコンパクト）
・デバッグ完了 → 次の機能開発（エラートレースをクリア）
・失敗したアプローチ → 新しいアプローチ（推論をリセット）
・マイルストーン完了 → 次のマイルストーン
```

**コンパクションを避けるべきタイミング:**
```
・実装途中（変数名・ファイルパス・部分的な状態を失う）
・直前のコンテキストを参照するコードレビュー中
```

**コンパクション前のベストプラクティス:**
- 重要な情報をファイルに書き出してから `/compact`
- TodoWrite で計画を確定してから `/compact`
- カスタムサマリーメッセージ付きで `/compact` 実行

**自動リマインド:** ツール呼び出し50回ごとに Hook がコンパクション提案を表示

### コンテキスト予算監査
```bash
bash scripts/context-budget.sh           # 通常出力
bash scripts/context-budget.sh --verbose # ファイル別詳細
bash scripts/context-budget.sh --json    # JSON出力
```

### パイプライン効率化
```
・QAチェックポイントはパイプラインの要所（5箇所）に配置
・差し戻しは即座に実行し、後工程の無駄な計算を防ぐ
・リサーチ系エージェント（3体）は常に並列実行
```

## ナレッジ管理

### セッション間のナレッジ蓄積
以下の情報を組織的に蓄積・共有する:

| 蓄積対象 | 保存先 | 管理者 |
|---------|--------|--------|
| 品質レビュー結果 | `/agents/qa_reviewer/reviews/` | QA Reviewer |
| 日次レポート | `/daily_reports/YYYY-MM-DD.md` | CEO / COO |
| 技術選定の記録 | `/agents/tech_lead/tech_decisions.json` | Tech Lead |
| KPIトレンド | `/agents/kpi_dashboard/output.json` | KPI Dashboard |
| バグパターン | `/agents/qa_engineer/output.json` | QA Engineer |
| **学習済みパターン** | `/learnings/instincts/` | **COO** |
| **セッション学習ログ** | `/learnings/sessions/` | **各セッション実行者** |

### 継続学習（Continuous Learning）
ECC の Continuous Learning v2 を参考にした、セッション間のパターン学習:

- **インスティンクト**: 繰り返し確認されたパターンを `learnings/instincts/` に蓄積
- **確信度**: 初回 0.3 → 繰り返し確認で上昇 → 0.9以上で CLAUDE.md ルール昇格
- **セッションログ**: 各セッション終了時に `learnings/sessions/` に決定事項・学びを記録
- **月次レビュー**: COO Agent がインスティンクトの確信度を精査し、昇格・廃止を判断
- 詳細: `/learnings/README.md`

### ベストプラクティスの共有
- QA Reviewer の月次品質トレンド分析で頻出パターンを特定
- Tech Lead がコーディング規約・ADR（Architecture Decision Records）を更新
- COO がプロセス改善提案を各エージェントに反映
- **確立されたインスティンクト（confidence ≥ 0.9）を各エージェントプロンプトに反映**

## 計画ファースト原則（Plan-First Principle）

複雑なタスク（新機能開発・アーキテクチャ変更・大規模リファクタリング）は、
必ず以下の手順を踏む:

```
1. PM Agent: 要件定義・スコープ確定
2. Tech Lead: アーキテクチャ設計・技術選定
3. Devil's Advocate: 計画への批判的検証
4. 承認後に実装フェーズへ移行
```

小規模な修正（バグ修正・コピー変更・設定変更）はこのプロセスを省略可。

## 組織拡張の予備枠（残り7名）
| 候補 | 理由 | 優先度 |
|------|------|--------|
| Security Reviewer | 全開発成果物のセキュリティ専門レビュー・脆弱性スキャン・OWASP準拠検証 | **高** |
| Knowledge Manager | エージェント間ナレッジ蓄積・ベストプラクティス共有・継続学習 | 中 |
| BizDev Agent（事業開発） | 新規事業探索・パートナーシップ・M&A | 中 |
| 予備枠 x4 | 事業拡大時の追加枠（海外展開、新規事業等） | - |
