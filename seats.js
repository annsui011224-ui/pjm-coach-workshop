// Facilitator 後台：跨產品分組（階段 2–5）與培育小組（階段 6 起）
// 依賴 admin.js 的 D、PASS、tab、rpc、toast、load、draw、nv，以及 group.js

let seatAutoTried = false;
try { const c = parseInt(localStorage.getItem("pjm_team_cap") || "", 10); TEAM_CAP = c > 0 ? c : null; } catch {}
const roleOrder = ["coach", "pjm_mgr", "direct_mgr", "dept_mgr"];
const unitOf = (name) => (D.people.find((p) => p.name === name) || {}).unit || "";

function chipHtml(p) {
  const roles = (regOf(p.id) || {}).roles || p.roles;
  return `<span style="${p.absent ? "text-decoration:line-through;opacity:.6" : ""}">${roleChip(p.name + (p.unit ? " · " + p.unit : " · 嘉賓"), roles, false, true)}</span>`;
}

function seatBoard(field, title) {
  const groups = {};
  D.people.filter((p) => !p.absent && p[field]).forEach((p) => (groups[p[field]] ||= []).push(p));
  const labels = Object.keys(groups).sort((a, b) => (+a || 0) - (+b || 0) || a.localeCompare(b));
  const related = relatedPairs(D.rows);
  const none = D.people.filter((p) => !p.absent && !p[field]);
  const absent = D.people.filter((p) => p.absent);
  return `<div><h3>${title}</h3>
    ${labels.map((g) => {
      const m = groups[g]; let warn = 0, same = 0;
      for (let i = 0; i < m.length; i++) for (let j = i + 1; j < m.length; j++) { if (related.has(pairKey(m[i].name, m[j].name))) warn++; if (m[i].unit && m[i].unit === m[j].unit) same++; }
      return `<div class="card" style="margin:6px 0"><div class="row" style="justify-content:space-between"><b>${teamName(g)}</b><span class="hint">${m.length} 人${warn ? ` ・<span style="color:var(--accent)">⚠ ${warn} 組從屬關係同組</span>` : ""}${same ? ` ・同單位 ${same} 組` : ""}</span></div>${m.map(chipHtml).join("")}</div>`;
    }).join("") || '<p class="hint">尚未分組</p>'}
    ${none.length ? `<div class="card" style="margin:6px 0;border-style:dashed"><b>未分組</b><br>${none.map(chipHtml).join("")}</div>` : ""}
    ${absent.length ? `<div class="card" style="margin:6px 0;border-style:dashed"><b>請假（不分組）</b><br>${absent.map(chipHtml).join("")}</div>` : ""}</div>`;
}

// 已經入座的人：在預約報到階段已經勾選過任一項準備事項
const isSeated = (p) => !p.absent && !!p.seat2 && [0, 1].some((i) => nv("person", String(p.id), 0, "ready" + i) === "1");

// keepSeated = true：已入座的人維持原本的組別，只重新安排尚未入座的人
async function regroup(silent, keepSeated = true) {
  const attend = D.people.filter((p) => !p.absent).map((p) => ({ name: p.name, unit: p.unit, seat2: p.seat2, role: primaryOf((regOf(p.id) || {}).roles || p.roles) }));
  const seated = keepSeated ? D.people.filter(isSeated) : [];
  if (!silent) {
    const msg = seated.length ? "已有 " + seated.length + " 位已入座，他們的組別不會變動，只會重新安排尚未入座的人。要繼續嗎？" : "會覆蓋目前的分組，確定要重新隨機分組嗎？";
    if (D.people.some((p) => p.seat2) && !confirm(msg)) return false;
  }
  const related = relatedPairs(D.rows);
  const res = seated.length ? autoGroupKeepSeated(attend, related, new Map(seated.map((p) => [p.name, p.seat2]))) : autoGroup(attend, related, null);
  await rpc("pjm_admin_set_seats", { which: 2, assignments: res.assignments });
  toast(silent ? "已自動分組" : seated.length ? "已重新分組，" + seated.length + " 位已入座的人維持原位" : "已重新分組"); await load(true);
  return true;
}

