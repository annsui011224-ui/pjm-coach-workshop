// 共用設定與工具
if (!window.supabase) { document.addEventListener("DOMContentLoaded", () => { document.body.insertAdjacentHTML("afterbegin", "<p style=\"padding:20px;color:#c00\">無法載入必要程式（supabase.min.js），請確認網站檔案完整。</p>"); }); throw new Error("supabase missing"); }
const SUPABASE_URL = "https://mkvkcjuzrlzdhdhlxzhm.supabase.co";
const SUPABASE_KEY = "sb_publishable_G0_W0Kf61Z8EawiDsPIH0A_0JeyKfUv";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 階段 id 是固定的（資料庫與答案都用 id 記錄），陣列順序才是進行順序。
const STAGES = [
  { n: 13, title: "行前準備", sub: "填寫行前調查" },
  { n: 0, title: "預約報到", sub: "請找到組別後入座" },
  { n: 1, title: "開場與目的", sub: "從限制中找到培育的可能性" },
  { n: 2, title: "選一張圖片", sub: "新手成為獨當一面的 PJM，對你的好處" },
  { n: 3, title: "寫給未來的自己", sub: "把剛才的分享寫成一段話" },
  { n: 4, title: "拋磚引玉：教練 KS 的分享", sub: "從一件小事開始" },
  { n: 5, title: "小組討論：資源有限也能嘗試的做法", sub: "共編一份答案，輪流分享" },
  { n: 11, title: "回到你的培育小組", sub: "依教練與主管組成培育小組" },
  { n: 6, title: "培育起點盤點", sub: "教練與主管各自填寫" },
  { n: 7, title: "教練 × PJM 主管對齊培育共識", sub: "回到培育小組一起討論" },
  { n: 8, title: "培育計畫可行性檢查", sub: "做得到嗎？需要什麼支持？" },
  { n: 9, title: "讓好行動更有力量", sub: "全班培育計畫概況與重要嘉賓回饋" },
  { n: 10, title: "帶走你的培育計畫", sub: "下載專屬於你的 PDF" },
  { n: 12, title: "工作坊滿意度問卷", sub: "告訴我們今天的感受" },
];
const STAGE = Object.fromEntries(STAGES.map((s) => [s.n, s]));
const stageIdx = (id) => STAGES.findIndex((s) => s.n === id);
const READY_ITEMS = ["我的筆電可以支撐 2 小時電力", "我把 Teams 和 Outlook 關起來了"];
// 滿意度問卷（匿名）
const SURVEY_Q = [
  { k: "overall", type: "rating", q: "整體而言，我對這次工作坊感到滿意" },
  { k: "useful", type: "rating", q: "工作坊的內容，對你培育 PJM 有幫助" },
  { k: "pace", type: "rating", q: "流程與時間安排很順暢" },
  { k: "confidence", type: "rating", q: "對於接下來開始培育行動，我有信心" },
  { k: "gain", type: "text", q: "今天最有收穫的是什麼？" },
  { k: "improve", type: "text", q: "有什麼建議，可以讓工作坊更好？" },
];


const ROLES = {
  coach: { label: "教練", title: "引路教練", plant: "fern", emoji: "🧭", mission: "分享你的培育經驗與觀察，和主管一起把「下一步」定下來。" },
  pjm_mgr: { label: "PJM 主管", title: "新手守護者", plant: "monstera", emoji: "🛡️", mission: "提供你對這位 PJM 的觀察，與教練對齊期待，並協助安排真實的工作情境。" },
  direct_mgr: { label: "教練主管（直接）", title: "資源推手", plant: "bamboo", emoji: "🚀", mission: "檢視培育行動需要的時間與資源，現場承諾可以提供的支持。" },
  dept_mgr: { label: "教練主管（部級）", title: "資源推手", plant: "olive", emoji: "🚀", mission: "協調優先順序與負荷，讓培育在現有工作條件下真的能發生。" },
  guest: { label: "重要嘉賓", title: "重要嘉賓", plant: "camellia", emoji: "⭐", mission: "聆聽各組的培育共識，現場給予回饋，讓好行動更有力量。" },
};

