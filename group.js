// 自動分組：跨產品單位、避開有從屬關係的人、每組 4–6 人
// related：Set("甲|乙")（名字依字母排序後以 | 相接）表示不要放同一組

const pairKey = (a, b) => (a < b ? a + "|" + b : b + "|" + a);

// 同一列名單（教練＋PJM 主管＋直接主管＋部級主管）彼此視為有從屬關係，之後會一起組成培育小組
function relatedPairs(rows) {
  const s = new Set();
  rows.forEach((r) => {
    const m = [...new Set([r.coach, r.direct_mgr, r.dept_mgr, r.pjm_mgr].filter(Boolean))];
    for (let i = 0; i < m.length; i++) for (let j = i + 1; j < m.length; j++) s.add(pairKey(m[i], m[j]));
  });
  return s;
}

// 依出席人數決定組數：每組 4–6 人，平均盡量接近 5 人
function groupSizes(n, min = 4, max = 6) {
  if (n <= 0) return [];
  if (n < min) return [n];
  let best = null;
  for (let k = Math.ceil(n / max); k <= Math.floor(n / min); k++) {
    const score = Math.abs(n / k - 5);
    if (!best || score < best.score) best = { k, score };
  }
  const k = best ? best.k : Math.ceil(n / max);
  const base = Math.floor(n / k), extra = n % k;
  return Array.from({ length: k }, (_, i) => base + (i < extra ? 1 : 0));
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
