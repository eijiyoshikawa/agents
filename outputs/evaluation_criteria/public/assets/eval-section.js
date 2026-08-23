/**
 * リアルタイム実績セクション (評価制度 × 財務ダッシュボード連携)
 *
 * <section id="eval-live" data-src="/data/eval-xxx.enc.json"
 *          data-key="let_auth_xxx" data-dept="営業"> に、
 * slack-let から焼き付けた暗号化実績データ (scripts/bake-eval-data.mjs) を
 * ページのパスワードで復号して描画する。
 *
 * データは AES-GCM で暗号化されており、パスワードなしでは
 * HTMLソース・データファイルを見ても数値は読めない。
 * パスワードは認証ゲート通過時に sessionStorage (<key>_pw) へ保持される。
 */
(function () {
  const root = document.getElementById("eval-live");
  if (!root) return;
  // データ候補 (先頭から順に取得を試す):
  //   data-srcs="url1 url2 ..." 空白区切り。通常は
  //   [動的配信(部門), 動的配信(経営陣), 静的焼き付け(部門), 静的焼き付け(経営陣)]
  //   の順で、slack-let の動的配信が最新・静的ファイルは障害時フォールバック。
  // 旧形式 data-src / data-src-alt も引き続きサポート。
  const SRCS = (root.dataset.srcs
    ? root.dataset.srcs.split(/\s+/)
    : [root.dataset.src, root.dataset.srcAlt]
  ).filter(Boolean);
  const KEY = root.dataset.key + "_pw";
  const DEPT = root.dataset.dept || "";

  const css = `
  #eval-live{margin:48px auto 24px;max-width:1080px;padding:0 16px;font-feature-settings:"tnum";color:#1a1a1a}
  #eval-live .ev-head{border-top:3px solid #1a1a2e;padding-top:20px;margin-bottom:4px;font-size:1.4rem;font-weight:700;color:#1a1a1a}
  #eval-live .ev-sub{color:#777;font-size:.78rem;margin-bottom:18px}
  #eval-live .ev-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}
  #eval-live .ev-card{border:1px solid #e2e2e8;border-radius:12px;padding:18px 20px;background:#fff;color:#1a1a1a;box-shadow:0 1px 3px rgba(0,0,0,.04)}
  #eval-live .ev-name{font-weight:700;font-size:1.05rem;display:flex;justify-content:space-between;align-items:baseline}
  #eval-live .ev-dept{font-size:.7rem;background:#eef0ff;color:#4550b5;padding:2px 8px;border-radius:99px}
  #eval-live .ev-kpis{display:flex;flex-wrap:wrap;gap:14px 20px;margin:12px 0}
  #eval-live .ev-kpis b{display:block;font-size:1.25rem}
  #eval-live .ev-kpis span{font-size:.7rem;color:#888}
  #eval-live .ev-pos{color:#0a7d4f}#eval-live .ev-neg{color:#c0392b}#eval-live .ev-warn-txt{color:#b8860b}
  #eval-live table.ev-cost{width:100%;border-collapse:collapse;font-size:.82rem;margin:6px 0}
  #eval-live table.ev-cost td{padding:4px 2px;border-bottom:1px solid #f0f0f3}
  #eval-live table.ev-cost td:last-child{text-align:right;white-space:nowrap}
  #eval-live .ev-note{font-size:.72rem;color:#999;margin-top:6px}
  #eval-live .ev-bar{height:8px;border-radius:99px;background:#ececf1;overflow:hidden;margin-top:4px}
  #eval-live .ev-bar i{display:block;height:100%}
  #eval-live details{margin-top:8px;font-size:.78rem}
  #eval-live details summary{cursor:pointer;color:#4550b5}
  #eval-live .ev-box{border:1px dashed #ccc;border-radius:12px;padding:20px;text-align:center;color:#777;font-size:.85rem}
  #eval-live .ev-common{border:1px solid #e2e2e8;border-radius:12px;padding:14px 20px;margin-top:16px;font-size:.82rem;background:#fff;color:#1a1a1a}
  #eval-live .ev-warn{background:#fff8e6;border:1px solid #f0d890;border-radius:10px;padding:10px 14px;font-size:.76rem;color:#8a6d1a;margin-bottom:14px}
  #eval-live input.ev-pw{padding:8px 12px;border:1px solid #ccc;border-radius:8px;font-size:.9rem;background:#fff;color:#1a1a1a}
  #eval-live button.ev-btn{padding:8px 16px;border:0;border-radius:8px;background:#1a1a2e;color:#fff;font-size:.85rem;cursor:pointer;margin-left:8px}
  /* ページ本体は常にライトデザインのため、OSダークモードでも配色を固定する
     (以前は dark 時にカード背景だけ暗転し文字色が黒のまま→読めない問題があった) */`;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const yen = (n) =>
    n == null ? "—" : (n < 0 ? "▲" : "") + "¥" + Math.abs(Math.round(n)).toLocaleString("ja-JP");
  const pct = (n) => (n == null ? "—" : (n * 100).toFixed(1) + "%");
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  function b64ToBuf(b64) {
    const bin = atob(b64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return buf;
  }

  async function decrypt(payload, password) {
    const enc = new TextEncoder();
    const baseKey = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: b64ToBuf(payload.salt), iterations: payload.iter, hash: "SHA-256" },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: b64ToBuf(payload.iv) },
      key,
      b64ToBuf(payload.ct)
    );
    return JSON.parse(new TextDecoder().decode(plain));
  }

  function breakdown(label, rows) {
    if (!rows || !rows.length) return "";
    const body = rows
      .map((r) => `<tr><td>${esc(r.client)}</td><td>${yen(r.amount)}</td></tr>`)
      .join("");
    return `<details><summary>${esc(label)} (${rows.length}件)</summary><table class="ev-cost">${body}</table></details>`;
  }

  function targetBar(m) {
    if (m.target_ratio == null)
      return '<div class="ev-note">目標未設定（メンバーマスタの「月次粗利目標」記入で到達率が出ます）</div>';
    const r = Math.max(0, m.target_ratio);
    const color = r >= 1 ? "#0a7d4f" : r >= 0.8 ? "#d9a520" : "#c0392b";
    return `<div style="margin-top:10px">
      <div style="display:flex;justify-content:space-between;font-size:.74rem;color:#888">
        <span>目標到達率（月平均粗利 ÷ 目標 ${yen(m.monthly_target)}）</span>
        <b style="color:${color}">${pct(m.target_ratio)}</b>
      </div>
      <div class="ev-bar"><i style="width:${Math.min(100, r * 100)}%;background:${color}"></i></div>
    </div>`;
  }

  function card(m) {
    const isSales = m.dept === "営業";
    const costRows = [
      ["人件費（実額）", m.labor_cost, m.monthly_labor_cost != null ? `月額 ${yen(m.monthly_labor_cost)} × ${m.months_elapsed}ヶ月` : "メンバーマスタ未記入"],
    ];
    if (isSales) costRows.push(["精算経費（旅費交通費・接待交際費など）", m.expense_cost, null]);
    else {
      costRows.push(["広告宣伝費（担当クライアント）", m.ad_cost, null]);
      costRows.push(["外注費（担当クライアント）", m.outsource_cost, null]);
    }
    const gp = m.gross_profit;
    // 原価率 = 原価合計 ÷ 売上 (売上ゼロ時は表示しない)
    const costRatio = m.total_cost != null && m.sales > 0 ? m.total_cost / m.sales : null;
    const costRatioColor = costRatio == null ? "" : costRatio >= 1 ? "ev-neg" : costRatio >= 0.8 ? "ev-warn-txt" : "";
    return `<div class="ev-card">
      <div class="ev-name">${esc(m.name)}<span class="ev-dept">${esc(m.dept)}</span></div>
      <div class="ev-kpis">
        <div><span>当期売上</span><b>${yen(m.sales)}</b></div>
        <div><span>当期粗利</span><b class="${gp == null ? "" : gp >= 0 ? "ev-pos" : "ev-neg"}">${yen(gp)}</b></div>
        <div><span>原価率</span><b class="${costRatioColor}">${costRatio != null ? pct(costRatio) : "—"}</b></div>
        <div><span>粗利率 / 月平均</span><b style="font-size:.95rem">${pct(m.gross_margin)} / ${yen(m.monthly_avg_profit)}</b></div>
      </div>
      <table class="ev-cost">${costRows
        .map(([l, v, sub]) => `<tr><td>${esc(l)}${sub ? `<div class="ev-note">${esc(sub)}</div>` : ""}</td><td>${yen(v)}</td></tr>`)
        .join("")}
        <tr><td><b>原価合計</b></td><td><b>${yen(m.total_cost)}</b></td></tr></table>
      ${m.advance_balance ? `<div class="ev-note">参考: 未精算の立替金残高 ${yen(m.advance_balance)}（原価には含めていません）</div>` : ""}
      ${breakdown("クライアント別売上", m.sales_by_client)}
      ${breakdown("クライアント別広告宣伝費", m.ad_by_client)}
      ${breakdown("クライアント別外注費", m.outsource_by_client)}
      ${targetBar(m)}
    </div>`;
  }

  function render(data) {
    const members = DEPT ? data.members.filter((m) => m.dept === DEPT) : data.members;
    const missing = (data.data_quality && data.data_quality.members_without_labor_cost) || [];
    const missingHere = missing.filter((n) => members.some((m) => m.name === n));
    const c = data.common || {};
    const showCommon = !DEPT || DEPT === "マーケティング";
    root.innerHTML = `
      <div class="ev-head">📊 リアルタイム実績（${esc(data.fy_label)}）</div>
      <div class="ev-sub">MF会計の実仕訳ベース / 集計期間 ${esc(data.period.from)} 〜 ${esc(data.period.to)} / データ更新 ${esc((data.generated_at || "").slice(0, 10))}。当会計年度のみ表示（通算表記なし）</div>
      ${missingHere.length ? `<div class="ev-warn">⚠️ 月額人件費が未登録のため粗利を計算できません: ${esc(missingHere.join("・"))}（Notion「メンバーマスタ」に記入後、再反映で表示されます）</div>` : ""}
      <div class="ev-grid">${members.map(card).join("") || '<div class="ev-box">対象メンバーのデータがありません</div>'}</div>
      ${showCommon ? `<div class="ev-common"><b>個人に配賦していない金額（共通・未名寄せ）</b>
        <table class="ev-cost">
          <tr><td>自社SNS外注（マーケ部門共通原価）</td><td>${yen(c.own_sns_outsourcing)}</td></tr>
          <tr><td>共通広告宣伝費（クライアント不明）</td><td>${yen(c.common_ads)}</td></tr>
          <tr><td>共通外注費（クライアント不明）</td><td>${yen(c.common_outsourcing)}</td></tr>
          <tr><td>未名寄せ売上（どの担当にも紐付かない）</td><td>${yen(c.unmatched_sales)}</td></tr>
        </table>
        <div class="ev-note">名寄せ（担当マッピングのMF取引先名記入）が進むと各担当へ自動で振り分かります</div></div>` : ""}
    `;
  }

  /** パスワードを全候補データに順に試し、最初に復号できたものを返す */
  async function tryDecrypt(payloads, password) {
    for (const payload of payloads) {
      try {
        return await decrypt(payload, password);
      } catch (e) { /* 次の候補へ */ }
    }
    return null;
  }

  function askPassword(payloads, message) {
    root.innerHTML = `
      <div class="ev-head">📊 リアルタイム実績</div>
      <div class="ev-box">
        <div style="margin-bottom:10px">${esc(message || "実績データを表示するには、このページのパスワードを入力してください")}</div>
        <input class="ev-pw" type="password" placeholder="パスワード" />
        <button class="ev-btn">表示</button>
      </div>`;
    const input = root.querySelector("input");
    const tryUnlock = async () => {
      const data = await tryDecrypt(payloads, input.value);
      if (data) {
        sessionStorage.setItem(KEY, input.value);
        render(data);
      } else {
        askPassword(payloads, "パスワードが違います。もう一度入力してください");
      }
    };
    root.querySelector("button").addEventListener("click", tryUnlock);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") tryUnlock(); });
  }

  async function main() {
    const payloads = [];
    for (const src of SRCS) {
      try {
        const res = await fetch(src, { cache: "no-store" });
        if (res.ok) payloads.push(await res.json());
      } catch (e) { /* 未焼き付けのファイルはスキップ */ }
    }
    if (!payloads.length) {
      root.innerHTML = `<div class="ev-head">📊 リアルタイム実績</div>
        <div class="ev-box">実績データはまだ反映されていません。<br>ターミナルで <code>node scripts/bake-eval-data.mjs</code> を実行してデプロイすると表示されます。</div>`;
      return;
    }
    // 認証ゲートで保持したパスワード (部門用 or 経営陣用) を先に試す
    for (const k of [KEY, "let_auth_exec_pw"]) {
      const saved = sessionStorage.getItem(k);
      if (!saved) continue;
      const data = await tryDecrypt(payloads, saved);
      if (data) {
        render(data);
        return;
      }
    }
    askPassword(payloads);
  }

  main();
})();