const ABILITIES = ["會議主持", "流程與工具掌握", "產品基礎理解", "風險與變動管理", "Ownership", "主動積極", "團隊合作與溝通", "問題解決能力"];

const DIETS = ["葷食", "蛋奶素", "全素", "不吃牛", "不吃豬", "其他（請說明）"];

// 影像庫：七個主題，來源 Pexels（免費商用，免標註）。每次選圖畫面會同時各抽一張。
const IMAGE_THEMES = [
 {
  "name": "成長與自然",
  "files": [
   "images/p985628.jpg",
   "images/p36958408.jpg",
   "images/p33414459.jpg",
   "images/p1792626.jpg",
   "images/p9696711.jpg",
   "images/p11948604.jpg",
   "images/p14978029.jpg",
   "images/p18994151.jpg",
   "images/p38652687.jpg"
  ]
 },
 {
  "name": "道路與前進",
  "files": [
   "images/p6114013.jpg",
   "images/p33225977.jpg",
   "images/p9606482.jpg",
   "images/p19984101.jpg",
   "images/p13185335.jpg",
   "images/p20040806.jpg",
   "images/p1609512.jpg",
   "images/p39739424.jpg"
  ]
 },
 {
  "name": "方向與指引",
  "files": [
   "images/p32017425.jpg",
   "images/p13625479.jpg",
   "images/p37368470.jpg",
   "images/p18748163.jpg",
   "images/p4715645.jpg",
   "images/p12815097.jpg",
   "images/p35526447.jpg",
   "images/p9606891.jpg"
  ]
 },
 {
  "name": "合作與傳承",
  "files": [
   "images/p6147381.jpg",
   "images/p12585936.jpg",
   "images/p31679274.jpg",
   "images/p31095505.jpg",
   "images/p7652040.jpg",
   "images/p8547771.jpg"
  ]
 },
 {
  "name": "渡假與放鬆",
  "files": [
   "images/p5549239.jpg",
   "images/p33927801.jpg",
   "images/p338504.jpg",
   "images/p3763830.jpg",
   "images/p11685345.jpg",
   "images/p36417028.jpg",
   "images/p8606805.jpg",
   "images/p22608567.jpg",
   "images/p8301408.jpg"
  ]
 },
 {
  "name": "親子與嬰兒",
  "files": [
   "images/p18288345.jpg",
   "images/p7296734.jpg",
   "images/p39999216.jpg",
   "images/p39977067.jpg",
   "images/p29709894.jpg",
   "images/p5220093.jpg",
   "images/p40235565.jpg"
  ]
 },
 {
  "name": "小動物",
  "files": [
   "images/p17249145.jpg",
   "images/p35769343.jpg",
   "images/p14815699.jpg",
   "images/p11840294.jpg",
   "images/p36684076.jpg",
   "images/p11733155.jpg",
   "images/p20897074.jpg",
   "images/p1275680.jpg"
  ]
 }
];

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const nl2br = (s) => esc(s).replace(/\n/g, "<br>");
const debounce = (fn, ms = 600) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const nkey = (scope, key, stage, field) => `${scope}|${key}|${stage}|${field}`;
const roleLabel = (r) => ROLES[r]?.label || r;
const UNITS = ["DC", "DAC", "IEI", "IPC", "IW", "VBG"];

