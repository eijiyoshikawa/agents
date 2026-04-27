# AI Interviewer

リアルタイムで会話できるAI女性面接官システム。候補者はブラウザでカメラ・マイクを起動し、画面上のアバター女性と対面式の面接を行えます。面接終了後、自動で評価レポートをNotionに保存します。

- ユースケース: LET社 (Sakupass事業) の一次面接自動化、クライアント向けSaaSとしての展開
- ゴール: 30分の模擬面接が自然に成立するMVP / Vercelデプロイ / Notion自動保存

## 技術スタック

| レイヤー | 技術 |
| --- | --- |
| フレームワーク | Next.js 14 (App Router) + TypeScript |
| デプロイ | Vercel |
| アバター | HeyGen LiveAvatar (Lite mode, `TaskType.REPEAT`) |
| LLM | Claude Sonnet 4.5 (`@anthropic-ai/sdk`) |
| STT | Deepgram Nova-3 (日本語) |
| TTS | HeyGen内蔵 (将来 ElevenLabs に切替可) |
| データ保存 | Notion API (`@notionhq/client`) |
| 通信 | WebRTC (HeyGen SDK内部でLiveKit利用) |
| スタイル | Tailwind CSS |

設計原則: HeyGenは `TaskType.REPEAT` でのみ使用し、LLMはClaudeに集約。会話履歴と評価ロジックはClaude側で全て管理する。

## ディレクトリ構成

```
ai-interviewer/
├── app/
│   ├── page.tsx                       # ランディング
│   ├── interview/[id]/page.tsx        # 面接ルーム (Phase 2 で実装)
│   ├── result/[id]/page.tsx           # 結果表示 (Phase 5 で実装)
│   └── api/
│       ├── heygen-token/route.ts      # HeyGenセッショントークン発行
│       ├── claude/route.ts            # Claude応答 (Phase 3 で実装)
│       ├── evaluate/route.ts          # 面接後評価 (Phase 5 で実装)
│       └── notion/                    # トランスクリプト/求人連携 (Phase 5)
├── components/                        # AvatarSession / ConversationLog 等 (Phase 2-)
├── lib/
│   └── prompts.ts                     # 面接官 / 評価プロンプト
└── types/
    └── interview.ts                   # 共有型 (Job, Turn, Evaluation, ...)
```

## セットアップ

### 1. 前提条件
- Node.js 20+
- npm 10+
- 各サービスのAPIキー (Anthropic / HeyGen / Deepgram / Notion)

### 2. 依存パッケージのインストール

```bash
cd ai-interviewer
npm install
```

### 3. 環境変数の設定

```bash
cp .env.local.example .env.local
# エディタで .env.local を開き、各APIキーを記入
```

各キーの取得手順:

| 変数 | 取得元 |
| --- | --- |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com/settings/keys |
| `HEYGEN_API_KEY` | https://app.heygen.com/settings — Subscription → API |
| `HEYGEN_AVATAR_ID` / `HEYGEN_VOICE_ID` | https://app.heygen.com/streaming-avatar (女性アバター + 日本語ボイスを選定) |
| `DEEPGRAM_API_KEY` | https://console.deepgram.com/ |
| `NOTION_API_KEY` | https://www.notion.so/my-integrations |
| `NOTION_INTERVIEW_DB_ID` / `NOTION_JOB_DB_ID` | NotionでDBを作成し、URL末尾のUUIDを設定 |

### 4. Notionデータベースの作成

`NOTION_JOB_DB_ID` (求人情報DB):

| フィールド | 型 |
| --- | --- |
| Title | Title |
| Company | Text |
| Position | Select (営業/エンジニア/事務/etc) |
| JobDescription | Rich Text |
| RequiredSkills | Multi-select |
| KeyQuestions | Rich Text (JSONリスト) |
| EvaluationCriteria | Rich Text (JSON: `{軸名: 重要度1-5}`) |

`NOTION_INTERVIEW_DB_ID` (面接記録DB):

| フィールド | 型 |
| --- | --- |
| InterviewID | Title |
| CandidateName | Text |
| JobRelation | Relation → 求人情報DB |
| StartedAt | Date |
| EndedAt | Date |
| DurationSec | Number |
| Transcript | Rich Text (JSON) |
| Evaluation | Rich Text (JSON) |
| OverallScore | Number |
| Recommendation | Select (通過/保留/不合格) |
| Status | Select (進行中/完了/エラー) |

DB作成後、Notion Integration を該当DBに接続 ("Add connections" メニュー) してください。

## 起動

```bash
npm run dev
# http://localhost:3000
```

## 動作確認

### HeyGenトークン発行エンドポイント

```bash
curl -X POST http://localhost:3000/api/heygen-token
# => {"token":"eyJhbGciOi...", "expiresAt": 1735000000}
```

`HEYGEN_API_KEY` が未設定だと 500 が返ります。HeyGen側エラー時は 502。

## 開発フェーズ

| Phase | 内容 | 状態 |
| --- | --- | --- |
| 1 | 基盤セットアップ・型定義・プロンプト・トークン発行 | **進行中 (this scaffold)** |
| 2 | HeyGenアバター単体動作 (固定セリフ) | 未着手 |
| 3 | 音声入力 + Claude応答ループ | 未着手 |
| 4 | 面接フロー実装 (求人注入・フェーズ管理・自動終了) | 未着手 |
| 5 | 評価生成 + Notion保存 + 結果ページ | 未着手 |
| 6 | UI磨き込み + Vercelデプロイ | 未着手 |

## スクリプト

| コマンド | 用途 |
| --- | --- |
| `npm run dev` | 開発サーバ起動 |
| `npm run build` | 本番ビルド |
| `npm run start` | 本番モード起動 |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

## 確認事項 (実装前に相談が必要)

- HeyGenのアバターID・ボイスIDの選定 (候補出し → 相談)
- Notion DBスキーマの追加・変更
- 課金が発生する設計変更
- セキュリティに関わる設計 (認証, CORS, CSP)

## 参考リンク

- HeyGen Streaming Avatar SDK: https://docs.heygen.com/docs/streaming-avatar-sdk-reference
- HeyGen Demo: https://github.com/HeyGen-Official/InteractiveAvatarNextJSDemo
- Anthropic SDK (TS): https://github.com/anthropics/anthropic-sdk-typescript
- Deepgram Node SDK: https://github.com/deepgram/deepgram-node-sdk
- Notion API: https://developers.notion.com/
