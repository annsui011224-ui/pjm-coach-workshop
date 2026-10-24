// Facilitator 後台
let PASS = null, D = null, tab = "stage";
const $app = document.getElementById("app");
const toast = (t) => { const d = document.createElement("div"); d.className = "toast"; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 3000); };
const rpc = async (fn, args) => { const { data, error } = await sb.rpc(fn, { p: PASS, ...args }); if (error) { toast("失敗：" + error.message); throw error; } return data; };

async function start() {
  PASS = sessionStorage.getItem("pjm_pass");
  if (PASS && (await sb.rpc("pjm_admin_check", { p: PASS })).data === true) return load();
  $app.innerHTML = `<div class="card" style="max-width:380px;margin:60px auto"><h3>請輸入 facilitator 通行碼</h3>
    <input type="text" id="pw" placeholder="通行碼" autocomplete="off" autocapitalize="off" spellcheck="false" lang="en" inputmode="latin" style="-webkit-text-security:disc;text-security:disc">
    <p class="row"><button class="btn" id="go">進入</button><label class="hint"><input type="checkbox" id="showpw"> 顯示輸入內容</label></p></div>`;
  document.getElementById("showpw").onchange = (e) => { document.getElementById("pw").style.webkitTextSecurity = e.target.checked ? "none" : "disc"; };
  document.getElementById("pw").focus();
  const go = async () => {
    const v = document.getElementById("pw").value;
    const { data } = await sb.rpc("pjm_admin_check", { p: v });
    if (data === true) { PASS = v; sessionStorage.setItem("pjm_pass", v); load(); } else toast("通行碼不正確");
  };
  document.getElementById("go").onclick = go;
  document.getElementById("pw").addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
}

async function load(keepFocus) {
  D = await loadAll();
  D.noteMap = new Map(D.notes.map((n) => [nkey(n.scope, n.scope_key, n.stage, n.field), n.value]));
  document.getElementById("stageNow").textContent = `目前：${STAGE[D.stage].title}`;
  // 背景輪詢只更新「階段控制」與「報到」，避免洗掉座位／摘要頁尚未儲存的輸入
  // 階段控制頁只更新左右兩塊內容，不重畫整頁（才不會中斷全螢幕投影）
  if (keepFocus && tab === "stage" && document.getElementById("projBody")) { await paintStage(); return; }
  if (!keepFocus || tab === "stage" || tab === "reg" || tab === "share" || tab === "dash" || tab === "teams") draw();
}
setInterval(() => PASS && load(true), 5000);

const nv = (s, k, st, f) => D.noteMap.get(nkey(s, k, st, f)) || "";
const participants = () => D.people.filter((p) => p.unit);
const regOf = (id) => D.regs.find((r) => r.person_id === id);

function draw() {
  const tabs = [["stage", "階段控制"], ["reg", "行前準備狀況"], ["seat", "跨產品分組"], ["teams", "培育小組"], ["share", "小組分享（投影）"], ["dash", "培育計畫儀表板"], ["photos", "工作坊剪影"], ["out", "嘉賓回饋整理"], ["data", "資料管理"]];
  $app.innerHTML = `<div class="row" style="margin:16px 0">${tabs.map(([k, l]) => `<button class="chip ${tab === k ? "on" : ""}" data-tab="${k}">${l}</button>`).join("")}</div><div id="pane"></div>`;
  $app.querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => { tab = b.dataset.tab; draw(); }));
  ({ stage: pStage, reg: pReg, seat: pSeat, teams: pTeams, share: pShare, dash: pDash, out: pOut, photos: pPhotos, data: pData })[tab]();
}