async function pSeat() {
  const pane = document.getElementById("pane");
  if (!seatAutoTried && !D.people.some((p) => p.seat2)) { seatAutoTried = true; await regroup(true); }
  const attendN = D.people.filter((p) => !p.absent).length, sizes = groupSizes(attendN);
  const byUnit = {}; D.people.forEach((p) => (byUnit[p.unit || "重要嘉賓"] ||= []).push(p));
  const absentHtml = Object.entries(byUnit).map(([u, m]) => {
    const boxes = m.map((p) => `<label class="opt" style="display:inline-flex;margin:2px;padding:4px 10px"><input type="checkbox" data-absent="${p.id}" ${p.absent ? "checked" : ""}><span>${esc(p.name)}</span></label>`).join("");
    return `<div style="margin:6px 0"><span class="hint">${esc(u)}</span><br>${boxes}</div>`;
  }).join("");
  const tableRows = D.people.map((p) => `<tr><td>${esc(p.name)}${p.absent ? " （請假）" : ""}</td><td>${esc(p.unit || "—")}</td>
      <td><input type="text" style="max-width:110px" data-seat="2" data-id="${p.id}" value="${esc(p.seat2 || "")}"></td></tr>`).join("");
  pane.innerHTML = `
  <div class="card soft"><b>預計出席 ${attendN} 人 → 分成 ${sizes.length} 組（每組 ${sizes.length ? Math.min(...sizes) + "–" + Math.max(...sizes) : 0} 人）</b>
    <p class="row hint" style="margin:6px 0">組數上限：<input type="number" id="teamCap" min="1" max="12" value="${TEAM_CAP || ""}" placeholder="自動" style="width:84px"> 組　<span>留空＝自動（用最少的組數，每組不超過 6 人）</span></p>
    <p class="hint" style="margin:4px 0 0">從「預約報到」到「小組討論」都使用這一份跨產品分組：同一列名單的人（教練與其 PJM 主管、直接主管、部級主管）不會同組，並盡量讓同組的人來自不同單位。「回到你的培育小組」之後改為培育小組（見「培育小組」分頁）。</p></div>
  <div class="card"><h3>誰請假？</h3><p class="hint">勾選請假的人，再按下方「重新隨機分組」，系統會依實際出席人數重新分配。</p>${absentHtml}</div>
  <div class="row" style="margin:10px 0"><button class="btn" id="regroup">🎲 重新隨機分組</button>${D.people.some(isSeated) ? '<button class="btn ghost" id="regroupAll">全部重新分組（包含已入座的人）</button><span class="hint">已入座 ' + D.people.filter(isSeated).length + " 人，按左邊的按鈕不會動到他們" + "</span>" : ""}</div>
  ${seatBoard("seat2", "目前分組")}
  <details class="ref"><summary>手動微調</summary>
    <div class="card"><b>批次貼上</b><p class="hint" style="margin:4px 0">每行一位：<code>英文名, 組別</code>。</p>
      <textarea id="bulk" rows="4" placeholder="KS, 1&#10;Cindy, 2"></textarea><p><button class="btn" id="bulkGo">套用</button></p></div>
    <div class="card" style="overflow:auto"><table class="t"><tr><th>姓名</th><th>單位</th><th>組別</th></tr>${tableRows}</table></div></details>`;

  pane.querySelectorAll("[data-absent]").forEach((c) => (c.onchange = async () => {
    await rpc("pjm_admin_set_absent", { pid: +c.dataset.absent, flag: c.checked }); await load(true); pSeat();
  }));
  document.getElementById("teamCap").onchange = (e) => {
    const c = parseInt(e.target.value, 10); TEAM_CAP = c > 0 ? c : null;
    try { localStorage.setItem("pjm_team_cap", TEAM_CAP ? String(TEAM_CAP) : ""); } catch {}
    toast(TEAM_CAP ? "組數上限 " + TEAM_CAP + " 組，下次重新分組時生效" : "已改回自動"); pSeat();
  };
  document.getElementById("regroup").onclick = async () => { if (await regroup(false, true)) pSeat(); };
  const all = document.getElementById("regroupAll"); if (all) all.onclick = async () => { if (confirm("連已入座的人也會被重新分組，他們需要換位置。確定嗎？") && (await regroup(true, false))) { toast("已全部重新分組"); pSeat(); } };
  pane.querySelectorAll("[data-seat]").forEach((i) => (i.onchange = async () => { await rpc("pjm_admin_set_seat", { pid: +i.dataset.id, which: 2, g: i.value.trim() }); toast("已儲存"); }));
  document.getElementById("bulkGo").onclick = async () => {
    const lines = document.getElementById("bulk").value.split("\n").map((l) => l.split(/[,，\t]/).map((x) => x.trim())).filter((a) => a[0]);
    let n = 0; const miss = [];
    for (const [name, g] of lines) {
      const p = D.people.find((x) => x.name.toLowerCase() === name.toLowerCase());
      if (!p) { miss.push(name); continue; }
      if (g !== undefined) await rpc("pjm_admin_set_seat", { pid: p.id, which: 2, g });
      n++;
    }
    toast(`已更新 ${n} 人${miss.length ? "；找不到：" + miss.join("、") : ""}`); await load(true); pSeat();
  };
}

