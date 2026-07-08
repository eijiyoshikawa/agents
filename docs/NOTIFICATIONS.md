# 音声通知システム（承認待ち・作業完了）

Claude Code が **承認・入力を待って停止した時** と **作業を完了した時** に、
音声（またはスマホへのプッシュ通知）で知らせる仕組みです。

- フック本体: `scripts/hooks/notify.sh`
- 登録先: `.claude/settings.json` の `Notification` / `Stop`
- 通知経路: **ntfy プッシュ**（クラウド・リモート向け）または **ローカル音声**（Mac/Win/Linux 端末向け）を環境に応じて自動選択

| フックイベント | 発火タイミング | 通知文言 |
|--------------|--------------|---------|
| `Notification` | 承認・入力待ちで停止した時 | 🔔 承認が必要 |
| `Stop` | Claude が応答を完了した時 | ✅ 作業完了 |

---

## どの通知経路が使われるか

`notify.sh` は環境を自動判定します（`CLAUDE_NOTIFY_MODE` で強制も可能）。

```
CLAUDE_NOTIFY_MODE=auto  … 既定。ntfy トピックがあればプッシュ、無ければローカル音声
CLAUDE_NOTIFY_MODE=push  … ntfy プッシュのみ
CLAUDE_NOTIFY_MODE=local … ローカル音声のみ
CLAUDE_NOTIFY_MODE=off   … 通知を無効化
```

---

## A. ローカル端末（Mac / Windows / Linux）で使う場合

**追加設定は不要です。** ターミナル/デスクトップアプリで Claude Code を動かしていれば、
承認待ち・完了時に音声読み上げ・効果音が鳴ります。

| OS | 使われる仕組み |
|----|--------------|
| macOS | `say`（音声読み上げ）＋ `afplay` 効果音 |
| Windows（Git Bash / WSL） | PowerShell `System.Speech.Synthesis` 音声読み上げ |
| Linux | `spd-say` → `paplay` → 端末ベル の順にフォールバック |

読み上げが不要で効果音だけにしたい等の調整は `scripts/hooks/notify.sh` の
`notify_local()` を編集してください。

---

## B. Web版・クラウド環境で使う場合（ntfy プッシュ）

クラウドのコンテナ内では音は鳴らせないため、**スマホへプッシュ通知**を飛ばします。

### 手順

1. **スマホに ntfy アプリを入れる**
   - iOS / Android の「ntfy」アプリ（無料・登録不要）をインストール。

2. **専用トピック名を決めて購読する**
   - 推測されにくい名前にする（例: `claude-eiji-8f3k2q7z`）。
   - アプリで同じトピック名を「Subscribe」する。
   - ⚠️ トピック名を知る人は誰でも通知を送受信できます。共有しないでください。

3. **リポジトリにトピックを設定する**（どちらか一方）

   **方法1: 設定ファイル（推奨）**
   ```bash
   cp .claude/ntfy-topic.txt.example .claude/ntfy-topic.txt
   # .claude/ntfy-topic.txt を開き、決めたトピック名を1行だけ記入
   ```
   このファイルは `.gitignore` 済みでコミットされません。

   **方法2: 環境変数**
   ```bash
   export CLAUDE_NTFY_TOPIC="claude-eiji-8f3k2q7z"
   ```

4. **動作確認**
   ```bash
   echo '{"message":"テスト"}' | CLAUDE_NTFY_TOPIC=あなたのトピック \
     CLAUDE_NOTIFY_MODE=push bash scripts/hooks/notify.sh stop
   ```
   スマホに通知が届けば成功です。

### ⚠️ クラウドの egress ポリシーに注意

このリポジトリのクラウド実行環境は、外部通信が**許可されたホストのみ**に
制限されている場合があります（2026-07-08 時点で `ntfy.sh` は既定で **拒否**）。
その場合、環境のネットワークポリシーで `ntfy.sh`（または自ホストの ntfy サーバー）を
**allowlist に追加**してください。
参考: https://code.claude.com/docs/en/claude-code-on-the-web

自前の ntfy サーバーを使う場合:
```bash
export CLAUDE_NTFY_SERVER="https://ntfy.example.com"
```

---

## C. まず標準通知を試す（構築ゼロの代替）

Claude のモバイル/デスクトップアプリには、セッションが入力待ちになった時・
完了した時にプッシュ通知を送る機能が標準搭載されています。アプリの通知設定を
ON にするだけで、egress ポリシーの影響を受けずに使えます。本フックはこれを
補完・カスタマイズするものです。

---

## トラブルシューティング

| 症状 | 対処 |
|------|------|
| クラウドで通知が来ない | egress ポリシーで `ntfy.sh` が拒否されていないか確認（上記 B）。プロキシ状態は `curl -sS "$HTTPS_PROXY/__agentproxy/status"` |
| ローカルで音が鳴らない | `CLAUDE_NOTIFY_MODE=local` で明示。macOS は `say` の存在、Linux は `spd-say`/`paplay` を確認 |
| 通知を一時的に止めたい | `export CLAUDE_NOTIFY_MODE=off` |
| 通知文言を変えたい | `scripts/hooks/notify.sh` の `case "$EVENT_TYPE"` ブロックを編集 |
