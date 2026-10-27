// 自動分組：跨產品單位、避開有從屬關係的人、每組 4–6 人
// related：Set("甲|乙")（名字依字母排序後以 | 相接）表示不要放同一組

const pairKey = (a, b) => (a < b ? a + "|" + b : b + "|" + a);

// 同一列名單（教練＋PJM 主管＋直接主管＋部級主管）彼此視為有從屬關係，之後會一起組成培育小組
function relatedPairs(rows) {
  const s = new Set();
  rows.forEach((r) => {
    const m = [...new Set([r.coach, r.direct_mgr, r.dept_mgr, r.dept_mgr2, r.pjm_mgr].filter(Boolean))];
    for (let i = 0; i < m.length; i++) for (let j = i + 1; j < m.length; j++) s.add(pairKey(m[i], m[j]));
  });
  return s;
}

// 依出席人數決定組數。每組 4–6 人才算可行；建議組數是平均人數最接近 5.5 人的那一個（一樣接近時選比較少的組數）。
// TEAM_COUNT 是後台選定的組數（必須是可行的才會採用），沒選就用建議組數。
let TEAM_COUNT = null;
function splitSizes(n, k) { const base = Math.floor(n / k), extra = n % k; return Array.from({ length: k }, (_, i) => base + (i < extra ? 1 : 0)); }
function feasibleCounts(n, min = 4, max = 6) {
  const out = [];
  for (let k = Math.ceil(n / max); k <= Math.floor(n / min); k++) out.push({ k, sizes: splitSizes(n, k) });
  return out;
}
function recommendedCount(n, min = 4, max = 6) {
  const f = feasibleCounts(n, min, max);
  if (!f.length) return n > 0 ? 1 : 0;
  return f.reduce((best, o) => (Math.abs(n / o.k - 5.5) < Math.abs(n / best.k - 5.5) - 1e-9 ? o : best), f[0]).k;
}
function groupSizes(n, min = 4, max = 6) {
  if (n <= 0) return [];
  if (n < min) return [n];
  const f = feasibleCounts(n, min, max);
  const k = typeof TEAM_COUNT === "number" && f.some((o) => o.k === TEAM_COUNT) ? TEAM_COUNT : recommendedCount(n, min, max);
  return splitSizes(n, k);
}

// 成本越低越好：
//  1000  有從屬關係的兩人同組
//   500  該組沒有任何教練
//   200  兩位重要嘉賓同組（嘉賓要平均分散）
//    10  同產品單位的兩人同組
//     6  相同角色的兩人同組（讓每組盡量有不同角色）
//     4  上一輪已經同組過（想換新夥伴時）
function groupCost(groups, related, prev) {
  let c = 0;
  groups.forEach((g) => {
    if (!g.some((p) => p.role === "coach")) c += 500;
    for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) {
      const a = g[i], b = g[j];
      if (related.has(pairKey(a.name, b.name))) c += 1000;
      if (a.role === "guest" && b.role === "guest") c += 200;
      else if (a.role && a.role === b.role) c += 6;
      if (a.unit && a.unit === b.unit) c += 10;
      if (prev && prev.has(pairKey(a.name, b.name))) c += 4;
    }
  });
  return c;
}

// attendees: [{name, unit, role}]（role 為主要角色：guest／coach／pjm_mgr／direct_mgr／dept_mgr）；prev: 先前同組的配對（可選，用來盡量換新夥伴）
// 回傳 { assignments: {name: "1"}, groups: [[...]], cost }
function autoGroup(attendees, related, prev, ms = 700) {
  const sizes = groupSizes(attendees.length);
  if (!sizes.length) return { assignments: {}, groups: [], cost: 0 };
  const start = performance.now();
  let best = null;
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  while (performance.now() - start < ms) {
    const pool = shuffle(attendees.slice());
    let idx = 0; const groups = sizes.map((s) => { const g = pool.slice(idx, idx + s); idx += s; return g; });
    let cost = groupCost(groups, related, prev);
    for (let it = 0; it < 1500 && cost > 0; it++) {
      const gi = Math.floor(Math.random() * groups.length), gj = Math.floor(Math.random() * groups.length);
      if (gi === gj) continue;
      const ai = Math.floor(Math.random() * groups[gi].length), bj = Math.floor(Math.random() * groups[gj].length);
      [groups[gi][ai], groups[gj][bj]] = [groups[gj][bj], groups[gi][ai]];
      const nc = groupCost(groups, related, prev);
      if (nc <= cost) cost = nc; else [groups[gi][ai], groups[gj][bj]] = [groups[gj][bj], groups[gi][ai]];
    }
    if (!best || cost < best.cost) best = { groups: groups.map((g) => g.slice()), cost };
    if (best.cost === 0) break;
  }
  const assignments = {};
  best.groups.forEach((g, i) => g.forEach((p) => { assignments[p.name] = String(i + 1); }));
  return { assignments, groups: best.groups, cost: best.cost };
}

