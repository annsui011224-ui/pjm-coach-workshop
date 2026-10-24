// 參與者端
const S = { stage: 0, people: [], regs: new Map(), notes: new Map(), future: new Map(), inv: new Map(), roster: [], rows: [], trainees: [], meId: null, role: null, showCard: false, pics: [], renderKey: "" };
const $app = document.getElementById("app");
const $hdr = document.getElementById("hdr");
const ls = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };

const me = () => S.people.find((p) => p.id === S.meId) || null;
const reg = () => S.regs.get(S.meId) || null;
const myRoles = () => reg()?.roles?.length ? reg().roles : me()?.roles || [];
const guestOnly = () => { const m = me(); return !!m && !m.unit; };
const note = (scope, key, stage, field) => S.notes.get(nkey(scope, key, stage, field)) ?? "";
const toast = (t) => { const d = document.createElement("div"); d.className = "toast"; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 3200); };

// ---------- 啟動 ----------
async function boot() {
  try {
    const d = await loadAll();
    S.people = d.people; S.stage = d.stage; S.maxIdx = d.maxIdx; S.roster = d.roster; S.rows = d.rows; S.trainees = d.trainees;
    d.regs.forEach((r) => S.regs.set(r.person_id, r));
    d.notes.forEach((n) => S.notes.set(nkey(n.scope, n.scope_key, n.stage, n.field), n.value));
    d.future.forEach((f) => S.future.set(f.person_id, f));
    d.inv.forEach((i) => S.inv.set(i.person_id + "|" + i.trainee_id, i));
  } catch (e) { $app.innerHTML = `<p class="wait">連線失敗：${esc(e.message || e)}</p>`; return; }
  const saved = parseInt(ls.get("pjm_me") || "", 10);
  if (saved && S.people.some((p) => p.id === saved)) S.meId = saved;
  S.role = ls.get("pjm_role");
  subscribe();
  setInterval(pollState, 8000);
  render();
}

async function pollState() {
  const { data } = await sb.from("pjm_state").select("stage,max_idx").eq("id", 1).single();
  if (data) S.maxIdx = data.max_idx;
  if (data && data.stage !== S.stage) { S.stage = data.stage; S.view = null; S.menuOpen = false; if (S.showCard === true) S.showCard = false; render(); }
}

function subscribe() {
  sb.channel("pjm-all")
    .on("postgres_changes", { event: "*", schema: "public", table: "pjm_state" }, (p) => {
      S.maxIdx = p.new.max_idx ?? S.maxIdx;
      if (p.new.stage !== S.stage) { S.stage = p.new.stage; S.view = null; S.menuOpen = false; if (S.showCard === true) S.showCard = false; if (S.meId) toast(`Facilitator 開啟了：${STAGE[S.stage].title}`); render(); }
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "pjm_notes" }, (p) => {
      const n = p.new; if (n?.scope) S.notes.set(nkey(n.scope, n.scope_key, n.stage, n.field), n.value); refresh();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "pjm_future" }, (p) => { if (p.new?.person_id) S.future.set(p.new.person_id, p.new); refresh(); })
    .on("postgres_changes", { event: "*", schema: "public", table: "pjm_inventory" }, (p) => { if (p.new?.person_id) S.inv.set(p.new.person_id + "|" + p.new.trainee_id, p.new); refresh(); })
    .on("postgres_changes", { event: "*", schema: "public", table: "pjm_registration" }, (p) => { if (p.new?.person_id) S.regs.set(p.new.person_id, p.new); })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "pjm_people" }, (p) => {
      const i = S.people.findIndex((x) => x.id === p.new.id); const old = S.people[i]; if (i >= 0) S.people[i] = p.new;
      // 自己的座位組別被 facilitator 設定／更換時，重新顯示該階段（才會出現對應的共編欄位）
      if (p.new.id === S.meId && old && (old.seat2 !== p.new.seat2) && (S.stage === 0 || (S.stage >= 2 && S.stage <= 5)) && (!S.showCard || S.stage === 0)) render(); else refresh();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "pjm_trainee" }, async () => {
      const { data } = await sb.from("pjm_trainee").select("*").order("roster_id").order("sort").order("id");
      if (data) { S.trainees = data; S.roster = buildRoster(S.rows, data); }
      if (S.showCard === true && S.stage === 0) render();
    })
    .subscribe();
}

// ---------- 畫面骨架 ----------
function header() {
  const m = me();
  let h = `<span class="brand">PJM 教練團 · 經驗反思交流會</span><span class="row">`;
  if (m && !S.showCard && S.stage !== 13) h += `<button class="chip" id="btnStages" aria-expanded="${!!S.menuOpen}">階段 ${stageIdx(vs())}／${STAGES.length - 1} ▾</button>`;
  if (m) h += `<button class="chip" id="btnCard">${esc(m.name)} ▾</button>`;
  h += `</span>`;
  const roles = myRoles();
  if (m && roles.length > 1) {
    h += `<span class="row" style="width:100%">目前身分：` + roles.map((r) => `<button class="chip ${activeRole() === r ? "on" : ""}" data-role="${r}">${roleLabel(r)}</button>`).join("") + `</span>`;
  }
  if (m && S.menuOpen) {
    h += '<div class="stageMenu"><p class="hint" style="margin:0 0 6px">可以回到前面已開啟的階段，修改你的答案與筆記。</p>' +
      STAGES.map((s, i) => ({ s, i })).filter(({ i }) => i <= S.maxIdx).map(({ s, i }) =>
        '<button class="stagebtn ' + (s.n === vs() ? "cur" : "") + '" data-goview="' + s.n + '"><span>' + i + ". " + esc(s.title) + "</span>" + (s.n === S.stage ? '<span class="pill">進行中</span>' : "") + "</button>").join("") + "</div>";
  }
  $hdr.innerHTML = h;
}
const vs = () => (S.view != null && stageIdx(S.view) <= S.maxIdx ? S.view : S.stage);
const activeRole = () => { const r = myRoles(); return r.includes(S.role) ? S.role : r[0]; };

// 回看前面階段時顯示的提示列
function viewBanner() {
  if (S.showCard === true || vs() === S.stage) return "";
  return '<div class="viewBanner"><span>你正在回看「' + esc(STAGE[vs()].title) + '」，修改的答案與筆記會自動儲存。</span><button class="btn" id="backNow">回到目前階段</button></div>';
}

