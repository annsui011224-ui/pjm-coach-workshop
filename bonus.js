// 培育小組完成後的「加分挑戰」：給新手的一句話、預想障礙、預演第一句話、看看其他組、默契小問答
// 依賴 app.js 的 S、me、vs、note、nkey、saveNote、pickRow、myRows、toast 與 common.js 的 rowPeople、rowPjm、esc、nl2br

const BONUS_STARTERS = ["我在你身上看到的亮點是…", "我最期待你接下來…", "當你卡住的時候，可以來找我聊…", "我想謝謝你…", "我相信你一定能…", "如果只能給你一個小建議，我會說…"];
const BONUS_PREMORTEM = ["兩週後，如果這個培育行動沒有做成，最可能的原因是什麼？", "在目前的工作安排下，最容易被擠掉的是哪一步？", "如果只能保留一個最小的步驟，會是哪一個？", "有哪些人或事，可能讓這件事更順利？", "我們現在可以先做哪一件小事，降低失敗的機會？"];
const BONUS_REHEARSE = [["意圖", "「我想先說明，今天找你聊是因為…」"], ["給予回饋", "「我觀察到…，對…有這樣的影響，我的感受是…」"], ["尋求回饋", "「你覺得我這樣說，有沒有哪裡需要調整？」"]];
const BONUS_QUIZ = [["food", "最喜歡的食物"], ["nofood", "最不喜歡的食物"], ["country", "最喜歡的國家（旅行）"], ["dream", "最想去的地方"], ["season", "最喜歡的季節"], ["drink", "最常點的飲料"], ["holiday", "放假最想做的事"], ["nick", "小時候的綽號或暱稱"]];
const BONUS_REACT = [["up", "👍 這個很可行"], ["idea", "💡 我有補充想法"], ["try", "🙋 我們也想試試看"]];
const BONUS_TABS = [["msg", "給新手的一句話"], ["pre", "預想障礙"], ["rehearse", "預演第一句話"], ["others", "看看其他組"], ["quiz", "默契小問答"]];

let bonusTab = "msg", bonusKey = "";

// 在所有階段的筆記中找某個欄位（不限階段，因為同一個欄位可能在階段 7 或 8 填寫）
function noteAny(scope, key, field) {
  let v = "";
  for (const [k, val] of S.notes) { const p = k.split("|"); if (p[0] === scope && p[1] === String(key) && p[3] === field && (val || "").trim()) v = val; }
  return v;
}
function notesWithPrefix(scope, key, prefix) {
  const out = [];
  for (const [k, val] of S.notes) { const p = k.split("|"); if (p[0] === scope && p[1] === String(key) && p[3].startsWith(prefix) && (val || "").trim()) out.push([p[3], val]); }
  return out;
}

function bonusVisible() {
  const st = vs(); if (st !== 7 && st !== 8) return null;
  const r = pickRow(); if (!r) return null;
  const done = st === 7 ? ["q1", "q2", "q3", "q4", "q5"].every((f) => note("row", String(r.id), 7, f)) : !!note("row", String(r.id), 8, "submitted");
  return done ? r : null;
}

