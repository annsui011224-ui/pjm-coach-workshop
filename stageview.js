// Facilitator「階段控制」：左邊階段清單、右邊可直接投影的畫面
// 依賴 admin.js 的 D、nv、PASS、rpc、toast、load，以及 common.js、dash.js、seats.js、group.js

let surveyRows = null;

// ---------- 投影用的小元件 ----------
const pH1 = (t) => `<h1 class="p-h1">${esc(t)}</h1>`;
const pLead = (t) => `<p class="p-lead">${t}</p>`;
const pBar = (n, t, label) => {
  const pct = t ? Math.round((n / t) * 100) : 0;
  return `<div class="p-prog"><div class="p-bar"><i style="width:${pct}%"></i></div><div class="p-plabel">${esc(label)}　<b>${n}／${t}</b>（${pct}%）</div></div>`;
};
const attendees = () => D.people.filter((p) => !p.absent);
const readyOf = (id) => READY_ITEMS.every((_, i) => nv("person", String(id), 0, "ready" + i) === "1");
const chip = (text, on) => `<span class="p-chip ${on ? "on" : ""}">${on ? "✓ " : ""}${esc(text)}</span>`;

function seatGroups() {
  const g = {};
  attendees().filter((p) => p.seat2).forEach((p) => (g[p.seat2] ||= []).push(p));
  return Object.keys(g).sort((a, b) => (+a || 0) - (+b || 0) || a.localeCompare(b)).map((k) => ({ g: k, members: g[k] }));
}

// ---------- 各階段的投影內容 ----------
function projArrival() {
  const gs = seatGroups(), all = attendees(), ready = all.filter((p) => readyOf(p.id)).length;
  if (!gs.length) return pH1("請找到你所屬組別後入座") + pLead("尚未分組。請到「跨產品分組」分頁設定。");
  return pH1("請找到你所屬組別後入座") +
    pLead("入座後，請在電腦上勾選：<br>☐ " + READY_ITEMS.map(esc).join("　　☐ ")) +
    pBar(ready, all.length, "已就緒") +
    `<div class="p-grid">${gs.map(({ g, members }) => {
      const n = members.filter((p) => readyOf(p.id)).length;
      return `<div class="p-card"><div class="p-ctitle"><span>${esc(g)} 組</span><span class="p-count ${n === members.length ? "full" : ""}">${n}／${members.length}</span></div>${members.map((p) => chip(p.name, readyOf(p.id))).join("")}</div>`;
    }).join("")}</div>` +
    `<p class="p-lead p-intro">跟你的小組夥伴介紹你的角色卡</p>` + plantsBand();
}

function projPurpose() {
  return pH1("工作坊目的") + `<p class="p-big">從限制中找到培育的可能性</p>` +
    pLead("培育一位能獨當一面的 PJM，不應該只靠教練個人的熱忱。<br>每個人的專案工作都很忙，我們也不期待大家憑空變出更多時間。") +
    `<div class="p-card"><div class="p-ctitle"><span>今天希望一起找到</span></div>
      <ol class="p-list"><li>在現有工作條件下，我們可以怎麼開始？</li><li>需要哪些協助？</li><li>又如何讓這件事能持續發生？</li></ol></div>`;
}

function projPickImage() {
  const all = attendees(), n = all.filter((p) => D.future.find((f) => f.person_id === p.id && f.image_submitted)).length;
  return pH1("選一張圖片") + pLead("請選一張圖片，說明當你的新手 PJM 成為能獨當一面的 PJM 時，<b>對你的好處是什麼？</b>") +
    pLead("選好後按「送出」，再和同組夥伴分享你選這張圖的理由。") + pBar(n, all.length, "已送出圖片");
}

function projLetter() {
  const all = attendees(), n = all.filter((p) => D.future.find((f) => f.person_id === p.id && f.fill1)).length;
  return pH1("寫給未來的自己") + `<div class="p-card"><p class="p-q">當我培育的 PJM 能夠獨當一面時，我就能 ＿＿＿＿＿＿；<br>即使培育人才過程中會遇到種種挑戰，我仍願意 ＿＿＿＿＿＿，<br>因為 ＿＿＿＿＿＿。</p></div>` +
    pBar(n, all.length, "已寫完");
}

function projKS() {
  const qs = ["第一次與新手互動時，KS 做了什麼？為什麼？", "有沒有哪些做法一開始行不通，調整了什麼？", "在工作很忙的情況下，如何安排觀察？", "如何知道自己的帶領方式有沒有幫助到新手？", "有哪些做法後來發現太花時間、不值得繼續？"];
  return pH1("拋磚引玉：教練 KS 的分享") + `<p class="p-big">『從一件小事開始』</p><ol class="p-list">${qs.map((q) => `<li>${esc(q)}</li>`).join("")}</ol>` +
    `<p class="p-sub">請在電腦上的「我的筆記」記下聽到的重點。</p>`;
}