function render() {
  header();
  const m = me();
  S.renderKey = `${S.meId}|${vs()}|${S.showCard}`;
  if (!m || S.showCard === "register") { $app.innerHTML = viewRegister(); bindRegister(); return; }
  if (S.showCard === true || vs() === 0 || vs() === 13) { $app.innerHTML = viewBanner() + viewCard(); bindCard(); return; }
  const VIEWS = { 1: v1, 2: v2, 3: v3, 4: v4, 5: v5, 6: v6, 7: v7, 8: v8, 9: v9, 10: v10, 11: v11, 12: v12 };
  const BINDS = { 2: bind2, 3: bind3, 4: bind4, 5: bind5, 6: bind6, 8: bind8, 11: bind11, 12: bind12 };
  $app.innerHTML = viewBanner() + VIEWS[vs()]();
  const after = BINDS[vs()];
  if (after) after();
  ensureLocks?.();
  refresh();
  window.scrollTo(0, 0);
}

document.addEventListener("click", (e) => {
  if (e.target.closest("#btnStages")) { S.menuOpen = !S.menuOpen; header(); return; }
  const g = e.target.closest("[data-goview]");
  if (g) { const id = +g.dataset.goview; S.view = id === S.stage ? null : id; S.menuOpen = false; S.showCard = false; render(); return; }
  if (e.target.closest("#backNow")) { S.view = null; S.menuOpen = false; render(); return; }
  const r = e.target.closest("[data-role]");
  if (r) { S.role = r.dataset.role; ls.set("pjm_role", S.role); render(); return; }
  if (e.target.closest("#btnCard")) { S.showCard = S.showCard === true ? false : true; render(); }
});