// ---- 資料管理：一鍵清除測試資料 ----
function pData() {
  const pane = document.getElementById("pane");
  const cnt = (n) => D[n].length;
  pane.innerHTML = `
  <div class="card"><h3>目前資料庫裡的資料</h3>
    <p class="hint" style="margin:0">報到 ${cnt("regs")} 人・給未來自己的話／選圖 ${cnt("future")} 筆・培育起點盤點 ${cnt("inv")} 份・各種共編與答案 ${cnt("notes")} 筆・目前階段 ${D.stage}</p></div>
  <div class="card" style="border-color:var(--accent)"><h3 style="color:var(--accent)">清除測試資料</h3>
    <p>會刪除：所有人的報到資料（含飲食偏好）、選圖與給未來自己的話、培育起點盤點、所有共編內容與答案（含嘉賓筆記與嘉賓回饋）、跨產品分組與請假註記，並把階段調回 0。</p>
    <p class="hint">不會刪除：名單（人員、教練、主管）與新手 PJM 名字、後台通行碼。</p>
    <label class="opt" style="margin:10px 0"><input type="checkbox" id="rsTrainee"><span>同時把新手 PJM 名字還原成初始名單（會覆蓋報到時修改或補填的名字）</span></label>
    <button class="btn danger" id="rsGo">清除測試資料</button></div>`;
  document.getElementById("rsGo").onclick = async () => {
    const t = prompt("這個動作無法復原。\n請輸入「清除」兩個字確認：");
    if (t !== "清除") { if (t !== null) toast("輸入不符，已取消"); return; }
    await rpc("pjm_admin_reset", { reset_trainees: document.getElementById("rsTrainee").checked });
    toast("已清除，階段回到 0"); await load(true); pData();
  };
}

// ---- 報到 ----
function pReg() {
  const pane = document.getElementById("pane");
  const units = UNITS.map((u) => {
    const mem = D.people.filter((p) => p.unit === u), done = mem.filter((p) => regOf(p.id));
    return { u, mem, done };
  });
  const guests = D.people.filter((p) => !p.unit), gd = guests.filter((p) => regOf(p.id));
  const total = D.people.length, all = D.people.filter((p) => regOf(p.id)).length;
  const diets = {}; D.regs.forEach((r) => { const k = r.diet || "未填"; diets[k] = (diets[k] || 0) + 1; });
  pane.innerHTML = `
  <div class="card soft"><b>整體：${all}／${total} 已報到</b><div class="bar" style="margin-top:8px"><i style="width:${(all / total) * 100}%"></i></div></div>
  <div class="grid2" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">
  ${units.map((x) => `<div class="card"><h3>${x.u}　${x.done.length}／${x.mem.length}</h3><div class="bar"><i style="width:${(x.done.length / x.mem.length) * 100}%"></i></div>
     <p class="hint" style="margin:8px 0 0">未報到：${x.mem.filter((p) => !regOf(p.id)).map((p) => esc(p.name)).join("、") || "無 🎉"}</p></div>`).join("")}
  <div class="card"><h3>重要嘉賓　${gd.length}／${guests.length}</h3><div class="bar"><i style="width:${(gd.length / guests.length) * 100}%"></i></div>
     <p class="hint" style="margin:8px 0 0">未報到：${guests.filter((p) => !regOf(p.id)).map((p) => esc(p.name)).join("、") || "無 🎉"}</p></div></div>
  <h2>飲食偏好統計</h2><div class="card">${Object.entries(diets).map(([k, v]) => `<span class="pill" style="margin:2px">${esc(k)} × ${v}</span>`).join("") || "尚無資料"}</div>
  <h2>明細</h2><div class="card" style="overflow:auto"><table class="t"><tr><th>姓名</th><th>單位</th><th>身分</th><th>新手 PJM</th><th>飲食</th><th>筆電確認</th><th>到場準備</th></tr>
  ${D.people.map((p) => { const r = regOf(p.id); return `<tr><td>${esc(p.name)}</td><td>${esc(p.unit || "—")}</td><td>${r ? r.roles.map(roleLabel).join("、") : "<span class='hint'>未報到</span>"}</td><td>${esc(rosterRowsOf(D.roster, p.name).map((x) => x.pjm_name || "（未填）").join("、"))}</td><td>${esc(r?.diet || "")}</td><td>${r?.laptop_ok ? "✓" : ""}</td><td>${readyOf(p.id) ? "✓" : ""}</td></tr>`; }).join("")}</table></div>`;
}