function bonusShell(r) {
  const st = vs(), id = String(r.id), nm = esc(rowPjm(r)), me_ = S.meId;
  const F = (scope, key, field, rows, ph) => nf(scope, key, st, field, rows, ph);
  let body = "";
  if (bonusTab === "msg") {
    body = `<p class="hint">選一個開頭，寫一句話給 ${nm}。這句話會放進培育計畫 PDF 的最下方。</p>
      <div class="row" style="margin-bottom:8px">${BONUS_STARTERS.map((s, i) => `<button class="chip" data-starter="${i}">${esc(s)}</button>`).join("")}</div>
      ${F("row", id, "msg_" + me_, 3, "寫一句話給 " + rowPjm(r))}
      <div class="q" style="margin-top:12px">夥伴寫給 ${nm} 的話</div><div data-dyn="bonusMsgs"></div>`;
  } else if (bonusTab === "pre") {
    body = `<p class="hint">一起想想可能會卡在哪裡，把想法寫下來，會放進培育計畫 PDF。</p><ul class="hint" style="margin:0 0 8px">${BONUS_PREMORTEM.map((q) => `<li>${esc(q)}</li>`).join("")}</ul>
      ${F("row", id, "premortem", 5, "我們的預想…")}`;
  } else if (bonusTab === "rehearse") {
    body = `<p class="hint">教練試著說出第一次回饋對話的第一句，小組互相給建議。不需要在系統上記錄，口頭練習就好。</p>
      ${BONUS_REHEARSE.map(([t, s]) => `<div class="card" style="margin:6px 0"><b>${esc(t)}</b><div>${esc(s)}</div></div>`).join("")}`;
  } else if (bonusTab === "others") {
    body = `<p class="hint">看看其他小組打算怎麼做，給他們一個回應（匿名）。</p><div data-dyn="bonusOthers"></div>`;
  } else {
    body = `<p class="hint">考一考這群彼此應該很熟的夥伴！先寫下你自己的答案（只有你自己看得到，直到有人猜），再去猜猜夥伴的。</p>
      <div class="card" style="margin:6px 0"><div class="q">我的答案</div>${BONUS_QUIZ.map(([k, t]) => `<label style="display:block;margin:6px 0"><span class="hint">${esc(t)}</span><input type="text" data-n="${esc(nkey("person", String(me_), st, "qz_" + k))}"></label>`).join("")}</div>
      <div class="card" style="margin:6px 0"><div class="q">猜猜看</div><div data-dyn="bonusQuiz"></div></div>`;
  }
  return `<div class="card soft" style="margin-top:18px"><h3 style="margin:0 0 4px">🌿 加分挑戰</h3><p class="hint" style="margin:0 0 8px">你們這組已經完成了，等其他組的時候，可以挑一個玩玩看。</p>
    <div class="row" style="margin-bottom:10px">${BONUS_TABS.map(([k, t]) => `<button class="chip ${bonusTab === k ? "on" : ""}" data-btab="${k}">${esc(t)}</button>`).join("")}</div>${body}</div>`;
}

// 每次畫面更新時呼叫：只在「完成狀態、小組、分頁」改變時重畫外殼，避免打字時被洗掉
function bonusRefresh() {
  const host = document.getElementById("bonusHost"); if (!host) return;
  const r = bonusVisible();
  const key = r ? vs() + "|" + r.id + "|" + bonusTab : "";
  if (host.dataset.key !== key) { host.dataset.key = key; host.innerHTML = r ? bonusShell(r) : ""; sync(); }
  if (r) bonusDyn(r);
}

