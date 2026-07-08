#!/usr/bin/env bash
# notify.sh — 承認待ち / 作業完了を音声で通知する汎用フック
#
# Claude Code の Notification / Stop フックから呼ばれる。
#   引数 $1: イベント種別 ("notification" = 承認・入力待ち / "stop" = 応答完了)
#   stdin : Claude Code が渡すイベント JSON ( .message / .cwd / .session_id )
#
# 通知経路（環境に応じて自動選択）:
#   1. ntfy プッシュ  — CLAUDE_NTFY_TOPIC 環境変数 or .claude/ntfy-topic.txt が
#      設定されていれば、ntfy.sh（自ホスト可）経由でスマホ等へ音声プッシュ。
#      ※クラウド環境では egress ポリシーで ntfy.sh の許可が必要。
#   2. ローカル音声  — ntfy 未設定 or 送信失敗時、実行マシンで音を鳴らす
#      (macOS: say / Windows: SpeechSynthesizer / Linux: spd-say|paplay|ベル)。
#
# 動作モード（CLAUDE_NOTIFY_MODE）: auto(既定) | push | local | off
# 常に exit 0（通知失敗で Claude の動作をブロックしない）。

set -o pipefail

EVENT_TYPE="${1:-notification}"
MODE="${CLAUDE_NOTIFY_MODE:-auto}"
[ "$MODE" = "off" ] && exit 0

INPUT="$(cat 2>/dev/null || true)"

# --- stdin JSON からフィールド抽出 ---
json_field() {
  [ -n "$INPUT" ] && command -v jq >/dev/null 2>&1 || { echo ""; return; }
  printf '%s' "$INPUT" | jq -r ".$1 // empty" 2>/dev/null || echo ""
}
MSG="$(json_field message)"
CWD="$(json_field cwd)"
PROJECT="$(basename "${CWD:-$PWD}")"

# --- イベント種別ごとの文言 ---
case "$EVENT_TYPE" in
  stop)
    TITLE="Claude Code"
    BODY="✅ 作業完了 [$PROJECT] — ${MSG:-応答が完了しました。確認をお願いします。}"
    VOICE_JA="作業が完了しました。確認をお願いします。"
    PRIORITY="default"; TAGS="white_check_mark"; SOUND="Glass" ;;
  *)
    TITLE="Claude Code"
    BODY="🔔 承認が必要 [$PROJECT] — ${MSG:-承認または入力を待っています。}"
    VOICE_JA="承認が必要です。"
    PRIORITY="high"; TAGS="bell"; SOUND="Ping" ;;
esac

# --- 通知先トピックの解決（環境変数 > 設定ファイル） ---
resolve_topic() {
  if [ -n "${CLAUDE_NTFY_TOPIC:-}" ]; then echo "$CLAUDE_NTFY_TOPIC"; return; fi
  local f; f="$(cd "$(dirname "$0")/../.." 2>/dev/null && pwd)/.claude/ntfy-topic.txt"
  [ -f "$f" ] && tr -d '[:space:]' < "$f" || echo ""
}

# --- ntfy プッシュ送信 ---
push_ntfy() {
  local topic="$1" server="${CLAUDE_NTFY_SERVER:-https://ntfy.sh}"
  local ca=""; [ -f /root/.ccr/ca-bundle.crt ] && ca="--cacert /root/.ccr/ca-bundle.crt"
  # shellcheck disable=SC2086
  curl -fsS -m 15 $ca \
    -H "Title: $TITLE" -H "Priority: $PRIORITY" -H "Tags: $TAGS" \
    -d "$BODY" "$server/$topic" >/dev/null 2>&1
}

# --- ローカル音声通知 ---
notify_local() {
  if command -v say >/dev/null 2>&1; then                 # macOS
    command -v afplay >/dev/null 2>&1 && \
      afplay "/System/Library/Sounds/$SOUND.aiff" 2>/dev/null &
    say "$VOICE_JA" >/dev/null 2>&1 &
  elif command -v powershell.exe >/dev/null 2>&1; then    # Windows (Git Bash/WSL)
    powershell.exe -NoProfile -Command \
      "Add-Type -AssemblyName System.Speech; \
       (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('$VOICE_JA')" \
      >/dev/null 2>&1 &
  elif command -v spd-say >/dev/null 2>&1; then           # Linux (speech-dispatcher)
    spd-say "$VOICE_JA" >/dev/null 2>&1 &
  elif command -v paplay >/dev/null 2>&1; then            # Linux (PulseAudio ベル)
    paplay /usr/share/sounds/freedesktop/stereo/complete.oga >/dev/null 2>&1 &
  else
    printf '\a' >&2                                        # 端末ベル
  fi
}

TOPIC="$(resolve_topic)"
PUSH_OK=1

if [ "$MODE" = "push" ] || [ "$MODE" = "auto" ]; then
  if [ -n "$TOPIC" ]; then
    push_ntfy "$TOPIC"; PUSH_OK=$?
  else
    PUSH_OK=1
  fi
fi

# ローカル音声: mode=local、または auto でプッシュ未送信/失敗時
if [ "$MODE" = "local" ] || { [ "$MODE" = "auto" ] && [ "$PUSH_OK" -ne 0 ]; }; then
  notify_local
fi

exit 0