// 已入座的人維持原本的組別，只重新安排「尚未入座」的人。
// fixed：Map(姓名 → 組別名稱)，代表已入座、不能動的人。
// 回傳 { assignments（所有人的組別，含已入座者）, groups, labels }
function autoGroupKeepSeated(attendees, related, fixed, ms = 700) {
  const n = attendees.length;
  const k = groupSizes(n).length;
  // 已有人入座的組別一定保留；組數不夠時，補用目前還有的組別名稱，再不夠才新增編號
  const labels = [...new Set(attendees.filter((p) => fixed.has(p.name)).map((p) => fixed.get(p.name)))];
  const spare = [...new Set(attendees.map((p) => p.seat2).filter((l) => l && !labels.includes(l)))].sort((a, b) => (+a || 0) - (+b || 0));
  for (const l of spare) { if (labels.length >= k) break; labels.push(l); }
  let nextNum = Math.max(0, ...labels.map((l) => +l || 0)) + 1;
  while (labels.length < k) labels.push(String(nextNum++));
  labels.sort((a, b) => (+a || 0) - (+b || 0) || a.localeCompare(b));
  const L = labels.length, free = attendees.filter((p) => !fixed.has(p.name));
  const base = labels.map((l) => attendees.filter((p) => fixed.get(p.name) === l));

  const sizePenalty = (groups) => groups.reduce((c, g) => c + (g.length < 4 ? (4 - g.length) * 300 : g.length > 6 ? (g.length - 6) * 300 : 0) + Math.pow(g.length - n / L, 2) * 3, 0);
  const cost = (groups) => groupCost(groups, related, null) + sizePenalty(groups);
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  const start = performance.now();
  let best = null;
  while (performance.now() - start < ms) {
    const groups = base.map((g) => g.slice());
    shuffle(free.slice()).forEach((p, i) => groups[i % L].push(p));
    let c = cost(groups);
    const isFree = (p) => !fixed.has(p.name);
    for (let it = 0; it < 2500 && c > 0; it++) {
      const gi = Math.floor(Math.random() * L), gj = Math.floor(Math.random() * L);
      if (gi === gj) continue;
      const cand = groups[gi].filter(isFree); if (!cand.length) continue;
      const a = cand[Math.floor(Math.random() * cand.length)];
      const ai = groups[gi].indexOf(a);
      if (Math.random() < 0.4) {                     // 把一位未入座的人移到另一組
        groups[gi].splice(ai, 1); groups[gj].push(a);
        const nc = cost(groups);
        if (nc <= c) c = nc; else { groups[gj].pop(); groups[gi].splice(ai, 0, a); }
      } else {                                       // 兩位未入座的人互換
        const cand2 = groups[gj].filter(isFree); if (!cand2.length) continue;
        const b = cand2[Math.floor(Math.random() * cand2.length)], bj = groups[gj].indexOf(b);
        groups[gi][ai] = b; groups[gj][bj] = a;
        const nc = cost(groups);
        if (nc <= c) c = nc; else { groups[gi][ai] = a; groups[gj][bj] = b; }
      }
    }
    if (!best || c < best.cost) best = { groups: groups.map((g) => g.slice()), cost: c };
  }
  const assignments = {};
  best.groups.forEach((g, i) => g.forEach((p) => { assignments[p.name] = labels[i]; }));
  return { assignments, groups: best.groups, labels, cost: best.cost };
}