// ---- 階段 5 小組分享 ----
function shareGroups() {
  const names = [...new Set(D.people.map((p) => p.seat2).filter(Boolean))].sort();
  return names.map((g) => ({ g, members: D.people.filter((p) => p.seat2 === g).map((p) => p.name), text: nv("seat", g, 5, "tryable"), sent: nv("seat", g, 5, "submitted") }));
}
function pShare() {
  const pane = document.getElementById("pane"); const gs = shareGroups();
  if (!gs.length) { pane.innerHTML = `<div class="card"><p>還沒有分組。請先到「跨產品分組」分頁設定組別。</p></div>`; return; }
  pane.innerHTML = `<p class="hint">題目：剛才 KS 分享的經驗中，有沒有哪一個做法，即使我的資源有限，也有機會嘗試？</p>
  <p class="row"><button class="btn" id="proj">▶ 投影模式（逐組顯示，最後一頁是文字雲）</button><button class="btn ghost" id="projCloud">☁ 直接顯示文字雲</button></p>
  <div class="grid2" style="grid-template-columns:repeat(auto-fill,minmax(300px,1fr))">${gs.map((x) => `<div class="card" style="margin:0"><div class="row" style="justify-content:space-between"><h3 style="margin:0">${teamName(x.g)}</h3><span class="pill ${x.sent ? "" : "warn"}">${x.sent ? "已送出" : "尚未送出"}</span></div>
    <p class="hint" style="margin:4px 0 8px">${esc(x.members.join("、"))}</p><div style="white-space:pre-wrap">${x.text ? esc(x.text) : '<span class="hint">（尚無內容）</span>'}</div></div>`).join("")}</div>`;
  document.getElementById("proj").onclick = () => project(0);
  document.getElementById("projCloud").onclick = () => project(gs.length);
}
// ---- 文字雲 ----
const STOP = new Set("的 了 是 我 我們 你 他 她 它 也 都 就 還 又 和 與 及 或 但 而 因為 所以 如果 可以 可能 需要 一個 一些 這個 那個 這樣 那樣 什麼 怎麼 沒有 不是 自己 他們 我們的 比較 非常 然後 以及 透過 進行 對於 有些 可是 還是 或是 並且 一起 會 能 要 有 在 到 把 讓 被 從 對 為 以 等 之 其 如 於 很 更 再 已 已經 將 但是 其實 例如 像 做 去 來 說 看 想 用 先 後".split(" "));
const hiddenWords = new Set();
function wordFreq(texts) {
  const freq = new Map();
  const seg = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter("zh-Hant", { granularity: "word" }) : null;
  for (const t of texts) {
    let words = [];
    if (seg) words = [...seg.segment(t)].filter((x) => x.isWordLike).map((x) => x.segment);
    else words = (t.match(/[一-鿿]{2}|[A-Za-z0-9]+/g) || []);
    for (let w of words) {
      w = w.trim().toLowerCase();
      if (w.length < 2 || STOP.has(w) || /^d+$/.test(w) || hiddenWords.has(w)) continue;
      freq.set(w, (freq.get(w) || 0) + 1);
    }
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 70);
}
function drawCloud(host, texts) {
  const list = wordFreq(texts);
  if (!list.length) { host.innerHTML = '<p class="hint" style="font-size:22px;text-align:center;margin-top:10vh">還沒有足夠的內容可以產生文字雲</p>'; return; }
  const W = host.clientWidth || 1000, H = host.clientHeight || 520, max = list[0][1], min = list[list.length - 1][1];
  const ctx = document.createElement("canvas").getContext("2d");
  const colors = ["var(--brand)", "var(--accent)", "var(--ink)", "#7a5cc7", "#c98a00", "#2b8cc4"];
  const boxes = [], out = [];
  list.forEach(([w, n], idx) => {
    const size = Math.round(26 + (max === min ? 0.5 : (n - min) / (max - min)) * 78);
    ctx.font = `700 ${size}px sans-serif`;
    const bw = ctx.measureText(w).width + 14, bh = size * 1.2;
    for (let k = 0; k < 2600; k++) {
      const ang = k * 0.35, r = 3 + k * 0.55;
      const x = W / 2 + Math.cos(ang) * r * 1.5 - bw / 2, y = H / 2 + Math.sin(ang) * r * 0.85 - bh / 2;
      if (x < 4 || y < 4 || x + bw > W - 4 || y + bh > H - 4) continue;
      if (boxes.some((o) => x < o.x + o.w && x + bw > o.x && y < o.y + o.h && y + bh > o.y)) continue;
      boxes.push({ x, y, w: bw, h: bh }); out.push({ w, n, x, y, size, c: colors[idx % colors.length] }); break;
    }
  });
  host.style.position = "relative";
  host.innerHTML = out.map((o) => `<span data-w="${esc(o.w)}" title="出現 ${o.n} 次（點一下可隱藏）" style="position:absolute;left:${o.x}px;top:${o.y}px;font-size:${o.size}px;font-weight:700;line-height:1.2;color:${o.c};cursor:pointer;white-space:nowrap">${esc(o.w)}</span>`).join("");
  host.onclick = (e) => { const s = e.target.closest("[data-w]"); if (s) { hiddenWords.add(s.dataset.w); drawCloud(host, texts); } };
}