function projDiscuss() {
  const gs = seatGroups(), sent = gs.filter(({ g }) => nv("seat", g, 5, "submitted")).length;
  return pH1("小組討論") + pLead("剛才 KS 分享的經驗中，有沒有哪一個做法，<b>即使我的資源有限，也有機會嘗試？</b>") +
    pLead("同組一起討論，在電腦上共編一份答案，討論完按「送出給 facilitator」。") + pBar(sent, gs.length, "已送出的組別") +
    `<div class="p-grid">${gs.map(({ g, members }) => `<div class="p-card"><div class="p-ctitle"><span>${esc(g)} 組</span><span class="p-count ${nv("seat", g, 5, "submitted") ? "full" : ""}">${nv("seat", g, 5, "submitted") ? "已送出" : "討論中"}</span></div></div>`).join("")}</div>` +
    `<p class="row" style="margin-top:18px"><button class="btn" data-act="share">▶ 投影各組答案</button><button class="btn ghost" data-act="cloud">☁ 文字雲</button></p>`;
}

function teamsByUnit() {
  const teams = D.roster.filter((r) => r.id > 0);
  return [...new Set(teams.map((r) => r.unit))].map((u) => ({ u, teams: teams.filter((r) => r.unit === u) }));
}
function seatedOf(id) { return nv("person", String(id), 11, "seated") === "1"; }
function projTeamSeating() {
  const people = (n) => D.people.find((p) => p.name === n);
  const teams = D.roster.filter((r) => r.id > 0);
  const need = new Set(teams.flatMap((r) => rowPeople(r))); const seated = [...need].filter((n) => people(n) && seatedOf(people(n).id)).length;
  return pH1("回到你的培育小組") + pLead("請看新的座位安排，移動到你的培育小組入座。") + pBar(seated, need.size, "已入座") +
    teamsByUnit().map(({ u, teams: ts }) => `<h2 class="p-h2">${esc(u)}</h2><div class="p-grid">${ts.map((r) => `<div class="p-card"><div class="p-ctitle"><span>${esc(rowPjm(r))} 的小組</span></div>
      ${rowPeople(r).map((n) => { const p = people(n); return chip(n + (p?.absent ? "（請假）" : ""), p && seatedOf(p.id)); }).join("")}</div>`).join("")}</div>`).join("") + plantsBand();
}

function projInventory() {
  const ps = participants().filter((p) => !p.absent);
  const need = ps.reduce((a, p) => a + rosterRowsOf(D.roster, p.name).filter((r) => r.id > 0).length, 0);
  const n = D.inv.filter((i) => i.has_obs !== null && ps.some((p) => p.id === i.person_id)).length;
  return pH1("培育起點盤點") + pLead("請依你自己的觀察，填寫你負責的每一位新手 PJM 的培育起點。<br>教練與主管各自填寫，到下一階段才會合併。") +
    `<div class="p-card"><div class="p-ctitle"><span>如果已有具體觀察，請從八大能力選出優先培育的項目</span></div>${ABILITIES.map((a) => chip(a)).join("")}</div>` +
    pBar(n, need, "已完成的盤點");
}

function projAlign() {
  const teams = D.roster.filter((r) => r.id > 0), done = teams.filter((r) => ["q1", "q2", "q3", "q4", "q5"].every((x) => nv("row", String(r.id), 7, x))).length;
  return pH1("教練 × PJM 主管對齊培育共識") + `<ol class="p-list">
    <li>三個月後，希望新手能獨立做到什麼？<small>請描述可觀察的工作行為</small></li><li>本次優先關注哪一項 PJM 能力？</li><li>目前的培育起點</li>
    <li>下一步要做什麼？<small>選一個真實工作情境，並明確分工</small></li><li>預計何時執行？如何知道有進步？</li></ol>` + pBar(done, teams.length, "已完成的培育小組");
}

function projFeasible() {
  const teams = D.roster.filter((r) => r.id > 0), done = teams.filter((r) => ["f1", "f2", "f3"].every((f) => nv("row", String(r.id), 8, f))).length;
  return pH1("培育計畫可行性檢查") + `<ol class="p-list">${F_QUESTIONS.map((q) => `<li>${esc(q.q)}</li>`).join("")}</ol>` +
    pBar(done, teams.length, "已完成的培育小組") + `<p class="p-sub">全部確認後，請按「送出培育計畫」。</p>`;
}