async function loadAll() {
  const [p, s, r, n, f, i, ro, tr] = await Promise.all([
    sb.from("pjm_people").select("*").order("id"),
    sb.from("pjm_state").select("*").eq("id", 1).single(),
    sb.from("pjm_registration").select("*"),
    sb.from("pjm_notes").select("*"),
    sb.from("pjm_future").select("*"),
    sb.from("pjm_inventory").select("*"),
    sb.from("pjm_roster").select("*").order("id"),
    sb.from("pjm_trainee").select("*").order("roster_id").order("sort").order("id"),
  ]);
  const err = [p, s, r, n, f, i, ro, tr].find((x) => x.error);
  if (err) throw err.error;
  return { people: p.data, stage: s.data.stage, maxIdx: s.data.max_idx ?? 0, regs: r.data, notes: n.data, future: f.data, inv: i.data, rows: ro.data, trainees: tr.data, roster: buildRoster(ro.data, tr.data) };
}

// 名單中的一列 = 一位教練；一位教練可帶多位新手 PJM（pjm_trainee）。
// 這裡展開成「每位新手一筆」：id = 新手 id；還沒有新手名字的教練列以 id = -列號 作為占位。
function buildRoster(rows, trainees) {
  const out = [];
  rows.forEach((r) => {
    const ts = trainees.filter((t) => t.roster_id === r.id);
    if (ts.length) ts.forEach((t) => out.push({ ...r, id: t.id, row_id: r.id, pjm_name: t.name }));
    else out.push({ ...r, id: -r.id, row_id: r.id, pjm_name: "" });
  });
  return out;
}
// 某人相關的名單列（每一列 = 一組「教練 ↔ 新手 PJM」）
const rosterRowsOf = (roster, name) => roster.filter((r) => [r.coach, r.direct_mgr, r.dept_mgr, r.pjm_mgr].includes(name));
const pjmNamesOf = (roster, name) => rosterRowsOf(roster, name).map((r) => (r.pjm_name || "").trim()).filter(Boolean);

// 名單中的一列 = 一位新手 PJM 的培育小組
const rowPjm = (r) => (r.pjm_name || "").trim() || "新手 PJM";
const rowTitle = (r) => `${r.unit}｜${rowPjm(r)}（${r.coach} 教練）`;
const rowPeople = (r) => [...new Set([r.coach, r.pjm_mgr, r.direct_mgr, r.dept_mgr].filter(Boolean))];

// 階段 7 第 4 題：這一列裡的每位成員「身為誰的什麼角色，要做…」
function q4Fields(r) {
  const pjm = rowPjm(r);
  const entries = [["coach", r.coach, pjm, "教練"], ["pjm_mgr", r.pjm_mgr, pjm, "主管"], ["direct_mgr", r.direct_mgr, r.coach, "直接主管"], ["dept_mgr", r.dept_mgr, r.coach, "部級主管"]].filter((e) => e[1]);
  const byName = new Map(), roleKeys = new Map();
  entries.forEach(([rk, name, target, role]) => {
    const m = byName.get(name) || new Map(); byName.set(name, m);
    m.set(target, [...(m.get(target) || []), role]);
    roleKeys.set(name, [...(roleKeys.get(name) || []), rk]);   // 這個人在這一列的角色（用來配對植物插圖）
  });
  const out = [];
  byName.forEach((m, name) => out.push({ key: `q4_${name}`, roles: roleKeys.get(name), label: `${name} 身為 ` + [...m.entries()].map(([t, roles]) => `${t} 的${roles.join("與")}`).join("，以及 ") }));
  return out;
}