function project(i) {
  const gs = shareGroups(); if (!gs.length) return;
  const total = gs.length + 1; i = (i + total) % total;
  const isCloud = i === gs.length, x = gs[i];
  document.getElementById("projLayer")?.remove();
  const o = document.createElement("div"); o.id = "projLayer";
  o.style.cssText = "position:fixed;inset:0;z-index:60;background:var(--bg);color:var(--ink);display:flex;flex-direction:column;padding:4vh 6vw;overflow:auto";
  const nav = `<div class="row"><button class="btn ghost" id="pPrev">← 上一頁</button><span class="hint">${i + 1}／${total}</span><button class="btn ghost" id="pNext">下一頁 →</button><button class="btn" id="pClose">結束</button></div>`;
  if (isCloud) {
    o.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><div><span class="pill" style="font-size:20px">全班答案文字雲</span> <span class="hint" style="font-size:16px">點一下字可以隱藏；字越大代表被提到越多次</span></div>${nav}</div>
      <p class="hint" style="font-size:22px;margin:2vh 0 0">有哪個做法，即使資源有限，也有機會嘗試？</p>
      <div id="cloudHost" style="flex:1;min-height:55vh"></div>`;
  } else {
    o.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><div><span class="pill" style="font-size:20px">${teamName(x.g)}</span> <span class="hint" style="font-size:18px">${esc(x.members.join("、"))}</span></div>${nav}</div>
      <p class="hint" style="font-size:22px;margin:3vh 0 2vh">剛才 KS 分享的經驗中，有沒有哪一個做法，即使我的資源有限，也有機會嘗試？</p>
      <div style="font-size:clamp(26px,3.6vw,52px);line-height:1.5;white-space:pre-wrap;font-weight:600">${x.text ? esc(x.text) : '<span class="hint">（尚無內容）</span>'}</div>`;
  }
  document.body.appendChild(o);
  if (isCloud) drawCloud(o.querySelector("#cloudHost"), gs.map((g) => g.text).filter(Boolean));
  const close = () => { o.remove(); document.removeEventListener("keydown", key); };
  const key = (e) => { if (e.key === "ArrowRight") { close(); project(i + 1); } else if (e.key === "ArrowLeft") { close(); project(i - 1); } else if (e.key === "Escape") close(); };
  document.addEventListener("keydown", key);
  o.querySelector("#pPrev").onclick = () => { close(); project(i - 1); };
  o.querySelector("#pNext").onclick = () => { close(); project(i + 1); };
  o.querySelector("#pClose").onclick = close;
}

// 每位參與者在「讓好行動更有力量」階段各自寫下的嘉賓回饋筆記
function guestNotes() {
  return D.notes.filter((n) => n.scope === "person" && n.stage === 9 && n.field === "guest_note" && (n.value || "").trim())
    .map((n) => ({ name: (D.people.find((p) => p.id === +n.scope_key) || {}).name || "?", text: n.value.trim(), at: n.updated_at }))
    .sort((a, b) => (a.at < b.at ? 1 : -1));
}

