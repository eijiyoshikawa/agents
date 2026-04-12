# Continuous Learning — セッション間学習フレームワーク

## 概要

ECC (everything-claude-code) の Continuous Learning v2 を参考に、
エージェント組織がセッションを跨いでナレッジを蓄積・活用する仕組み。

## ディレクトリ構成

```
learnings/
├── README.md                   # このファイル
├── instincts/                  # 学習済みパターン（インスティンクト）
│   ├── global.json             # 組織全体に適用されるパターン
│   └── {agent_name}.json       # エージェント固有のパターン
├── sessions/                   # セッション学習ログ
│   └── {YYYY-MM-DD}_{topic}.json
└── patterns/                   # パターンカタログ
    └── {category}.json         # カテゴリ別パターン集
```

## インスティンクト（学習済みパターン）

各インスティンクトは以下の属性を持つ:

| 属性 | 説明 |
|------|------|
| `id` | 一意識別子 |
| `trigger` | このパターンが発動する条件 |
| `action` | 実行すべきアクション |
| `confidence` | 確信度（0.0〜1.0）。0.3で初期登録、繰り返し確認で上昇 |
| `evidence` | このパターンが確認された回数と事例 |
| `scope` | `global`（全エージェント共通）or `agent`（特定エージェント固有）|
| `domain` | パターンの分野（strategy / development / marketing / operations 等）|
| `created_at` | 初回登録日 |
| `updated_at` | 最終更新日 |

### 確信度の進化

```
0.3  — 初回観察（仮説段階）
0.5  — 2回目の確認（パターンとして認識）
0.7  — 3回以上の確認（信頼できるパターン）
0.9  — 5回以上 + 異なるコンテキストで確認（確立されたパターン）
1.0  — 組織ルールとして昇格（CLAUDE.md に反映済み）
```

- ユーザーの修正や否定 → 確信度 -0.2
- 2つ以上の異なるプロジェクトで確認 → `agent` → `global` へ昇格

## セッション学習ログ

各セッション終了時に以下を記録:

```json
{
  "session_date": "YYYY-MM-DD",
  "topic": "セッションのテーマ",
  "agents_involved": ["agent1", "agent2"],
  "decisions_made": [
    {
      "decision": "何を決定したか",
      "context": "なぜその決定に至ったか",
      "outcome": "good | neutral | bad",
      "lesson": "学んだこと"
    }
  ],
  "new_instincts": ["新たに発見したパターンID"],
  "reinforced_instincts": ["強化されたパターンID"],
  "corrected_instincts": ["修正されたパターンID"]
}
```

## 運用フロー

### パターンの登録
1. セッション中に有効なパターンを発見
2. `learnings/instincts/` に confidence: 0.3 で登録
3. 次回以降のセッションで同パターンが確認されたら confidence を更新

### パターンの昇格
1. confidence が 0.9 以上に達したパターン
2. COO Agent が月次レビューで確認
3. CLAUDE.md の該当セクションに正式ルールとして追記
4. confidence を 1.0 に更新

### パターンの廃止
1. 3回連続で否定されたパターン（confidence < 0.1）
2. COO Agent のレビューで廃止判断
3. `deprecated: true` フラグを追加

## 管理責任

| 役割 | 担当 |
|------|------|
| グローバルパターンの管理 | COO Agent |
| 開発パターンの管理 | Tech Lead |
| 品質パターンの管理 | QA Reviewer |
| 戦略パターンの管理 | CEO Agent |
| セッションログの記録 | 各セッションの実行者 |