// 階段 8 可行性檢查題目（multi = 可複選）
const F_QUESTIONS = [
  { f: "f1", q: "這項培育行動需要教練投入多少額外時間？", opts: ["可融入原有工作，幾乎不增加時間", "每兩週約 30 分鐘", "每週約 30–60 分鐘", "需要更多時間，暫時無法確認"] },
  { f: "f2", q: "在目前的工作安排下，這件事做得到嗎？", opts: ["可以直接開始", "需要調整或取得支持", "目前做不到，需要重新設計"] },
  { f: "f3", q: "如果需要支持，最需要主管協助什麼？", opts: ["協調工作優先順序", "安排共同參與的工作機會", "協助找到其他觀察或回饋資源", "目前不需要額外支持"] },
  { f: "f4", q: "身為教練的你，還需要什麼支持嗎？（可複選）", multi: true, perCoach: true, opts: ["觀察新手的方法", "給具體回饋的技巧", "可用的範本或工具", "其他教練的經驗交流", "其他（請在補充說明寫下）"] },
  { f: "f5", q: "L&D 有舉辦回饋力課程，內容包含意圖闡述力、給予回饋、尋求回饋，你有興趣參與此課程以提升你的回饋力嗎？", perCoach: true, opts: ["有興趣，請通知我課程日期", "想先了解更多內容", "目前不需要"] },
];
// 某題在 notes 裡的存放位置：教練題（perCoach）每位教練只答一次，其餘每位新手各答一次
const fLoc = (q, r) => (q.perCoach ? ["coach", String(r.row_id), 8, q.f] : ["row", String(r.id), 8, q.f]);

// PDF 內頁配圖用：已逐張檢視，畫面中沒有清楚的人臉或動物臉（封面不受此限制）
const INTERIOR_IMAGES = ["images/p985628.jpg","images/p36958408.jpg","images/p33414459.jpg","images/p1792626.jpg","images/p9696711.jpg","images/p11948604.jpg","images/p14978029.jpg","images/p18994151.jpg","images/p38652687.jpg","images/p6114013.jpg","images/p33225977.jpg","images/p9606482.jpg","images/p19984101.jpg","images/p13185335.jpg","images/p20040806.jpg","images/p1609512.jpg","images/p39739424.jpg","images/p32017425.jpg","images/p13625479.jpg","images/p37368470.jpg","images/p18748163.jpg","images/p4715645.jpg","images/p12815097.jpg","images/p35526447.jpg","images/p9606891.jpg","images/p6147381.jpg","images/p12585936.jpg","images/p31679274.jpg","images/p5549239.jpg","images/p33927801.jpg","images/p338504.jpg","images/p3763830.jpg","images/p8606805.jpg","images/p22608567.jpg","images/p8301408.jpg","images/p39977067.jpg","images/p29709894.jpg","images/p5220093.jpg","images/p39999216.jpg"];

// 角色顏色：每種角色的植物有明顯不同的主色調，座位表上也用同一個顏色框住姓名
const ROLE_COLOR = { coach: "#3f9a62", pjm_mgr: "#3b7fc4", direct_mgr: "#e0a020", dept_mgr: "#8a63c9", guest: "#e0678d" };
const ROLE_PRIO = ["guest", "coach", "pjm_mgr", "direct_mgr", "dept_mgr"];
const primaryOf = (roles) => ROLE_PRIO.find((r) => roles.includes(r)) || roles[0];
// 姓名框：外框用主要角色的顏色，其他角色用小圓點標示；on = 已就緒／已入座
function roleChip(text, roles, on, small) {
  const p = primaryOf(roles), c = ROLE_COLOR[p] || "#888";
  const dots = roles.filter((r) => r !== p).map((r) => '<i class="rdot" style="background:' + (ROLE_COLOR[r] || "#888") + '"></i>').join("");
  return '<span class="p-chip rc ' + (on ? "on" : "") + (small ? " sm" : "") + '" style="--rc:' + c + '">' + (on ? "✓ " : "") + esc(text) + dots + "</span>";
}
// 某人在某一列（某個培育小組）裡扮演的角色
function rowRolesOf(r, name) {
  return [["coach", r.coach], ["pjm_mgr", r.pjm_mgr], ["direct_mgr", r.direct_mgr], ["dept_mgr", r.dept_mgr]].filter(([, n]) => n === name).map(([k]) => k);
}