// ---- 階段 9 / 帶走 ----
function pOut() {
  const pane = document.getElementById("pane");
  pane.innerHTML = `
  <h2>重要嘉賓回饋</h2>
  <div class="card"><b>現場筆記（每人一則，共 ${guestNotes().length} 則）</b>${guestNotes().length ? '<div style="margin-top:8px;display:grid;gap:8px">' + guestNotes().map((n) => '<div class="card" style="margin:0;padding:10px 14px"><span class="hint">' + esc(n.name) + '</span><div style="white-space:pre-wrap">' + esc(n.text) + "</div></div>").join("") + "</div>" : "<p class='hint' style='margin:6px 0 0'>尚無內容</p>"}</div>
  <div class="card"><b>確認後放入 PDF 的嘉賓回饋</b><p class="hint">檢查無誤後，整理在這裡並儲存，參與者的階段 7 畫面與 PDF 才會出現這段文字。</p>
    <textarea id="gf" rows="8">${esc(nv("all", "all", 9, "guest_final"))}</textarea>
    <p class="row"><button class="btn" id="gfSave">儲存並發布</button><button class="btn ghost" id="gfCopy">以現場筆記為草稿</button></p></div>`;
  document.getElementById("gfSave").onclick = async () => { await rpc("pjm_admin_set_note", { sc: "all", sk: "all", st: 9, f: "guest_final", v: document.getElementById("gf").value }); toast("已發布"); load(true); };
  document.getElementById("gfCopy").onclick = () => { document.getElementById("gf").value = guestNotes().map((n) => "・" + n.text.replace(/\n+/g, " ")).join("\n"); };
  surveyTexts(pane);
}

// 滿意度問卷的開放題：facilitator 檢視逐字回覆後整理，發布後才會放進嘉賓版 PDF
const SV_TEXT = [{ k: "gain", q: "今天最有收穫的是什麼？", f: "survey_gain" }, { k: "improve", q: "有什麼建議，可以讓工作坊更好？", f: "survey_improve" }];
async function surveyTexts(pane) {
  let rows = [];
  try { const r = await sb.rpc("pjm_admin_survey", { p: PASS }); rows = r.data || []; } catch {}
  if (tab !== "out") return;
  const box = document.createElement("div");
  box.innerHTML = '<h2>問卷開放題整理（放進嘉賓版 PDF）</h2><p class="hint">共 ' + rows.length + " 份匿名問卷。以下是逐字回覆，請整理成要給嘉賓看的文字，按「儲存並發布」後才會出現在嘉賓版 PDF。</p>" +
    SV_TEXT.map((s) => {
      const raw = rows.map((r) => (r.answers[s.k] || "").trim()).filter(Boolean);
      return '<div class="card"><b>' + esc(s.q) + '</b><details class="ref"><summary>逐字回覆（' + raw.length + " 則）</summary>" +
        (raw.length ? raw.map((t) => '<div class="card" style="margin:6px 0;padding:8px 12px;white-space:pre-wrap">' + esc(t) + "</div>").join("") : '<p class="hint">尚無回覆</p>') + "</details>" +
        '<textarea id="sv_' + s.k + '" rows="6">' + esc(nv("all", "all", 12, s.f)) + "</textarea>" +
        '<p class="row"><button class="btn" data-svsave="' + s.k + '">儲存並發布</button><button class="btn ghost" data-svdraft="' + s.k + '">以逐字回覆為草稿</button></p></div>';
    }).join("");
  pane.appendChild(box);
  SV_TEXT.forEach((s) => {
    const raw = rows.map((r) => (r.answers[s.k] || "").trim()).filter(Boolean);
    box.querySelector('[data-svdraft="' + s.k + '"]').onclick = () => { document.getElementById("sv_" + s.k).value = raw.map((t) => "・" + t.replace(/\n+/g, " ")).join("\n"); };
    box.querySelector('[data-svsave="' + s.k + '"]').onclick = async () => { await rpc("pjm_admin_set_note", { sc: "all", sk: "all", st: 12, f: s.f, v: document.getElementById("sv_" + s.k).value }); toast("已發布"); await load(true); };
  });
}

start();