function projEnergize() {
  const st = dashStats(D.roster, nv, false), notes = guestNotes();
  return pH1("讓好行動更有力量") + `<p class="p-sub" style="margin:0 0 8px">全班培育計畫概況（已送出 ${st.sent}／${st.total} 組培育小組）</p>` + dashHtml(st, true) +
    `<h2 class="p-h2">請重要嘉賓給予回饋</h2>` + (notes.length ? `<p class="p-sub">已收到 ${notes.length} 則回饋筆記，以下是最新的幾則</p><div class="p-grid">${notes.slice(0, 6).map((n) => `<div class="p-card"><div class="p-note" style="display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden">${esc(n.text)}</div></div>`).join("")}</div>` : `<p class="p-sub">（嘉賓分享時，參與者會在電腦上各自記錄筆記）</p>`);
}

function projTakeaway() {
  return pH1("帶走你的培育計畫") + pLead("請在電腦上點「開啟我的培育計畫」，再按「列印／存成 PDF」。") +
    `<ol class="p-list"><li>封面是你選的圖片和寫給未來自己的話</li><li>每位新手 PJM 各有一頁培育計畫</li><li>之後也可以用同一個網址回來下載</li></ol>`;
}

function projSurvey() {
  const rows = surveyRows || [], n = rows.length, all = attendees().length;
  const avg = (k) => (n ? (rows.reduce((a, r) => a + (r.answers[k] || 0), 0) / n).toFixed(1) : "—");
  return pH1("工作坊滿意度問卷") + pLead("請在電腦上填寫問卷（約 2 分鐘，匿名）。") + pBar(n, all, "已填寫") +
    `<div class="p-grid">${SURVEY_Q.filter((q) => q.type === "rating").map((q) => `<div class="p-card"><div class="p-qs">${esc(q.q)}</div><div class="p-score">${avg(q.k)}<small> / 5</small></div></div>`).join("")}</div>`;
}

function projPrep() {
  const all = D.people, reg = all.filter((p) => regOf(p.id)), left = all.filter((p) => !regOf(p.id));
  const diets = {}; D.regs.forEach((r) => { const k = r.diet || "未填"; diets[k] = (diets[k] || 0) + 1; });
  const units = [...new Set(all.map((p) => p.unit || "重要嘉賓"))];
  return pH1("行前準備") + pLead("請開啟通知信中的連結，填寫行前調查（身分、新手 PJM、午餐飲食偏好）。<br>組別與座位會在工作坊當天公布。") +
    pBar(reg.length, all.length, "已完成行前調查") + pBar(D.regs.filter((r) => r.laptop_ok).length, all.length, "已確認攜帶筆電、電量可撐 2 小時") +
    '<div class="p-grid">' + units.map((u) => { const m = all.filter((p) => (p.unit || "重要嘉賓") === u), n = m.filter((p) => regOf(p.id)).length;
      return '<div class="p-card"><div class="p-ctitle"><span>' + esc(u) + '</span><span class="p-count ' + (n === m.length ? "full" : "") + '">' + n + "／" + m.length + "</span></div>" + m.map((p) => chip(p.name, !!regOf(p.id))).join("") + "</div>"; }).join("") + "</div>" +
    '<p class="p-sub">午餐飲食：' + (Object.entries(diets).map(([k, v]) => esc(k) + " × " + v).join("　") || "尚無資料") + "</p>";
}

const PROJ = { 13: projPrep, 0: projArrival, 1: projPurpose, 2: projPickImage, 3: projLetter, 4: projKS, 5: projDiscuss, 11: projTeamSeating, 6: projInventory, 7: projAlign, 8: projFeasible, 9: projEnergize, 10: projTakeaway, 12: projSurvey };

// ---------- 階段控制頁 ----------
function pStage() {
  const pane = document.getElementById("pane");
  pane.innerHTML = `<div class="stage2col ${stageLeftHidden() ? "collapsed" : ""}" id="stageCols"><div id="stageLeft"></div>
    <div id="stageRight" class="stageRight"><div class="p-tool"><span class="row"><button class="chip" id="colBtn" title="收合／展開左邊階段清單">☰ 階段清單</button><span id="stageTitle" class="pill"></span></span><button class="chip" id="fsBtn">⛶ 全螢幕投影</button></div><div id="projBody"><div id="projInner" class="proj"></div></div><div class="p-nav" id="stageNav"><button class="btn ghost" id="navPrev">◀ 上一階段</button><span id="navLabel"></span><button class="btn" id="navNext">下一階段 ▶</button></div></div></div>`;
  document.getElementById("fsBtn").onclick = () => { const el = document.getElementById("stageRight"); if (document.fullscreenElement) document.exitFullscreen(); else el.requestFullscreen?.(); };
  document.getElementById("colBtn").onclick = () => {
    const hide = !stageLeftHidden(); try { localStorage.setItem("pjm_stage_left_hidden", hide ? "1" : "0"); } catch {}
    document.getElementById("stageCols").classList.toggle("collapsed", hide);
  };
  document.getElementById("navPrev").onclick = () => goStage(-1);
  document.getElementById("navNext").onclick = () => goStage(1);
  paintStage();
}