// ---- 培育小組（階段 6 起）：一位新手 PJM 一組，一眼看出誰跟誰同一組 ----
function pTeams() {
  const pane = document.getElementById("pane");
  const teams = D.roster.filter((r) => r.id > 0);
  const units = [...new Set(teams.map((r) => r.unit))];
  const card = (r) => {
    const id = String(r.id);
    const roles = {};
    [["coach", r.coach], ["pjm_mgr", r.pjm_mgr], ["direct_mgr", r.direct_mgr], ["dept_mgr", r.dept_mgr]].forEach(([k, n]) => { if (n) (roles[n] ||= []).push(roleLabel(k)); });
    const members = Object.keys(roles);
    const inv = D.inv.filter((i) => i.trainee_id === r.id && i.has_obs !== null).length;
    const q = ["q1", "q2", "q3", "q4", "q5"].filter((x) => nv("row", id, 7, x)).length;
    const f = F_QUESTIONS.filter((x) => nv(...fLoc(x, r))).length;
    const sent = nv("row", id, 8, "submitted");
    return `<div class="card" style="margin:0"><div class="row" style="justify-content:space-between"><h3 style="margin:0">${esc(rowPjm(r))}</h3><span class="pill ${sent ? "" : "warn"}">${sent ? "已送出" : "進行中"}</span></div>
      <p class="hint" style="margin:2px 0 6px">${esc(r.unit)}｜${esc(r.coach)} 教練</p>
      ${members.map((n) => { const p = D.people.find((x) => x.name === n); return `<div style="margin:2px 0;${p?.absent ? "opacity:.55" : ""}"><b>${esc(n)}</b> <span class="hint">${esc(roles[n].join("・"))}${p?.absent ? "（請假）" : ""}</span></div>`; }).join("")}
      <div class="hint" style="margin-top:6px">盤點 ${inv}/${members.length}・共識 ${q}/5・檢核 ${f}/${F_QUESTIONS.length}</div></div>`;
  };
  pane.innerHTML = `<p class="hint">階段 6 起，每位新手 PJM 是一個培育小組：教練＋PJM 主管＋直接主管＋部級主管。共 ${teams.length} 組。</p>` +
    units.map((u) => `<h3 style="margin:16px 0 6px">${esc(u)}</h3><div class="grid2" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px">${teams.filter((r) => r.unit === u).map(card).join("")}</div>`).join("");
}
