// 階段 9：全班培育計畫儀表板（只做統計，不使用 AI）

function dashStats(roster, getNote, includeDraft) {
  const all = roster.filter((r) => r.id > 0);
  const id = (r) => String(r.id);
  const sent = all.filter((r) => getNote("row", id(r), 8, "submitted"));
  const base = includeDraft ? all : sent;
  const abil = (r) => (getNote("row", id(r), 7, "q2") || "").split("||").filter(Boolean);
  const withAb = base.filter((r) => abil(r).length);
  const abilities = ABILITIES.map((a) => ({ label: a, n: withAb.filter((r) => abil(r).includes(a)).length }));
  const q3 = ["已有具體觀察", "尚待觀察驗證"].map((o) => ({ label: o, n: base.filter((r) => getNote("row", id(r), 7, "q3") === o).length }));
  const qs = F_QUESTIONS.map((q) => {
    const vals = (r) => { const v = getNote(...fLoc(q, r)) || ""; return q.multi ? v.split("||").filter((x) => q.opts.includes(x)) : (q.opts.includes(v) ? [v] : []); };
    // 教練題：同一位教練的多位新手只算一次
    const seen = new Set();
    const units = q.perCoach ? base.filter((r) => (seen.has(r.row_id) ? false : (seen.add(r.row_id), true))) : base;
    const answered = units.filter((r) => vals(r).length);
    return { q: q.q, multi: !!q.multi, unit: q.perCoach ? "位教練" : "組培育小組", total: answered.length, opts: q.opts.map((o) => ({ label: o, n: answered.filter((r) => vals(r).includes(o)).length })) };
  });
  return { total: all.length, sent: sent.length, base: base.length, withAb: withAb.length, abilities, q3, qs };
}

function dashHtml(s, big) {
  const pct = (n, t) => (t ? Math.round((n / t) * 100) : 0);
  const bars = (items, total, color, u) => items.map((x) => {
    const p = pct(x.n, total);
    return `<div style="margin:${big ? 10 : 6}px 0;break-inside:avoid"><div class="row" style="justify-content:space-between;gap:8px;font-size:${big ? 22 : 14}px"><span>${esc(x.label)}</span><b>${x.n} ${u || "組"}・${p}%</b></div>
      <div class="bar" style="height:${big ? 18 : 10}px"><i style="width:${p}%;background:${color || "var(--brand)"}"></i></div></div>`;
  }).join("");
  const stat = (n, t, label) => `<div class="card" style="margin:0;text-align:center"><div style="font-size:${big ? 64 : 40}px;font-weight:700;color:var(--brand);line-height:1.1">${pct(n, t)}%</div>
    <div style="font-size:${big ? 22 : 15}px">${label}</div><div class="hint" style="font-size:${big ? 18 : 13}px">${n}／${t} 組培育小組</div></div>`;
  const h = (t) => `<h2 style="font-size:${big ? 28 : 20}px">${t}</h2>`;
  const den = s.base || s.total;
  return `<div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(${big ? 260 : 200}px,1fr));gap:12px">
      ${stat(s.sent, s.total, "已送出培育計畫")}${stat(s.withAb, den, "已設定想發展的能力")}${stat(s.q3[0].n, den, "已有具體觀察")}</div>
    ${h("八大能力：各被選為優先培育的比例")}<p class="hint" style="font-size:${big ? 18 : 13}px;margin:0">以已設定能力的 ${s.withAb} 組培育小組為 100%（可複選，加總會超過 100%）</p>
    <div class="card" style="${big ? "columns:2;column-gap:36px" : ""}">${bars(s.abilities.slice().sort((a, b) => b.n - a.n), s.withAb)}</div>
    ${h("可行性檢查：各題各選項的回答狀況")}
    <div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(${big ? 380 : 280}px,1fr));gap:12px">${s.qs.map((q, i) => `<div class="card" style="margin:0"><div class="q" style="font-size:${big ? 22 : 16}px">${i + 1}. ${esc(q.q)}</div><p class="hint" style="font-size:${big ? 16 : 13}px;margin:0">共 ${q.total} ${q.unit}回答${q.multi ? "（可複選）" : ""}</p>${bars(q.opts, q.total, "var(--accent)", q.unit === "位教練" ? "位" : "組")}</div>`).join("")}</div>`;
}

// ---- Facilitator 後台的儀表板分頁（依賴 admin.js 的 D、nv）----
let dashDraft = false;
function pDash() {
  const pane = document.getElementById("pane");
  const st = dashStats(D.roster, nv, dashDraft);
  pane.innerHTML = `<div class="row" style="margin:6px 0 10px"><button class="btn" id="dashProj">▶ 投影</button>
    <label class="hint"><input type="checkbox" id="dashDraft" ${dashDraft ? "checked" : ""}> 也納入尚未送出的草稿（預設只統計已送出的）</label></div>
    <p class="hint">目前已送出 ${st.sent}／${st.total} 組培育小組的培育計畫。畫面每 5 秒自動更新。</p>${dashHtml(st, false)}`;
  document.getElementById("dashDraft").onchange = (e) => { dashDraft = e.target.checked; pDash(); };
  document.getElementById("dashProj").onclick = () => {
    document.getElementById("projLayer")?.remove();
    const o = document.createElement("div"); o.id = "projLayer";
    o.style.cssText = "position:fixed;inset:0;z-index:90;background:var(--bg);color:var(--ink);overflow:auto;padding:3vh 5vw";
    const paint = () => {
      o.innerHTML = `<div class="row" style="justify-content:space-between"><h1 style="margin:0">全班培育計畫概況</h1><button class="btn" id="pClose">結束</button></div>` + dashHtml(dashStats(D.roster, nv, dashDraft), true);
      o.querySelector("#pClose").onclick = close;
    };
    const timer = setInterval(paint, 5000);
    const close = () => { clearInterval(timer); o.remove(); document.removeEventListener("keydown", key); };
    const key = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", key); (document.fullscreenElement || document.body).appendChild(o); paint();
  };
}