// 原創植物插圖：每個角色一種，主色調各不相同（綠、藍、金黃、紫、粉紅）
function sprigSvg(kind) {
  const f = (n) => n.toFixed(1);
  const glowOf = { fern: ROLE_COLOR.coach, monstera: ROLE_COLOR.pjm_mgr, bamboo: ROLE_COLOR.direct_mgr, olive: ROLE_COLOR.dept_mgr, camellia: ROLE_COLOR.guest };
  const wrap = (label, inner) => '<svg class="sprig" style="--glow:' + (glowOf[kind] || "#8fb99a") + '" viewBox="0 0 200 240" role="img" aria-label="' + label + '">' + inner + "</svg>";
  const stem = (d, w, col) => '<path d="' + d + '" stroke="' + (col || "#4a5d51") + '" stroke-width="' + (w || 2.2) + '" fill="none" stroke-linecap="round"/>';

  if (kind === "monstera") {
    // 龜背芋（藍）：一片大葉守護著
    const leaf = '<path d="M100 214 C40 190 22 120 52 70 C70 40 100 34 100 34 C100 34 130 40 148 70 C178 120 160 190 100 214Z" fill="#3b7fc4"/>';
    const shade = '<path d="M100 214 C160 190 178 120 148 70 C130 40 100 34 100 34 C100 90 100 150 100 214Z" fill="#2f69a8" opacity="0.55"/>';
    const lobes = '<path d="M100 40 C99 90 100 150 100 212" stroke="#1d4a7a" stroke-width="2" fill="none"/>';
    const slits = [[-1, 84], [-1, 118], [-1, 152], [1, 84], [1, 118], [1, 152]].map(([s, y]) =>
      '<path d="M100 ' + (y + 6) + " C" + (100 + s * 20) + " " + (y + 2) + " " + (100 + s * 40) + " " + (y - 8) + " " + (100 + s * 52) + " " + (y - 22) + '" stroke="#1d4a7a" stroke-width="1.6" fill="none"/>').join("");
    const small = '<path d="M60 236 C70 210 86 204 100 214" stroke="#1d4a7a" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M52 232 C34 224 30 206 40 196 C54 202 58 218 52 232Z" fill="#79b0e3"/>';
    return wrap("龜背芋插圖", leaf + shade + lobes + slits + small);
  }

  if (kind === "bamboo") {
    // 金竹（金黃）：向上生長、節節高升
    const stalks = [[70, 236, 62, 60, "#e8b230"], [100, 236, 104, 22, "#d99a14"], [132, 236, 142, 76, "#f2c85a"]];
    let g = "";
    stalks.forEach(([x, y0, x1, y1, col]) => {
      g += '<path d="M' + x + " " + y0 + " L" + x1 + " " + y1 + '" stroke="' + col + '" stroke-width="9" stroke-linecap="round" fill="none"/>';
      for (let t = 0.12; t < 0.98; t += 0.17) {
        const px = x + (x1 - x) * t, py = y0 + (y1 - y0) * t;
        g += '<path d="M' + f(px - 6) + " " + f(py) + " L" + f(px + 6) + " " + f(py) + '" stroke="#8a5a00" stroke-width="2" stroke-linecap="round"/>';
      }
      for (const [dx, dy, rot] of [[-2, 24, -62], [2, 40, 58], [-2, 62, -50]]) {
        g += '<path transform="translate(' + f(x1 + dx) + " " + f(y1 + dy) + ") rotate(" + rot + ')" d="M0,0 C8,-5 26,-6 36,0 C26,6 8,5 0,0Z" fill="' + col + '"/>';
      }
    });
    return wrap("金竹插圖", g);
  }

  if (kind === "olive") {
    // 橄欖枝（紫）：穩定、和諧
    let g = stem("M30 214 C70 190 120 150 176 70", 2.4, "#4a3470");
    for (let k = 0; k < 11; k++) {
      const t = (k + 1) / 12, x = 30 + (176 - 30) * t, y = 214 - (214 - 70) * Math.pow(t, 0.95);
      [[-1, 62], [1, -62]].forEach(([s, rot], j) => {
        g += '<path transform="translate(' + f(x) + " " + f(y) + ") rotate(" + (rot - 30 + (k % 2 ? 8 : -6)) + ") scale(" + f(1.3 - t * 0.35) + ')" d="M0,0 C-5,-8 -4,-26 0,-34 C4,-26 5,-8 0,0Z" fill="' + (j ? "#a98be0" : "#7d55c0") + '"/>';
      });
    }
    g += '<ellipse cx="96" cy="170" rx="7" ry="9" fill="#3a2563"/><ellipse cx="124" cy="140" rx="7" ry="9" fill="#4a3280"/><ellipse cx="80" cy="190" rx="6" ry="8" fill="#3a2563"/>';
    return wrap("橄欖枝插圖", g);
  }

  if (kind === "camellia") {
    // 山茶花（粉紅）：歡迎貴賓
    let g = stem("M100 236 C98 200 102 170 100 140", 2.6, "#3d6b4a");
    g += '<path d="M99 206 C70 206 52 190 50 170 C74 170 94 182 99 206Z" fill="#4f9d69"/><path d="M101 190 C128 188 148 174 150 154 C126 156 106 168 101 190Z" fill="#62b07c"/>';
    const cols = ["#f4a3bf", "#ec7fa5", "#f8c2d4"];
    for (let k = 0; k < 7; k++) g += '<ellipse transform="translate(100 96) rotate(' + k * (360 / 7) + ')" cx="0" cy="-34" rx="19" ry="31" fill="' + cols[k % 3] + '" stroke="#c24a76" stroke-width="1"/>';
    for (let k = 0; k < 5; k++) g += '<ellipse transform="translate(100 96) rotate(' + (k * 72 + 20) + ')" cx="0" cy="-15" rx="10" ry="17" fill="#fbd9e5"/>';
    for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; g += '<circle cx="' + f(100 + Math.cos(a) * 9 * (0.5 + (k % 3) / 3)) + '" cy="' + f(96 + Math.sin(a) * 9 * (0.5 + (k % 3) / 3)) + '" r="2.4" fill="#f2c94c"/>'; }
    return wrap("山茶花插圖", g);
  }

  // 預設：蕨類小枝（綠）— 引路教練與一般頁面
  const cols = ["#4f9d69", "#6db985", "#9bd3a9", "#3a8657"];
  let leaves = "";
  for (let k = 0; k < 15; k++) {
    const t = k / 14, x = 100 + 24 * Math.sin(t * 2.6) - 6 * t, y = 222 - t * 190, s = 1.25 - t * 0.55;
    [[-1, 48], [1, -48]].forEach(([side, rot], j) => {
      const a = rot + (k % 2 ? 8 : -6);
      leaves += '<path transform="translate(' + f(x + side * 3) + " " + f(y) + ") rotate(" + a + ") scale(" + s.toFixed(2) + ')" d="M0,0 C-8,-7 -10,-19 0,-23 C10,-19 8,-7 0,0Z" fill="' + cols[(k + j) % 4] + '" opacity="0.95"/>';
    });
  }
  leaves += '<path transform="translate(' + f(100 + 24 * Math.sin(2.6) - 6) + ' 30) rotate(8) scale(0.8)" d="M0,0 C-8,-7 -10,-19 0,-23 C10,-19 8,-7 0,0Z" fill="#9bd3a9"/>';
  return wrap("蕨類小枝插圖", stem("M100 236 C108 190 118 120 120 30", 2.2, "#2f5d42") + leaves);
}

// 「選圖」與「寫給未來的自己」的句首：有負責培育的新手就帶入名字；沒有（例如重要嘉賓）統一用「所有的 PJM」
const futureLead = (names) => (names.length ? "當 " + names.join("、") + " 能夠獨當一面時" : "當所有的 PJM 都能獨當一面時");
const pickLead = (names) => (names.length ? "說明當 " + names.join("、") + " 成為能獨當一面的 PJM 時" : "說明當所有的 PJM 都成為能獨當一面的 PJM 時");