function bonusDyn(r) {
  const st = vs(), me_ = S.meId;
  const msgs = document.querySelector('[data-dyn="bonusMsgs"]');
  if (msgs) {
    const list = notesWithPrefix("row", r.id, "msg_").filter(([f]) => +f.slice(4) !== me_).map(([f, v]) => `<div class="card" style="margin:6px 0"><span class="hint">${esc((S.people.find((p) => p.id === +f.slice(4)) || {}).name || "夥伴")}</span><div>${nl2br(v)}</div></div>`);
    msgs.innerHTML = list.join("") || '<p class="hint">還沒有夥伴寫，你可以先寫。</p>';
  }
  const others = document.querySelector('[data-dyn="bonusOthers"]');
  if (others) {
    const mine = new Set(myRows().map((x) => x.id));
    const teams = S.roster.filter((x) => x.id > 0 && !mine.has(x.id) && noteAny("row", x.id, "q4")).slice(0, 6);
    others.innerHTML = teams.map((t) => {
      const counts = Object.fromEntries(BONUS_REACT.map(([c]) => [c, 0])); let my = "";
      notesWithPrefix("row", t.id, "react_").forEach(([f, v]) => { if (counts[v] != null) counts[v]++; if (+f.slice(6) === me_) my = v; });
      return `<div class="card" style="margin:8px 0"><span class="pill">${esc(t.unit)} 小組</span>
        <div style="margin-top:6px"><b>三個月後能獨立做到</b><div>${nl2br(noteAny("row", t.id, "q1")) || "—"}</div></div>
        <div style="margin-top:6px"><b>下一步</b><div>${nl2br(noteAny("row", t.id, "q4"))}</div></div>
        <div class="row" style="margin-top:8px">${BONUS_REACT.map(([c, l]) => `<button class="chip ${my === c ? "on" : ""}" data-react="${t.id}|${c}">${l} ${counts[c] || ""}</button>`).join("")}</div></div>`;
    }).join("") || '<p class="hint">其他小組還在討論中，晚一點再來看看。</p>';
  }
  const quiz = document.querySelector('[data-dyn="bonusQuiz"]');
  if (quiz && document.activeElement?.id !== "qzGuess") {
    const mates = rowPeople(r).map((n) => S.people.find((p) => p.name === n)).filter((p) => p && p.id !== me_);
    const score = [...S.notes].filter(([k, v]) => k.startsWith("person|" + me_ + "|") && k.split("|")[3].startsWith("qc_") && v === "1").length;
    const sel = quiz.dataset.sel ? JSON.parse(quiz.dataset.sel) : { who: mates[0]?.id, q: BONUS_QUIZ[0][0] };
    const ans = sel.who ? noteAny("person", sel.who, "qz_" + sel.q) : "";
    const guess = sel.who ? noteAny("person", me_, "qg_" + sel.who + "_" + sel.q) : "";
    const judged = sel.who ? noteAny("person", me_, "qc_" + sel.who + "_" + sel.q) : "";
    quiz.innerHTML = `<p class="hint" style="margin:0 0 6px">目前猜對 ${score} 題</p>
      <div class="row"><select id="qzWho" style="max-width:200px">${mates.map((p) => `<option value="${p.id}" ${p.id === +sel.who ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select>
      <select id="qzQ" style="max-width:260px">${BONUS_QUIZ.map(([k, t]) => `<option value="${k}" ${k === sel.q ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></div>
      <p style="margin:8px 0 4px">你猜 ${esc((S.people.find((p) => p.id === +sel.who) || {}).name || "夥伴")} 的「${esc((BONUS_QUIZ.find((x) => x[0] === sel.q) || [])[1] || "")}」是…</p>
      <div class="row"><input type="text" id="qzGuess" style="max-width:320px" value="${esc(guess)}" placeholder="寫下你的猜測"><button class="btn" id="qzGo">揭曉</button></div>
      ${guess ? `<div class="card" style="margin:8px 0"><b>${esc((S.people.find((p) => p.id === +sel.who) || {}).name || "")}</b> 的答案：${ans ? esc(ans) : '<span class="hint">對方還沒寫答案</span>'}
        ${ans ? `<div class="row" style="margin-top:6px"><button class="chip ${judged === "1" ? "on" : ""}" data-qzj="1">我猜對了 ✓</button><button class="chip ${judged === "0" ? "on" : ""}" data-qzj="0">沒猜中</button></div>` : ""}</div>` : ""}`;
    quiz.dataset.sel = JSON.stringify(sel);
  }
}

document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-btab]"); if (t) { bonusTab = t.dataset.btab; bonusRefresh(); return; }
  const s = e.target.closest("[data-starter]");
  if (s) { const ta = document.querySelector('#bonusHost textarea'); if (ta && !ta.value.trim()) { ta.value = BONUS_STARTERS[+s.dataset.starter]; ta.dispatchEvent(new Event("input", { bubbles: true })); ta.focus(); } return; }
  const rc = e.target.closest("[data-react]");
  if (rc) { const [tid, c] = rc.dataset.react.split("|"); const k = nkey("row", tid, vs(), "react_" + S.meId); saveNote(k, S.notes.get(k) === c ? "" : c).then(() => bonusRefresh()); bonusDynSafe(); return; }
  if (e.target.closest("#qzGo")) {
    const q = document.querySelector('[data-dyn="bonusQuiz"]'); const sel = JSON.parse(q.dataset.sel || "{}");
    const g = document.getElementById("qzGuess").value.trim(); if (!g) { toast("先寫下你的猜測"); return; }
    saveNote(nkey("person", String(S.meId), vs(), "qg_" + sel.who + "_" + sel.q), g).then(bonusDynSafe); return;
  }
  const j = e.target.closest("[data-qzj]");
  if (j) { const q = document.querySelector('[data-dyn="bonusQuiz"]'); const sel = JSON.parse(q.dataset.sel || "{}"); saveNote(nkey("person", String(S.meId), vs(), "qc_" + sel.who + "_" + sel.q), j.dataset.qzj).then(bonusDynSafe); }
});
document.addEventListener("change", (e) => {
  if (e.target.id === "qzWho" || e.target.id === "qzQ") {
    const q = document.querySelector('[data-dyn="bonusQuiz"]'); const sel = JSON.parse(q.dataset.sel || "{}");
    sel.who = +document.getElementById("qzWho").value; sel.q = document.getElementById("qzQ").value; q.dataset.sel = JSON.stringify(sel); bonusDynSafe();
  }
});
function bonusDynSafe() { const r = bonusVisible(); if (r) bonusDyn(r); }