const stageLeftHidden = () => { try { return localStorage.getItem("pjm_stage_left_hidden") === "1"; } catch { return false; } };

// 上一階段／下一階段（全螢幕時使用；不再逐次確認，避免打斷投影）
async function goStage(delta) {
  const i = stageIdx(D.stage) + delta;
  if (i < 0 || i >= STAGES.length) { toast(delta > 0 ? "已經是最後一個階段" : "已經是第一個階段"); return; }
  await rpc("pjm_admin_set_stage", { s: STAGES[i].n });
  await load(true);
  toast("已切換到：" + STAGES[i].title);
}
document.addEventListener("keydown", (e) => {
  const el = document.getElementById("stageRight");
  if (!el || document.fullscreenElement !== el || document.getElementById("projLayer")) return;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
  if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); goStage(1); }
  else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); goStage(-1); }
});

async function paintStage() {
  const left = document.getElementById("stageLeft"), body = document.getElementById("projInner");
  if (!left || !body) return;
  const cur = stageIdx(D.stage);
  left.innerHTML = `<p class="hint" style="margin:0 0 8px">點選階段即可開啟，所有參與者的畫面會同步切換。</p>` + STAGES.map((s, i) => `<button class="stagebtn ${s.n === D.stage ? "cur" : i < cur ? "done" : ""}" data-s="${s.n}">
      <span><b>${i}. ${esc(s.title)}</b></span><span class="pill ${s.n === D.stage ? "" : "warn"}">${s.n === D.stage ? "進行中" : i < cur ? "已結束" : "開啟"}</span></button>`).join("");
  left.querySelectorAll("[data-s]").forEach((b) => (b.onclick = async () => {
    const n = parseInt(b.dataset.s, 10); if (n === D.stage) return;
    if (!confirm(`確定要${stageIdx(n) < cur ? "回到" : "開啟"}「${STAGE[n].title}」嗎？所有參與者的畫面會立刻切換。`)) return;
    await rpc("pjm_admin_set_stage", { s: n }); await load(true);
  }));
  document.getElementById("stageTitle").textContent = `目前：${STAGE[D.stage].title}`;
  const nav = document.getElementById("navLabel"); if (nav) nav.textContent = `${cur}／${STAGES.length - 1}　${STAGE[D.stage].title}`;
  const pv = document.getElementById("navPrev"), nx = document.getElementById("navNext"); if (pv) pv.disabled = cur <= 0; if (nx) nx.disabled = cur >= STAGES.length - 1;
  if (D.stage === 12) { try { const { data } = await sb.rpc("pjm_admin_survey", { p: PASS }); surveyRows = data || []; } catch { surveyRows = surveyRows || []; } }
  const html = (PROJ[D.stage] || (() => ""))(), art = ART[D.stage] ? ART[D.stage]() : "";
  body.innerHTML = art ? '<div class="p-split"><div class="p-main">' + html + '</div><div class="p-art">' + art + "</div></div>" : html;
  body.querySelectorAll("[data-act]").forEach((b) => (b.onclick = () => {
    const n = shareGroups().length; if (b.dataset.act === "share") project(0); else project(n);
  }));
  fitProjection();
}

// 全螢幕時：自動縮放內容，讓整個階段的資訊同時顯示在一頁，不需要上下捲動
function fitProjection() {
  const root = document.getElementById("stageRight"), outer = document.getElementById("projBody"), inner = document.getElementById("projInner");
  if (!root || !outer || !inner) return;
  if (document.fullscreenElement !== root) { inner.style.transform = ""; inner.style.width = ""; return; }
  const availH = outer.clientHeight;
  let lo = 0.15, hi = 1.5;
  for (let i = 0; i < 14; i++) {
    const s = (lo + hi) / 2;
    inner.style.width = 100 / s + "%"; inner.style.transform = "scale(" + s + ")";
    if (inner.offsetHeight * s <= availH) lo = s; else hi = s;
  }
  inner.style.width = 100 / lo + "%"; inner.style.transform = "scale(" + lo + ")";
}
document.addEventListener("fullscreenchange", () => setTimeout(fitProjection, 60));
window.addEventListener("resize", () => fitProjection());