// ---------- 預約報到 ----------
function viewRegister() {
  const byUnit = {};
  S.people.forEach((p) => { const u = p.unit || "重要嘉賓"; (byUnit[u] ||= []).push(p); });
  const cur = me();
  const opts = Object.keys(byUnit).map((u) => `<optgroup label="${esc(u)}">` + byUnit[u].map((p) => `<option value="${p.id}" ${cur?.id === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("") + `</optgroup>`).join("");
  return `
  ${sprigSvg()}<h1>歡迎來到 PJM 教練團交流會</h1>
  <p class="sub">先完成報到，我們會告訴你，當天你在工作坊裡扮演什麼角色。</p>
  <div class="card">
    <div class="q">① 你是誰？</div>
    <select id="rgName"><option value="">請選擇你的英文名</option>${opts}</select>
    <div id="rgMore"></div>
  </div>`;
}
function bindRegister() {
  const sel = document.getElementById("rgName");
  const show = () => {
    const p = S.people.find((x) => x.id === parseInt(sel.value, 10));
    const box = document.getElementById("rgMore");
    if (!p) { box.innerHTML = ""; return; }
    const prev = S.regs.get(p.id);
    const pjmSlots = (p) => { const rows = myRawRows(p.name); if (!rows.length) return "";
      return `<div class="q" style="margin-top:14px">④ 你要培育的新手 PJM</div><p class="hint">名單上的新手如下，若有不對，直接修改名字即可。${rows.some((r) => !S.trainees.some((t) => t.roster_id === r.id)) ? "名單上還沒有的，請補上。" : ""}</p>` + rowSlotsHtml(rows, p.name); };
    const roles = prev?.roles?.length ? prev.roles : p.roles;
    const diet = prev?.diet || "";
    const known = DIETS.slice(0, -1).includes(diet);
    box.innerHTML = `
      <div class="q" style="margin-top:14px">② 你當天的身分（可複選）</div>
      <div class="opts">${p.roles.map((r) => `<label class="opt"><input type="checkbox" name="rgRole" value="${r}" ${roles.includes(r) ? "checked" : ""}><span><b>${roleLabel(r)}</b>${p.unit ? ` · ${esc(p.unit)}` : ""}</span></label>`).join("")}</div>
      <div class="q" style="margin-top:14px">③ 產品單位</div>
      <p style="margin:0">${esc(p.unit || "重要嘉賓（不隸屬單一產品單位）")}</p>
      ${pjmSlots(p)}
      <div class="q" style="margin-top:14px">⑤ 午餐飲食偏好</div>
      <select id="rgDiet">${DIETS.map((d) => `<option ${(known ? diet === d : (diet && d.startsWith("其他"))) ? "selected" : ""}>${d}</option>`).join("")}</select>
      <input type="text" id="rgDietOther" placeholder="請說明（例如過敏原）" style="margin-top:8px;display:none" value="${known ? "" : esc(diet)}">
      <div class="q" style="margin-top:14px">⑥ 筆電確認</div>
      <label class="opt"><input type="checkbox" id="rgLaptop" ${prev?.laptop_ok ? "checked" : ""}><span>我確認當天會攜帶筆電，並確認筆電電量可以持續 2 小時</span></label>
      <div style="margin-top:18px"><button class="btn" id="rgGo">完成報到，看我的角色</button></div>`;
    const dsel = document.getElementById("rgDiet"), oth = document.getElementById("rgDietOther");
    const tog = () => { oth.style.display = dsel.value.startsWith("其他") ? "" : "none"; };
    dsel.onchange = tog; tog();
    document.getElementById("rgGo").onclick = async () => {
      const rs = [...document.querySelectorAll("[name=rgRole]:checked")].map((x) => x.value);
      if (!rs.length) { toast("請至少選一個身分"); return; }
      let dv = dsel.value; if (dv.startsWith("其他")) dv = oth.value.trim() || "其他";
      if (!(await saveTraineeInputs())) return;
      const laptop = document.getElementById("rgLaptop").checked;
      if (!laptop) { toast("請勾選第 6 題：確認當天會攜帶筆電，且電量可以持續 2 小時"); return; }
      const { error } = await sb.from("pjm_registration").upsert({ person_id: p.id, roles: rs, diet: dv, laptop_ok: true, updated_at: new Date().toISOString() });
      if (error) { toast("儲存失敗：" + error.message); return; }
      S.regs.set(p.id, { person_id: p.id, roles: rs, diet: dv, laptop_ok: true });
      S.meId = p.id; ls.set("pjm_me", String(p.id)); S.role = rs[0]; ls.set("pjm_role", S.role);
      S.showCard = true; render();
    };
  };
  sel.onchange = show; if (sel.value) show();
}

// ---------- 角色卡 / 等待 ----------
function planLine(m) {
  const rows = rosterRowsOf(S.roster, m.name); if (!rows.length) return "";
  const names = pjmNamesOf(S.roster, m.name);
  if (!names.length) return `<p class="hint">還沒有填寫新手 PJM 的名字，請點下方「重新報到／修改資料」補上。</p>`;
  return `<p style="font-size:17px;border-top:1px solid var(--line);padding-top:12px">這場工作坊結束後，你會得到一份將 <b>${esc(names.join("、"))}</b> 培育為獨立 PJM 的成長計畫。</p>`;
}
function viewCard() {
  const m = me(), rs = myRoles(), a = ROLES[activeRole()] || ROLES.coach;
  const waiting = (vs() === 0 || vs() === 13)
    ? `<p class="wait"><span class="dot"></span>${vs() === 13 ? "行前調查已完成。組別與座位會在工作坊當天公布，屆時請開啟同一個網址。" : "工作坊尚未開始，開始後這裡會自動切換到第一個階段。"}</p>`
    : `<div style="text-align:center"><button class="btn" id="cardBack">回到目前階段</button></div>`;
  return `
  <div class="card soft rolecard">
    ${sprigSvg(a.plant)}
    <div class="pill">已完成報到</div>
    <div class="rt">${esc(m.name)}，你是「${a.title}」</div>
    <div class="rolechips">${rs.map((r) => `<span class="pill">${roleLabel(r)}</span>`).join("")}${m.unit ? `<span class="pill warn">${esc(m.unit)}</span>` : ""}</div>
    <p>${esc(a.mission)}</p>
    ${planLine(m)}
  </div>
  ${rs.length > 1 ? `<div class="card"><h3>你有多重身分</h3><p class="hint" style="margin:0">工作坊進行中，隨時可以用上方的「目前身分」按鈕切換。</p></div>` : ""}
  <div class="card"><h3>當天會發生什麼？</h3>
    <p class="hint" style="margin:0">當天共 ${STAGES.length - 2} 個階段，每個階段都由 facilitator 開啟。完成後請稍候，大家到齊才會一起前進。${pjmNamesOf(S.roster, m.name).length ? "最後，你會帶走一份屬於 " + esc(pjmNamesOf(S.roster, m.name).join("、")) + " 的培育計畫。" : "最後，你會帶走這場工作坊的培育計畫紀錄。"}</p></div>
  ${vs() === 0 ? seatingCard() : ""}
  ${waiting}
  <p style="text-align:center"><button class="chip" id="rgAgain">不是我？重新報到／修改資料</button></p>`;
}
function bindCard() {
  bindReady();
  const b = document.getElementById("cardBack"); if (b) b.onclick = () => { S.showCard = false; render(); };
  document.getElementById("rgAgain").onclick = () => { S.showCard = "register"; render(); };
}

// ---------- 共用欄位 ----------
const ph = (title, sub) => `<h1>${esc(title)}</h1><p class="sub">${esc(sub)}</p>`;
const foot = `<p class="wait"><span class="dot"></span>完成後請稍候，facilitator 會開啟下一個階段。</p>`;
function nf(scope, key, stage, field, rows = 3, placeholder = "") {
  const k = nkey(scope, key, stage, field);
  return `<textarea data-n="${esc(k)}" rows="${rows}" placeholder="${esc(placeholder)}"></textarea>`;
}
function radios(scope, key, stage, field, opts) {
  const k = nkey(scope, key, stage, field);
  return `<div class="opts">` + opts.map((o) => `<label class="opt"><input type="radio" name="${esc(k)}" data-nr="${esc(k)}" value="${esc(o)}"><span>${esc(o)}</span></label>`).join("") + `</div>`;
}
function checks(scope, key, stage, field, opts) {
  const k = nkey(scope, key, stage, field);
  return `<div class="grid2" style="grid-template-columns:repeat(auto-fill,minmax(190px,1fr))">` + opts.map((o) => `<label class="opt"><input type="checkbox" data-nc="${esc(k)}" value="${esc(o)}"><span>${esc(o)}</span></label>`).join("") + `</div>`;
}
async function saveNote(k, value) {
  const [scope, scope_key, stage, field] = k.split("|");
  S.notes.set(k, value); lastSaved.set(k, value);
  const { error } = await sb.from("pjm_notes").upsert({ scope, scope_key, stage: parseInt(stage, 10), field, value, updated_by: S.meId, updated_at: new Date().toISOString() }, { onConflict: "scope,scope_key,stage,field" });
  if (error) toast("尚未儲存：目前階段已切換或連線異常");
}
const saveNoteD = {};
document.addEventListener("input", (e) => {
  const el = e.target;
  if (el.dataset?.n) { const k = el.dataset.n; (saveNoteD[k] ||= debounce((v) => saveNote(k, v)))(el.value); S.notes.set(k, el.value); }
});
document.addEventListener("change", (e) => {
  const el = e.target;
  if (el.dataset?.nr) saveNote(el.dataset.nr, el.value);
  if (el.dataset?.nc) {
    const k = el.dataset.nc;
    const v = [...document.querySelectorAll("[data-nc]")].filter((x) => x.dataset.nc === k && x.checked).map((x) => x.value).join("||");
    saveNote(k, v);
  }
});

function sync() {
  document.querySelectorAll("[data-n]").forEach((el) => { if (el === document.activeElement) return; const v = S.notes.get(el.dataset.n) ?? ""; if (el.value !== v) el.value = v; if (!lastSaved.has(el.dataset.n)) lastSaved.set(el.dataset.n, v); });
  document.querySelectorAll("[data-nr]").forEach((el) => { el.checked = S.notes.get(el.dataset.nr) === el.value; });
  document.querySelectorAll("[data-nc]").forEach((el) => { el.checked = (S.notes.get(el.dataset.nc) || "").split("||").includes(el.value); });
  document.querySelectorAll("[data-fx]").forEach((el) => { if (el === document.activeElement) return; const v = S.future.get(S.meId)?.[el.dataset.fx] ?? ""; if (el.value !== v) el.value = v; });
}
function refresh() {
  if (!me() || S.showCard) return;
  sync();
  applyLocks?.();
  document.querySelectorAll("[data-dyn]").forEach((el) => { const f = DYN[el.dataset.dyn]; if (f) el.innerHTML = f(); });
}

// ---------- 各階段 ----------
function v1() {
  return ph(STAGE[1].title, STAGE[1].sub) + `
  <div class="card soft"><h3>工作坊目的</h3><p style="font-size:19px;font-weight:700;margin:6px 0">從限制中找到培育的可能性</p></div>
  <div class="card"><p style="margin-top:0">今天邀請了 PJM 的教練、PJM 的直接與間接主管，以及教練的主管一起參與，因為我們相信，培育一位能獨當一面的 PJM，不應該只靠教練個人的熱忱。</p>
  <p>每個人的專案工作都很忙，我們也不期待大家憑空變出更多時間。</p></div>
  <div class="card"><h3>今天希望一起找到</h3>
  <p style="margin:6px 0">① 在現有工作條件下，我們可以怎麼開始？</p>
  <p style="margin:6px 0">② 需要哪些協助？</p>
  <p style="margin:6px 0">③ 又如何讓這件事能持續發生？</p></div>` + foot;
}

const pjmLabel = () => { const n = pjmNamesOf(S.roster, me().name); return n.length ? n.join("、") : "新手 PJM"; };

// 名單中的一列 = 一位教練；他可能帶多位新手 PJM
const myRawRows = (name) => S.rows.filter((r) => [r.coach, r.direct_mgr, r.dept_mgr, r.pjm_mgr].includes(name));
function rowSlotsHtml(rows, myName) {
  return rows.map((r) => {
    const ts = S.trainees.filter((t) => t.roster_id === r.id);
    const who = r.coach === myName ? "你負責培育的新手 PJM" : `${esc(r.coach)} 教練（${esc(r.unit)}）負責培育的新手 PJM`;
    return `<div style="margin:8px 0"><span class="hint">${who}</span>` +
      (ts.length ? ts.map((t) => `<input type="text" data-trainee="${t.id}" value="${esc(t.name)}" style="margin-top:4px">`).join("")
        : `<input type="text" data-newrow="${r.id}" placeholder="新手 PJM 的英文名" style="margin-top:4px">`) + `</div>`;
  }).join("");
}
async function saveTraineeInputs() {
  const ts = [...document.querySelectorAll("[data-trainee]")], ns = [...document.querySelectorAll("[data-newrow]")];
  if ([...ts, ...ns].some((x) => !x.value.trim())) { toast("請把每一位新手 PJM 的名字都填上（可先填暫稱）"); return false; }
  for (const x of ts) {
    const t = S.trainees.find((y) => y.id === +x.dataset.trainee);
    if (t && t.name !== x.value.trim()) {
      const { error } = await sb.from("pjm_trainee").update({ name: x.value.trim() }).eq("id", t.id);
      if (error) { toast("儲存失敗：" + error.message); return false; }
    }
  }
  for (const x of ns) {
    const { error } = await sb.from("pjm_trainee").insert({ roster_id: +x.dataset.newrow, name: x.value.trim(), sort: 0 });
    if (error) { toast("儲存失敗：" + error.message); return false; }
  }
  const { data } = await sb.from("pjm_trainee").select("*").order("roster_id").order("sort").order("id");
  if (data) { S.trainees = data; S.roster = buildRoster(S.rows, data); }
  return true;
}
// 報到時沒有新手名字的人，在這裡補填
function nameFixCard() {
  const rows = myRawRows(me().name).filter((r) => !S.trainees.some((t) => t.roster_id === r.id));
  if (!rows.length) return "";
  return `<div class="card" style="border-color:var(--accent)"><div class="q">請先填寫新手 PJM 的名字</div><p class="hint">題目會帶入他的名字。不確定可先填暫稱。</p>` + rowSlotsHtml(rows, me().name) +
    `<p><button class="btn" id="fixNames">儲存</button></p></div>`;
}
function bindNameFix() {
  const b = document.getElementById("fixNames"); if (!b) return;
  b.onclick = async () => { if (await saveTraineeInputs()) render(); };
}

function lightbox(url, onPick) {
  const d = document.createElement("div"); d.className = "lb";
  d.innerHTML = `<img src="${esc(url)}" alt=""><div class="lbbar">${onPick ? '<button class="btn" id="lbPick">選這張</button>' : ""}<button class="btn" id="lbClose" style="background:#fff;color:#1f2a33">關閉</button></div>`;
  const close = () => d.remove();
  d.onclick = (e) => { if (e.target === d || e.target.tagName === "IMG") close(); };
  document.body.appendChild(d);
  d.querySelector("#lbClose").onclick = close;
  if (onPick) d.querySelector("#lbPick").onclick = () => { onPick(); close(); };
}
document.addEventListener("click", (e) => { const f = e.target.closest("[data-full]"); if (f) lightbox(f.dataset.full); });

function v2() {
  const f = S.future.get(S.meId) || {};
  const label = esc(pjmLabel());
  if (f.image_submitted) return ph(STAGE[2].title, "你已經送出圖片") + nameFixCard() + `
  <div class="card"><div class="q">你選的圖片</div><p class="hint">點圖片可以全螢幕放大，和組員分享你為什麼選這張。</p>
    <img class="bigpic" data-full="${esc(f.image_url)}" src="${esc(f.image_url)}" alt="">
    <p><button class="btn ghost" id="repick">重新選擇</button></p></div>
  <p class="wait"><span class="dot"></span>請先和小組成員分享。Facilitator 會開啟下一步：寫給未來的自己。</p>`;
  return ph(STAGE[2].title, "") + nameFixCard() + `
  <div class="card"><div class="q">請選一張圖片，${esc(pickLead(pjmNamesOf(S.roster, me().name)))}，對你的好處是什麼？</div>
    <p class="hint">點選圖片可以全螢幕放大。選好後按「送出」，再和小組成員分享你的選擇。</p>
    <div class="grid2" id="picGrid"></div>
    <p><button class="btn ghost" id="shuffle">🔀 換一批圖片</button></p></div>
  <div class="card soft row" style="position:sticky;bottom:10px;justify-content:space-between"><span id="selHint">還沒有選圖片</span><button class="btn" id="submitPic" disabled>送出我選的圖片</button></div>`;
}
function bind2() {
  bindNameFix();
  const f = S.future.get(S.meId) || {};
  if (f.image_submitted) {
    document.getElementById("repick").onclick = async () => { S.future.set(S.meId, { ...f, image_submitted: false }); S.pendingPic = f.image_url; await saveFuture(); render(); };
    return;
  }
  if (!S.pendingPic && f.image_url) S.pendingPic = f.image_url;
  pickPics();
  document.getElementById("shuffle").onclick = pickPics;
  document.getElementById("picGrid").onclick = (e) => {
    const b = e.target.closest(".pic"); if (!b) return;
    lightbox(b.dataset.url, () => { S.pendingPic = b.dataset.url; updateSel(); });
  };
  document.getElementById("submitPic").onclick = async () => {
    const cur = S.future.get(S.meId) || { person_id: S.meId };
    S.future.set(S.meId, { ...cur, image_url: S.pendingPic, image_submitted: true });
    await saveFuture(); render();
  };
}
function updateSel() {
  document.querySelectorAll(".pic").forEach((b) => b.classList.toggle("sel", b.dataset.url === S.pendingPic));
  const h = document.getElementById("selHint"), b = document.getElementById("submitPic");
  if (h) h.textContent = S.pendingPic ? "已選好圖片，確認後請送出" : "還沒有選圖片";
  if (b) b.disabled = !S.pendingPic;
}
function pickPics() {
  const keep = S.pendingPic;
  const list = IMAGE_THEMES.map((t) => {
    if (keep && t.files.includes(keep)) return { name: t.name, url: keep };
    return { name: t.name, url: t.files[Math.floor(Math.random() * t.files.length)] };
  });
  document.getElementById("picGrid").innerHTML = list.map((x) => `<button class="pic" data-url="${esc(x.url)}"><img src="${esc(x.url)}" alt=""></button>`).join("");
  updateSel();
}
async function saveFuture() {
  const f = S.future.get(S.meId); if (!f) return;
  const { error } = await sb.from("pjm_future").upsert({ person_id: S.meId, image_url: f.image_url ?? null, image_submitted: !!f.image_submitted, fill1: f.fill1 ?? null, fill2: f.fill2 ?? null, fill3: f.fill3 ?? null, updated_at: new Date().toISOString() });
  const s = document.getElementById("fSaved"); if (s) s.textContent = error ? "尚未儲存" : "已自動儲存 ✓";
  if (error) toast("尚未儲存：目前階段已切換或連線異常");
}
const saveFutureD = debounce(saveFuture, 700);

function v3() {
  const f = S.future.get(S.meId) || {};
  const label = esc(pjmLabel());
  const g = me().seat2;
  return ph(STAGE[3].title, "把剛才的分享，寫成一段話給未來的自己") + nameFixCard() + `
  ${f.image_url ? `<div class="card"><div class="future"><img class="thumb" data-full="${esc(f.image_url)}" src="${esc(f.image_url)}" alt=""><div class="tx"><span class="who">你選的圖片</span><br><span class="hint">點擊可全螢幕放大</span></div></div></div>` : ""}
  <div class="card"><div class="q">寫一段話給未來的自己</div>
    <p style="margin:6px 0">${esc(futureLead(pjmNamesOf(S.roster, me().name)))}，我就能</p><textarea data-fx="fill1" rows="2"></textarea>
    <p style="margin:6px 0">即使培育人才過程中會遇到種種挑戰，我仍願意</p><textarea data-fx="fill2" rows="2"></textarea>
    <p style="margin:6px 0">因為</p><textarea data-fx="fill3" rows="2"></textarea>
    <div class="saved" id="fSaved"></div></div>
  <h2>${g ? `${esc(g)} 組的夥伴` : "小組夥伴"}</h2>
  <div data-dyn="gallery"></div>` + foot;
}
function bind3() {
  bindNameFix();
  document.querySelectorAll("[data-fx]").forEach((el) => el.addEventListener("input", () => {
    const cur = S.future.get(S.meId) || { person_id: S.meId };
    S.future.set(S.meId, { ...cur, [el.dataset.fx]: el.value }); saveFutureD();
  }));
}

function v4() {
  const qs = [
    "第一次與新手互動時，KS 做了什麼？為什麼？",
    "有沒有哪些做法一開始行不通，調整了什麼？",
    "在工作很忙的情況下，如何安排觀察？",
    "如何知道自己的帶領方式有沒有幫助到新手？",
    "有哪些做法後來發現太花時間、不值得繼續？",
  ];
  const pk = nkey("person", String(S.meId), 4, "notes");
  return ph(STAGE[4].title, "『從一件小事開始』") + `
  <div class="card soft"><h3>聽 KS 分享時，可以想想</h3>${qs.map((q, i) => `<p style="margin:8px 0"><b>${i + 1}. ${esc(q)}</b></p>`).join("")}</div>
  <div class="card"><div class="q">我的筆記</div>
    <p class="hint">記下你聽到的重點與想法，只有你自己看得到。</p>
    <textarea data-n="${esc(pk)}" rows="8" placeholder="想到什麼就記下來…"></textarea>
    <p class="row"><button class="btn" id="saveMyNotes">儲存筆記</button><span class="saved" id="myNotesSaved"></span></p></div>
` + foot;
}

function bind4() {
  const t = document.querySelector("[data-n]"); 
  const btn = document.getElementById("saveMyNotes"); if (!btn || !t) return;
  btn.onclick = async () => { await saveNote(t.dataset.n, t.value); document.getElementById("myNotesSaved").textContent = "已儲存 ✓"; };
  t.addEventListener("input", () => { document.getElementById("myNotesSaved").textContent = ""; });
}

function v5() {
  const g = me().seat2;
  const mem = S.people.filter((p) => g && p.seat2 === g).map((p) => p.name).join("、");
  return ph(STAGE[5].title, "和小組夥伴一起討論，共編一份答案") + (g ? `
  <div class="card"><div class="pill warn">你的小組：${esc(g)}</div> <span class="hint">${esc(mem)}</span>
    <div class="q" style="margin-top:12px">剛才 KS 分享的經驗中，有沒有哪一個做法，即使我的資源有限，也有機會嘗試？</div>
    <p class="hint">同組夥伴看到的是同一份內容，可以一起補充。討論完請按「送出」，facilitator 會請各組輪流分享。</p>
    ${nf("seat", g, 5, "tryable", 7)}
    <p class="row"><button class="btn" id="sendGroup">送出給 facilitator</button><span class="saved" id="sentMsg"></span></p></div>`
  : `<div class="card"><p class="wait" style="padding:6px"><span class="dot"></span>請依現場安排換位置，facilitator 設定好你的小組後，這裡會出現共編欄位。</p></div>`) + foot;
}
function bind5() {
  const b = document.getElementById("sendGroup"); if (!b) return;
  const g = me().seat2, k = nkey("seat", g, 5, "tryable");
  const m = document.getElementById("sentMsg");
  const mark = () => { m.textContent = note("seat", g, 5, "submitted") ? "已送出 ✓（修改後可再按一次更新）" : ""; };
  mark();
  b.onclick = async () => {
    const t = document.querySelector("[data-n]"); await saveNote(k, t.value);
    await saveNote(nkey("seat", g, 5, "submitted"), new Date().toISOString()); mark(); toast("已送出給 facilitator");
  };
}

let invRowId = null;
S.rowId = null;
const myTrainees = () => rosterRowsOf(S.roster, me().name).filter((r) => r.id > 0 && (r.pjm_name || "").trim());
function v6() {
  if (guestOnly()) return ph(STAGE[6].title, "") + `<div class="card"><p>這個階段由教練與主管填寫，重要嘉賓可以先走動關心各組的狀況。</p></div>` + foot;
  const tr = myTrainees();
  if (!tr.length) return ph(STAGE[6].title, "") + nameFixCard() + foot;
  if (!tr.some((r) => r.id === invRowId)) invRowId = tr[0].id;
  const cur = tr.find((r) => r.id === invRowId);
  const i = S.inv.get(S.meId + "|" + invRowId) || {};
  const nm = esc(cur.pjm_name);
  return ph(STAGE[6].title, "請依你自己的觀察填寫。每個人各自填，到下一階段才會與小組合併。") + nameFixCard() +
  (tr.length > 1 ? `<div class="row" style="margin:10px 0">${tr.map((r) => { const d = S.inv.get(S.meId + "|" + r.id); return `<button class="chip ${r.id === invRowId ? "on" : ""}" data-invrow="${r.id}">${esc(r.pjm_name)}${d && d.has_obs !== null && d.has_obs !== undefined ? " ✓" : ""}</button>`; }).join("")}</div>` : "") + `
  <h2 style="margin-top:8px">${nm} 的培育起點</h2>
  <div class="card"><div class="q">關於 ${nm}，我目前掌握的資訊：</div>
    <div class="opts">
      <label class="opt"><input type="radio" name="obs" value="yes" ${i.has_obs === true ? "checked" : ""}><span>已有具體工作行為觀察</span></label>
      <label class="opt"><input type="radio" name="obs" value="no" ${i.has_obs === false ? "checked" : ""}><span>目前還沒有具體觀察</span></label></div></div>
  <div id="invYes" class="card" style="display:none">
    <div class="q">優先想培育哪些能力？（可複選）</div>
    <div class="grid2" style="grid-template-columns:repeat(auto-fill,minmax(190px,1fr))">${ABILITIES.map((a) => `<label class="opt"><input type="checkbox" name="ab" value="${a}" ${(i.abilities || []).includes(a) ? "checked" : ""}><span>${a}</span></label>`).join("")}</div>
    <div class="q" style="margin-top:14px">三個月後，你期待 ${nm} 能獨立做到什麼？</div>
    <p class="hint">請描述一個可觀察的工作行為，而不是只寫「提升溝通能力」。</p>
    <textarea id="invExp" rows="4">${esc(i.expectation || "")}</textarea></div>
  <div id="invNo" class="card" style="display:none">
    <div class="q">接下來有哪些機會，可以幫助你更了解 ${nm}？</div>
    <textarea id="invOpp" rows="4">${esc(i.opportunities || "")}</textarea></div>
  <div class="saved" id="invSaved"></div>` + foot;
}
let invTimer = null;
async function saveInv() {
  clearTimeout(invTimer);
  if (!document.getElementById("invExp") || invRowId == null) return;
  const v = document.querySelector("[name=obs]:checked")?.value;
  const cur = S.roster.find((r) => r.id === invRowId);
  const row = {
    person_id: S.meId, trainee_id: invRowId, pjm_label: cur?.pjm_name || "",
    has_obs: v ? v === "yes" : null,
    abilities: [...document.querySelectorAll("[name=ab]:checked")].map((x) => x.value),
    expectation: document.getElementById("invExp").value, opportunities: document.getElementById("invOpp").value,
    updated_at: new Date().toISOString(),
  };
  S.inv.set(S.meId + "|" + invRowId, row);
  const { error } = await sb.from("pjm_inventory").upsert(row);
  const el = document.getElementById("invSaved"); if (el) el.textContent = error ? "尚未儲存" : "已自動儲存 ✓";
}
function bind6() {
  if (guestOnly()) return;
  bindNameFix();
  if (!document.getElementById("invExp")) return;
  const show = () => {
    const v = document.querySelector("[name=obs]:checked")?.value;
    document.getElementById("invYes").style.display = v === "yes" ? "" : "none";
    document.getElementById("invNo").style.display = v === "no" ? "" : "none";
  };
  const queue = () => { clearTimeout(invTimer); invTimer = setTimeout(saveInv, 600); };
  $app.oninput = queue; $app.onchange = () => { show(); queue(); };
  $app.onclick = async (e) => {
    const b = e.target.closest("[data-invrow]"); if (!b) return;
    await saveInv(); invRowId = +b.dataset.invrow; render();
  };
  show();
}

const teamInv = () => {
  const rows = [...S.inv.values()].filter((i) => i.trainee_id === S.rowId);
  if (!rows.length) return `<p class="hint">這一組成員的盤點結果會顯示在這裡。</p>`;
  return rows.sort((a, b) => a.person_id - b.person_id).map((i) => {
    const p = S.people.find((x) => x.id === i.person_id);
    const r = S.roster.find((x) => x.id === i.trainee_id);
    const rr = (S.regs.get(p.id)?.roles || p.roles).filter((x) => x !== "guest").map(roleLabel).join("／");
    return `<div class="card" style="margin:8px 0"><span class="who">${esc(p.name)}</span> <span class="pill">${esc(rr)}</span>
      <div class="hint" style="margin:4px 0">${esc(rowPjm(r))} 的培育起點 · ${i.has_obs === true ? "已有具體觀察" : i.has_obs === false ? "尚待觀察驗證" : "未填"}</div>
      ${i.has_obs ? `<div><b>優先能力：</b>${esc((i.abilities || []).join("、") || "—")}</div><div><b>三個月後期待：</b>${nl2br(i.expectation || "—")}</div>` : `<div><b>了解 PJM 的機會：</b>${nl2br(i.opportunities || "—")}</div>`}</div>`;
  }).join("");
};

const Q5 = {
  q3: ["已有具體觀察", "尚待觀察驗證"],
};
// 階段 7、8：以「名單中的一列（一位新手 PJM）」為單位
const myRows = () => rosterRowsOf(S.roster, me().name).filter((r) => r.id > 0);
function pickRow() {
  const rs = myRows(); if (!rs.length) return null;
  if (!rs.some((r) => r.id === S.rowId)) S.rowId = rs[0].id;
  return rs.find((r) => r.id === S.rowId);
}
function rowTabs() {
  const rs = myRows(); if (rs.length < 2) return "";
  return `<div class="row" style="margin:10px 0">${rs.map((r) => `<button class="chip ${r.id === S.rowId ? "on" : ""}" data-row="${r.id}">${esc(rowPjm(r))}</button>`).join("")}</div>`;
}
const lastSaved = new Map();
function flushNotes() { document.querySelectorAll("[data-n]").forEach((el) => { if (lastSaved.get(el.dataset.n) !== el.value && (S.notes.get(el.dataset.n) ?? "") !== "" ) saveNote(el.dataset.n, el.value); }); }
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-row]"); if (!b) return;
  flushNotes(); S.rowId = +b.dataset.row; render();
});
const noRow = (st) => ph(STAGE[st].title, "") + `<div class="card"><p>此階段由各培育小組（教練與主管）討論，重要嘉賓可以走動聆聽。</p></div>` + foot;

function v7() {
  const r = pickRow(); if (!r) return noRow(7);
  const k = (f) => ["row", String(r.id), 7, f], nm = esc(rowPjm(r));
  return ph(STAGE[7].title, `${rowPjm(r)} 的培育小組：${rowPeople(r).join("、")}`) + rowTabs() + `
  <details class="ref" open><summary>大家剛才各自的盤點</summary><div data-dyn="teamInv"></div></details>
  <div class="card"><div class="q">① 三個月後，希望 ${nm} 能獨立做到什麼？</div><p class="hint">請描述一個可觀察的工作行為，而不是只寫「提升溝通能力」。</p>${nf(...k("q1"), 3)}</div>
  <div class="card"><div class="q">② 本次優先關注 ${nm} 的哪一項 PJM 能力？</div>${checks(...k("q2"), ABILITIES)}</div>
  <div class="card"><div class="q">③ 目前的培育起點</div>${radios(...k("q3"), Q5.q3)}</div>
  <div class="card"><div class="q">④ 下一步要做什麼？</div><p class="hint">請選擇一個真實工作情境，並明確分工。</p>
    ${nf(...k("q4"), 3, "真實工作情境與下一步")}
    ${q4Fields(r).map((f) => `<div class="q4row"><div class="q4plants">${f.roles.map((rk) => sprigSvg(ROLES[rk].plant)).join("")}</div><div class="q4body"><p style="margin:2px 0 4px"><b>${esc(f.label)}</b>，要做</p>${nf(...k(f.key), 2)}</div></div>`).join("")}</div>
  <div class="card"><div class="q">⑤ 預計何時執行？如何知道有進步？</div>${nf(...k("q5"), 3)}</div>` + foot;
}

function v8() {
  const r = pickRow(); if (!r) return noRow(8);
  const k = (f) => ["row", String(r.id), 8, f];
  return ph(STAGE[8].title, `${rowPjm(r)} 的培育小組`) + rowTabs() + `
  <details class="ref" open><summary>回看：階段 7 的培育共識（即時更新）</summary><div data-dyn="stage5"></div></details>
  ${F_QUESTIONS.filter((x) => !x.perCoach || (r.coach === me().name && myRoles().includes("coach"))).map((x, i) => `<div class="card"><div class="q">${i + 1}. ${esc(x.q)}</div>${x.perCoach && S.roster.filter((y) => y.row_id === r.row_id && y.id > 0).length > 1 ? `<p class="hint">${esc(r.coach)} 教練帶多位新手，這題只需回答一次，每位新手頁面的答案相同。</p>` : ""}${x.multi ? checks(...fLoc(x, r), x.opts) : radios(...fLoc(x, r), x.opts)}</div>`).join("")}
  <div class="card"><div class="q">補充說明（選填）</div>${nf(...k("fnote"), 3)}</div>
  <div class="card soft"><div class="q">送出 ${esc(rowPjm(r))} 的培育計畫</div><p class="hint">確認階段 7、8 都討論完了，再按送出。送出後，facilitator 會在大螢幕呈現全班培育計畫的概況。</p>
    <p class="row"><button class="btn" id="sendPlan">送出培育計畫</button><span class="saved" id="planMsg"></span></p></div>` + foot;
}
function bind8() {
  const b = document.getElementById("sendPlan"); if (!b) return;
  const id = String(S.rowId), msg = document.getElementById("planMsg");
  const mark = () => { msg.textContent = note("row", id, 8, "submitted") ? "已送出 ✓" : ""; };
  mark();
  b.onclick = async () => {
    flushNotes(); b.disabled = true; msg.textContent = "送出中…";
    await saveNote(nkey("row", id, 8, "submitted"), new Date().toISOString());
    b.disabled = false; msg.textContent = "已送出 ✓（修改後可再按一次更新）";
  };
}

function v9() {
  return ph(STAGE[9].title, "請看大螢幕：全班的培育計畫概況，與重要嘉賓的現場回饋") + `
  <div data-dyn="summaries"></div>
  <h2>我的筆記：重要嘉賓的回饋</h2>
  <div class="card"><p class="hint">嘉賓分享時，把你聽到的回饋記在這裡。每個人各自一份，不會互相覆蓋，facilitator 會在後台彙整。不需要每個人都寫。</p>${nf("person", String(S.meId), 9, "guest_note", 8, "把聽到的回饋記在這裡…")}</div>` + foot;
}

// 同時是重要嘉賓、又有負責培育小組的人（例如 Casper），可以下載兩種版本
const bothPdf = () => myRoles().includes("guest") && rosterRowsOf(S.roster, me().name).some((r) => r.id > 0);

function v10() {
  return ph(STAGE[10].title, "這份計畫是你和夥伴今天一起完成的") + `
  <div class="card soft"><h3>你的 PDF 會包含</h3>
  <p style="margin:6px 0">• 封面：你選的圖片與寫給未來自己的話</p>
  <p style="margin:6px 0">• 小組共編的培育做法、培育共識與可行性檢查</p>
  <p style="margin:6px 0">• 重要嘉賓回饋</p></div>
  ${bothPdf() ? `<p class="row"><a class="btn" href="print.html?pid=${S.meId}&v=team" target="_blank">開啟培育小組版（可列印／存成 PDF）</a><a class="btn ghost" href="print.html?pid=${S.meId}&v=guest" target="_blank">開啟重要嘉賓版</a></p>` : `<p><a class="btn" href="print.html?pid=${S.meId}" target="_blank">開啟我的培育計畫（可列印／存成 PDF）</a></p>`}
  <p class="hint">在開啟的頁面按「列印／存成 PDF」。之後也可以用同一個網址回來下載。</p>`;
}

// ---------- 動態區塊 ----------
// ---------- 預約報到階段：找組別入座、打勾準備事項 ----------
const readyKey = (i) => nkey("person", String(S.meId), 0, "ready" + i);
const isReady = (id) => READY_ITEMS.every((_, i) => S.notes.get(nkey("person", String(id), 0, "ready" + i)) === "1");
function seatingCard() {
  const m = me(), g = m.seat2;
  if (m.absent) return `<div class="card"><h3>你這次請假</h3><p class="hint" style="margin:0">如果行程有變，請聯絡工作小組。</p></div>`;
  if (!g) return `<div class="card"><h3>入座</h3><p class="hint" style="margin:0">跨產品組別尚未公布，請稍候；公布後這裡會顯示你的組別。</p></div>`;
  const mates = S.people.filter((p) => p.seat2 === g && !p.absent && p.id !== m.id).map((p) => esc(p.name)).join("、");
  const done = isReady(m.id);
  return `<div class="card" style="border-color:var(--brand)"><div class="pill warn">你的組別</div>
    <div style="font-size:30px;font-weight:700;margin:4px 0">${esc(g)} 組</div>
    <p style="margin:0">請看大螢幕，找到你所屬的組別後入座。同組夥伴：${mates || "（尚無）"}</p>
    <h3 style="margin-top:14px">入座後，請勾選今天的準備事項</h3>
    <div class="opts">${READY_ITEMS.map((t, i) => `<label class="opt"><input type="checkbox" data-ready="${i}" ${S.notes.get(readyKey(i)) === "1" ? "checked" : ""}><span>${esc(t)}</span></label>`).join("")}</div>
    <p id="readyMsg" class="hint" style="margin:8px 0 0">${done ? "✓ 你已就緒，大螢幕上會顯示你已抵達。" : ""}</p></div>`;
}
function bindReady() {
  document.querySelectorAll("[data-ready]").forEach((c) => (c.onchange = async () => {
    await saveNote(readyKey(c.dataset.ready), c.checked ? "1" : "");
    const m = document.getElementById("readyMsg"); if (m) m.textContent = isReady(S.meId) ? "✓ 你已就緒，大螢幕上會顯示你已抵達。" : "";
  }));
}

// ---------- 階段：回到你的培育小組 ----------
function v11() {
  if (guestOnly()) return ph(STAGE[11].title, "") + `<div class="card"><p>培育小組由教練與主管組成，重要嘉賓可以自由走動，聆聽各組討論。</p></div>` + foot;
  const rs = myRows();
  if (!rs.length) return ph(STAGE[11].title, "") + nameFixCard() + foot;
  const seated = S.notes.get(nkey("person", String(S.meId), 11, "seated")) === "1";
  return ph(STAGE[11].title, "請看大螢幕的新座位安排，移動到你的培育小組") + `
  ${rs.length > 1 ? `<div class="card soft"><p style="margin:0">你同時在 ${rs.length} 個培育小組，會依序參與各組的討論。先到第一組入座即可。</p></div>` : ""}
  ${rs.map((r) => `<div class="card"><h3 style="margin:0 0 4px">${esc(rowPjm(r))} 的培育小組</h3><p class="hint" style="margin:0">${esc(r.unit)}｜${rowPeople(r).map(esc).join("、")}</p></div>`).join("")}
  <div class="card soft"><label class="opt"><input type="checkbox" id="seatedBox" ${seated ? "checked" : ""}><span>我已回到培育小組入座</span></label></div>` + foot;
}
function bind11() {
  const b = document.getElementById("seatedBox"); if (!b) return;
  b.onchange = () => saveNote(nkey("person", String(S.meId), 11, "seated"), b.checked ? "1" : "");
}

// ---------- 階段：滿意度問卷（匿名） ----------
function v12() {
  if (ls.get("pjm_survey_done") === "1") return ph(STAGE[12].title, "") + `<div class="card soft rolecard">${sprigSvg()}<div class="rt">謝謝你的回饋！</div><p class="hint">你的答案已匿名送出。</p></div>`;
  const rating = (q) => `<div class="card"><div class="q">${esc(q.q)}</div>
    <div class="row" style="justify-content:space-between;margin-top:8px">${[1, 2, 3, 4, 5].map((n) => `<label class="opt" style="flex:1;justify-content:center;min-width:52px"><input type="radio" name="sv_${q.k}" value="${n}"><span>${n}</span></label>`).join("")}</div>
    <div class="row hint" style="justify-content:space-between;margin-top:4px"><span>1 非常不同意</span><span>5 非常同意</span></div></div>`;
  const text = (q) => `<div class="card"><div class="q">${esc(q.q)}</div><textarea id="sv_${q.k}" rows="3" placeholder="（選填）"></textarea></div>`;
  return ph(STAGE[12].title, "約 2 分鐘。問卷是匿名的，不會記錄姓名。") + SURVEY_Q.map((q) => (q.type === "rating" ? rating(q) : text(q))).join("") +
    `<p><button class="btn" id="svGo">送出問卷</button><span class="saved" id="svMsg"></span></p>`;
}
function bind12() {
  const b = document.getElementById("svGo"); if (!b) return;
  b.onclick = async () => {
    const answers = {};
    for (const q of SURVEY_Q) {
      if (q.type === "rating") { const v = document.querySelector("[name=sv_" + q.k + "]:checked")?.value; if (!v) { toast("請回答所有評分題"); return; } answers[q.k] = +v; }
      else answers[q.k] = document.getElementById("sv_" + q.k).value.trim();
    }
    b.disabled = true;
    const { error } = await sb.from("pjm_survey").insert({ answers });
    if (error) { b.disabled = false; toast("送出失敗，請稍後再試"); return; }
    ls.set("pjm_survey_done", "1"); render();
  };
}

const DYN = {
  gallery() {
    const g = me().seat2;
    const mem = S.people.filter((p) => p.id !== S.meId && g && p.seat2 === g);
    if (!g) return `<p class="hint">Facilitator 設定好小組後，會在這裡看到同組夥伴的圖片和心聲。</p>`;
    if (!mem.length) return `<p class="hint">同組夥伴的內容會顯示在這裡。</p>`;
    return mem.map((p) => {
      const f = S.future.get(p.id); if (!f) return `<div class="card"><span class="who">${esc(p.name)}</span> <span class="hint">還在選圖…</span></div>`;
      return `<div class="card"><div class="future">${f.image_url ? `<img src="${esc(f.image_url)}" alt="">` : ""}<div class="tx"><span class="who">${esc(p.name)}</span><br>${esc(futureLead(pjmNamesOf(S.roster, p.name)))}，我就能${esc(f.fill1 || "…")}；即使會遇到挑戰，我仍願意${esc(f.fill2 || "…")}，因為${esc(f.fill3 || "…")}。</div></div></div>`;
    }).join("");
  },
  teamInv,
  stage5() {
  const r = S.roster.find((x) => x.id === S.rowId); if (!r) return "";
    const g = (f) => note("row", String(r.id), 7, f);
    const row = (l, v) => `<tr><th style="width:34%">${l}</th><td>${nl2br(v) || "<span class='hint'>（尚未填寫）</span>"}</td></tr>`;
    return `<table class="t">` + row("① 三個月後能獨立做到", g("q1")) + row("② 優先能力", g("q2").split("||").filter(Boolean).join("、")) + row("③ 目前培育起點", g("q3")) +
      row("④ 情境與下一步", g("q4")) + q4Fields(r).map((f) => row("　" + esc(f.label), g(f.key))).join("") + row("⑤ 何時執行／如何判斷進步", g("q5")) + `</table>`;
  },
  summaries() {
    const final = note("all", "all", 9, "guest_final");
    return final ? '<div class="card soft"><h3>重要嘉賓回饋整理</h3><div>' + nl2br(final) + "</div></div>" : "";
  },
};

boot();
