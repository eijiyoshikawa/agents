#!/usr/bin/env python3
"""Ops Cockpit — 組織状態ダッシュボード（静的HTML）を生成する。

agents/*/output.json・daily_reports・bids・learnings をスキャンし、
外部依存ゼロの自己完結 HTML を ops-cockpit.html に出力する。
読み取り専用（リポジトリ内の既存ファイルは一切変更しない）。

使い方:
  python3 scripts/build-cockpit.py            # ops-cockpit.html を生成
  python3 scripts/build-cockpit.py --out PATH # 出力先を指定
"""
import json
import html
import sys
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOKEN_BUDGET = 2000       # output.json の上限目安（CLAUDE.md）
PROMPT_LINE_BUDGET = 200  # prompt.md の上限目安（CLAUDE.md）
STALE_DAYS = 7            # 出力が古いとみなす日数


def estimate_tokens(path: Path) -> int:
    """日本語混在テキストの近似: バイト数 / 3（context-budget.sh と同一基準）"""
    try:
        return path.stat().st_size // 3
    except OSError:
        return 0


def scan_agents():
    rows = []
    for d in sorted((ROOT / "agents").iterdir()):
        prompt = d / "prompt.md"
        if not d.is_dir() or not prompt.exists():
            continue  # outputs/ projects/ orchestrator 等はスキップ
        out = d / "output.json"
        row = {"name": d.name, "prompt_lines": sum(1 for _ in prompt.open(encoding="utf-8", errors="replace"))}
        if out.exists():
            row["tokens"] = estimate_tokens(out)
            row["mtime"] = datetime.fromtimestamp(out.stat().st_mtime)
            try:
                json.loads(out.read_text(encoding="utf-8"))
                row["json_ok"] = True
            except (json.JSONDecodeError, UnicodeDecodeError):
                row["json_ok"] = False
        rows.append(row)
    return rows


def latest_files(dirpath: Path, pattern: str, n: int = 5):
    if not dirpath.is_dir():
        return []
    files = sorted(dirpath.glob(pattern), key=lambda p: p.stat().st_mtime, reverse=True)
    return [(f.name, datetime.fromtimestamp(f.stat().st_mtime)) for f in files[:n]]


def status_of(row, now):
    if "tokens" not in row:
        return "idle", "出力なし"
    if not row["json_ok"]:
        return "err", "JSON不正"
    problems = []
    if row["tokens"] > TOKEN_BUDGET:
        problems.append(f"予算超過 {row['tokens']}tok")
    if row["prompt_lines"] > PROMPT_LINE_BUDGET:
        problems.append(f"prompt {row['prompt_lines']}行")
    if now - row["mtime"] > timedelta(days=STALE_DAYS):
        problems.append(f"{(now - row['mtime']).days}日更新なし")
    return ("warn", " / ".join(problems)) if problems else ("ok", "")


