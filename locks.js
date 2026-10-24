// 小組共編：有人正在輸入某個欄位時，同組其他人暫時無法編輯同一欄位，避免互相覆蓋。
// 使用 Supabase Realtime 的 presence（不寫入資料庫）。個人筆記與全場共用的嘉賓筆記不鎖定。
// 依賴 app.js 的 S、me、toast、saveNote。

const LOCK_SCOPES = new Set(["seat", "row", "coach"]);   // 小組共編欄位
const LOCK_STALE_MS = 15000;                             // 超過這個時間沒有更新，視為已離開
const LOCK_IDLE_MS = 12000;                              // 停止輸入多久後自動釋放
let lockCh = null, lockHeld = null, lockTs = 0, lockIdleTimer = null, lockBeat = null, lockState = new Map();

const lockable = (el) => !!el?.dataset?.n && LOCK_SCOPES.has(el.dataset.n.split("|")[0]);

function ensureLocks() {
  if (lockCh || !S.meId) return;
  lockCh = sb.channel("pjm-locks", { config: { presence: { key: String(S.meId) } } });
  lockCh.on("presence", { event: "sync" }, refreshLocks).subscribe((status) => {
    // 先登記自己（field: null），才會收到別人的鎖定狀態
    if (status === "SUBSCRIBED") lockCh.track({ field: null, name: me()?.name || "", ts: Date.now(), beat: Date.now() });
  });
  setInterval(refreshLocks, 4000);   // 讓逾時沒更新的鎖自動失效
}

function refreshLocks() {
  if (!lockCh) return;
  lockState = new Map();
  const st = lockCh.presenceState();
  for (const [pid, metas] of Object.entries(st)) {
    const m = metas[metas.length - 1];
    if (m && m.field && Date.now() - (m.beat || m.ts) < LOCK_STALE_MS) lockState.set(pid, m);
  }
  resolveConflict();
  applyLocks();
}

// 兩人同時搶同一欄位：先開始的人保留，後來的人讓出
function resolveConflict() {
  if (!lockHeld) return;
  for (const [pid, m] of lockState) {
    if (pid === String(S.meId) || m.field !== lockHeld) continue;
    if (m.ts < lockTs || (m.ts === lockTs && +pid < S.meId)) {
      document.activeElement?.blur?.();
      releaseLock();
      toast(m.name + " 先開始輸入這個欄位，請稍候");
      return;
    }
  }
}

function acquireLock(field) {
  if (!lockCh) return;
  if (lockHeld !== field) { lockHeld = field; lockTs = Date.now(); lockCh.track({ field, name: me()?.name || "", ts: lockTs, beat: lockTs }); }
  clearTimeout(lockIdleTimer); lockIdleTimer = setTimeout(releaseLock, LOCK_IDLE_MS);
  clearInterval(lockBeat);
  lockBeat = setInterval(() => { if (lockHeld) lockCh.track({ field: lockHeld, name: me()?.name || "", ts: lockTs, beat: Date.now() }); }, 5000);
}
function releaseLock() {
  clearTimeout(lockIdleTimer); clearInterval(lockBeat);
  if (lockHeld && lockCh) lockCh.track({ field: null, name: me()?.name || "", ts: Date.now(), beat: Date.now() });
  lockHeld = null;
}

// 把別人佔用的欄位設為唯讀，並在欄位下方顯示是誰在輸入
function applyLocks() {
  document.querySelectorAll("[data-n]").forEach((el) => {
    if (!lockable(el)) return;
    let holder = null;
    for (const [pid, m] of lockState) if (pid !== String(S.meId) && m.field === el.dataset.n) { holder = m; break; }
    el.readOnly = !!holder;
    el.classList.toggle("locked", !!holder);
    let msg = el.nextElementSibling; if (!msg || !msg.classList?.contains("lockMsg")) { msg = null; }
    if (holder) {
      if (!msg) { msg = document.createElement("div"); msg.className = "lockMsg"; el.insertAdjacentElement("afterend", msg); }
      msg.textContent = "✎ " + holder.name + " 正在輸入…完成後這裡會自動更新";
    } else if (msg) msg.remove();
  });
}

document.addEventListener("focusin", (e) => {
  const el = e.target;
  if (!lockable(el) || el.readOnly) return;
  ensureLocks(); acquireLock(el.dataset.n);
});
document.addEventListener("input", (e) => { if (lockable(e.target) && !e.target.readOnly) { ensureLocks(); acquireLock(e.target.dataset.n); } });
document.addEventListener("focusout", (e) => {
  const el = e.target;
  if (!lockable(el) || el.readOnly) return;
  // 先把內容存好，再釋放，別人才看得到最新內容
  Promise.resolve(lastSaved.get(el.dataset.n) !== el.value ? saveNote(el.dataset.n, el.value) : null).finally(() => { if (lockHeld === el.dataset.n) releaseLock(); });
});
window.addEventListener("beforeunload", () => { try { releaseLock(); } catch {} });