def build_html(now):
    agents = scan_agents()
    reports = latest_files(ROOT / "daily_reports", "*.md")
    bids = latest_files(ROOT / "bids", "*.md", 3)
    instincts = len(list((ROOT / "learnings" / "instincts").glob("*.json"))) if (ROOT / "learnings" / "instincts").is_dir() else 0

    counts = {"ok": 0, "warn": 0, "err": 0, "idle": 0}
    agent_rows = []
    for r in agents:
        st, note = status_of(r, now)
        counts[st] += 1
        mtime = r["mtime"].strftime("%m/%d %H:%M") if "mtime" in r else "—"
        tokens = f'{r["tokens"]}' if "tokens" in r else "—"
        agent_rows.append(
            f'<tr class="{st}"><td>{html.escape(r["name"])}</td>'
            f'<td class="badge-cell"><span class="badge {st}">{st.upper()}</span></td>'
            f'<td class="num">{tokens}</td><td class="num">{r["prompt_lines"]}</td>'
            f'<td>{mtime}</td><td>{html.escape(note)}</td></tr>'
        )

    report_items = "".join(f"<li><code>{html.escape(n)}</code> <span class='dim'>{t.strftime('%m/%d')}</span></li>" for n, t in reports) or "<li class='dim'>なし</li>"
    bid_items = "".join(f"<li><code>{html.escape(n)}</code> <span class='dim'>{t.strftime('%m/%d')}</span></li>" for n, t in bids) or "<li class='dim'>なし</li>"
    last_report_age = (now - reports[0][1]).days if reports else None
    report_note = "" if last_report_age is None else (f"最終更新から {last_report_age} 日" if last_report_age > 1 else "最新")

    return f"""<!doctype html>
<html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ops Cockpit</title>
<style>
:root {{ --bg:#f7f6f3; --card:#fff; --ink:#1a1a1a; --dim:#8a8578; --line:#e6e2d8;
  --ok:#2c7a4b; --warn:#b7791f; --err:#c53030; --idle:#a0aec0; }}
@media (prefers-color-scheme: dark) {{
  :root {{ --bg:#15140f; --card:#201e17; --ink:#ece8dd; --dim:#8a8578; --line:#35322a; }} }}
* {{ box-sizing:border-box; margin:0 }}
body {{ background:var(--bg); color:var(--ink); font-family:"Hiragino Sans","Noto Sans JP",sans-serif;
  padding:2rem clamp(1rem,4vw,3rem); line-height:1.6 }}
h1 {{ font-size:1.4rem; letter-spacing:.02em }}
h2 {{ font-size:1rem; margin-bottom:.6rem }}
.sub {{ color:var(--dim); font-size:.85rem; margin-bottom:1.5rem }}
.tiles {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:.8rem; margin-bottom:1.5rem }}
.tile {{ background:var(--card); border:1px solid var(--line); border-radius:10px; padding:.9rem 1.1rem }}
.tile .v {{ font-size:1.6rem; font-weight:700 }}
.tile .l {{ color:var(--dim); font-size:.78rem }}
.grid {{ display:grid; grid-template-columns:2fr 1fr; gap:1rem; align-items:start }}
@media (max-width:900px) {{ .grid {{ grid-template-columns:1fr }} }}
.card {{ background:var(--card); border:1px solid var(--line); border-radius:10px; padding:1.1rem 1.2rem; margin-bottom:1rem; overflow-x:auto }}
table {{ border-collapse:collapse; width:100%; font-size:.82rem }}
th,td {{ text-align:left; padding:.35rem .6rem; border-bottom:1px solid var(--line); white-space:nowrap }}
th {{ color:var(--dim); font-weight:600 }}
td.num {{ text-align:right; font-variant-numeric:tabular-nums }}
.badge {{ font-size:.68rem; font-weight:700; padding:.1rem .45rem; border-radius:99px; color:#fff }}
.badge.ok {{ background:var(--ok) }} .badge.warn {{ background:var(--warn) }}
.badge.err {{ background:var(--err) }} .badge.idle {{ background:var(--idle) }}
tr.err td {{ background:color-mix(in srgb, var(--err) 8%, transparent) }}
ul {{ list-style:none }} li {{ padding:.15rem 0 }}
code {{ font-size:.8rem }} .dim {{ color:var(--dim) }}
</style></head><body>
<h1>🛩 Ops Cockpit — AIエージェント組織</h1>
<p class="sub">生成: {now.strftime("%Y-%m-%d %H:%M")} ／ 再生成: <code>python3 scripts/build-cockpit.py</code></p>
<div class="tiles">
  <div class="tile"><div class="v">{len(agents)}</div><div class="l">エージェント（prompt.md 保有）</div></div>
  <div class="tile"><div class="v" style="color:var(--ok)">{counts["ok"]}</div><div class="l">OK</div></div>
  <div class="tile"><div class="v" style="color:var(--warn)">{counts["warn"]}</div><div class="l">要対応（WARN）</div></div>
  <div class="tile"><div class="v" style="color:var(--err)">{counts["err"]}</div><div class="l">エラー</div></div>
  <div class="tile"><div class="v">{instincts}</div><div class="l">インスティンクト蓄積</div></div>
</div>
<div class="grid">
<div class="card"><h2>エージェント出力の状態</h2>
<table><thead><tr><th>agent</th><th>状態</th><th>推定tok</th><th>prompt行</th><th>出力更新</th><th>備考</th></tr></thead>
<tbody>{"".join(agent_rows)}</tbody></table>
<p class="dim" style="margin-top:.5rem;font-size:.75rem">基準: 出力 ≤ {TOKEN_BUDGET}tok / prompt ≤ {PROMPT_LINE_BUDGET}行 / 更新 {STALE_DAYS}日以内。詳細検証は <code>bash scripts/qa-gate.sh --all</code></p>
</div>
<div>
<div class="card"><h2>日次レポート <span class="dim" style="font-weight:400">{report_note}</span></h2><ul>{report_items}</ul></div>
<div class="card"><h2>入札ウォッチ</h2><ul>{bid_items}</ul></div>
<div class="card"><h2>今日の運用（docs/OPERATIONS.md）</h2>
<ul><li>1. <code>/daily-report</code> で日報一次案</li>
<li>2. WARN/ERR エージェントを差し戻し</li>
<li>3. 案件あれば <code>/run-pipeline</code> / <code>/sns-batch</code></li></ul></div>
</div></div>
</body></html>"""


def main():
    out = ROOT / "ops-cockpit.html"
    args = sys.argv[1:]
    if "--out" in args:
        out = Path(args[args.index("--out") + 1])
    now = datetime.now()
    out.write_text(build_html(now), encoding="utf-8")
    print(f"生成完了: {out}")


if __name__ == "__main__":
    main()
