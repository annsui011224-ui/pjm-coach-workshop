// 投影頁用的原創插圖（向量圖）：裂縫中發芽、游標、紙飛機、種子發芽→長葉→小樹、背包與小樹
// 柔和的綠色系，亮暗主題都看得清楚。

const ART_SVG = (label, inner) => '<svg viewBox="0 0 240 240" role="img" aria-label="' + label + '">' +
  '<circle cx="120" cy="124" r="104" fill="#8fb99a" opacity="0.18"/>' + inner + "</svg>";

const SOIL = '<path d="M30 214 C50 190 90 182 120 182 C150 182 190 190 210 214 Z" fill="#8a6a4f"/><path d="M30 214 C50 196 90 190 120 190 C150 190 190 196 210 214 Z" fill="#a07e5e" opacity="0.7"/>';
const leaf = (x, y, rot, s, col) => '<path transform="translate(' + x + " " + y + ") rotate(" + rot + ") scale(" + s + ')" d="M0,0 C-12,-10 -14,-28 0,-36 C14,-28 12,-10 0,0Z" fill="' + (col || "#7fae8d") + '"/>';
const roundLeaf = (x, y, rot, s, col) => '<ellipse transform="translate(' + x + " " + y + ") rotate(" + rot + ") scale(" + s + ')" cx="0" cy="-14" rx="12" ry="15" fill="' + (col || "#9cc4a2") + '"/>';

// 裂縫中發芽：兩塊石頭中間的縫隙長出幼苗，光從縫隙照進來
function artCrack() {
  const rays = [-50, -30, -10, 10, 30, 50].map((a) => '<path transform="translate(120 168) rotate(' + a + ')" d="M0,-6 L0,-86" stroke="#f3d77a" stroke-width="3" stroke-linecap="round" opacity="0.35"/>').join("");
  const stoneL = '<path d="M14 168 H112 L104 186 L116 200 L106 218 L112 232 H14Z" fill="#b6bbb0"/><path d="M14 168 H112 L108 176 H14Z" fill="#cfd3c9"/>';
  const stoneR = '<path d="M226 168 H128 L136 184 L124 198 L134 214 L124 232 H226Z" fill="#a4aa9f"/><path d="M226 168 H128 L132 176 H226Z" fill="#bfc4b8"/>';
  const plant = '<path d="M120 204 C118 160 122 130 120 84" stroke="#4a5d51" stroke-width="3.6" fill="none" stroke-linecap="round"/>' +
    leaf(120, 124, -58, 1.9, "#7fae8d") + leaf(120, 106, 58, 1.9, "#9cc4a2") + leaf(120, 88, -6, 1.1, "#b6d6b0");
  return ART_SVG("裂縫中長出幼苗的插圖", rays + stoneL + stoneR + plant);
}

// 可愛的游標：圓潤的箭頭游標，有表情，旁邊有點擊的小星星
function artCursor() {
  const arrow = '<path d="M64 38 L64 172 L98 142 L124 198 L150 186 L124 132 L172 128 Z" fill="#fffdf6" stroke="#385a4c" stroke-width="6" stroke-linejoin="round"/>';
  const face = '<circle cx="86" cy="96" r="4.5" fill="#385a4c"/><circle cx="108" cy="100" r="4.5" fill="#385a4c"/><path d="M86 112 Q97 124 108 114" stroke="#385a4c" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="76" cy="110" rx="6" ry="4" fill="#f4a9a0" opacity="0.8"/><ellipse cx="118" cy="114" rx="6" ry="4" fill="#f4a9a0" opacity="0.8"/>';
  const spark = (x, y, s) => '<path transform="translate(' + x + " " + y + ") scale(" + s + ')" d="M0,-12 L3,-3 L12,0 L3,3 L0,12 L-3,3 L-12,0 L-3,-3Z" fill="#f3d77a"/>';
  const click = '<path d="M30 52 L44 62 M24 78 L40 80 M44 30 L50 46" stroke="#7fae8d" stroke-width="4" stroke-linecap="round"/>';
  return ART_SVG("可愛的游標插圖", arrow + face + click + spark(184, 70, 1.1) + spark(200, 150, 0.8) + spark(52, 190, 0.7));
}

// 紙飛機：帶著寫給未來的話飛出去
function artPlane() {
  const trail = '<path d="M16 206 C50 214 74 176 104 162" stroke="#7fae8d" stroke-width="3" fill="none" stroke-dasharray="2 9" stroke-linecap="round"/><path d="M40 224 C70 226 90 200 110 188" stroke="#9cc4a2" stroke-width="3" fill="none" stroke-dasharray="2 9" stroke-linecap="round" opacity="0.7"/>';
  const wing1 = '<path d="M34 120 L214 42 L122 142Z" fill="#fbfdfa" stroke="#385a4c" stroke-width="4" stroke-linejoin="round"/>';
  const wing2 = '<path d="M122 142 L214 42 L152 204Z" fill="#dbe8de" stroke="#385a4c" stroke-width="4" stroke-linejoin="round"/>';
  const fold = '<path d="M122 142 L136 178" stroke="#385a4c" stroke-width="3.5" stroke-linecap="round"/>';
  const cloud = '<path d="M168 188 q-2 -14 12 -14 q4 -12 18 -8 q14 -2 14 12 q10 2 8 10 h-52 z" fill="#ffffff" opacity="0.75"/>';
  return ART_SVG("紙飛機插圖", cloud + trail + wing2 + wing1 + fold);
}

// 種子發芽：土裡露出一顆種子，冒出兩片小小的子葉
function artSeedling() {
  const seed = '<ellipse cx="120" cy="184" rx="13" ry="9" fill="#c9a36b" transform="rotate(-18 120 184)"/>';
  const stem = '<path d="M120 188 C121 160 119 138 120 112" stroke="#4a5d51" stroke-width="4" fill="none" stroke-linecap="round"/>';
  return ART_SVG("種子發芽的插圖", SOIL + seed + stem + roundLeaf(120, 118, -62, 1.9, "#9cc4a2") + roundLeaf(120, 118, 62, 1.9, "#7fae8d"));
}

// 長出葉子：莖變長、葉子變多
function artLeaves() {
  const stem = '<path d="M120 190 C124 160 116 130 120 82" stroke="#4a5d51" stroke-width="3.6" fill="none" stroke-linecap="round"/>';
  const ls = [[120, 168, -60, 1.1, "#7fae8d"], [121, 150, 58, 1.1, "#9cc4a2"], [119, 128, -56, 1.0, "#9cc4a2"], [120, 110, 54, 1.0, "#7fae8d"], [119, 92, -40, 0.9, "#b6d6b0"], [120, 82, 36, 0.9, "#9cc4a2"], [120, 78, 0, 0.8, "#b6d6b0"]];
  return ART_SVG("長出葉子的幼苗插圖", SOIL + stem + ls.map((l) => leaf(...l)).join(""));
}

// 小樹：有樹幹和圓圓的樹冠
function artTree() {
  const trunk = '<path d="M114 190 C116 160 112 140 118 118 L128 118 C130 142 126 162 128 190Z" fill="#8a6a4f"/><path d="M122 150 L146 128 M121 138 L100 120" stroke="#8a6a4f" stroke-width="5" stroke-linecap="round"/>';
  const crown = '<circle cx="120" cy="92" r="38" fill="#7fae8d"/><circle cx="92" cy="108" r="26" fill="#6d9c7e"/><circle cx="150" cy="106" r="28" fill="#9cc4a2"/><circle cx="116" cy="70" r="24" fill="#9cc4a2"/><circle cx="136" cy="86" r="14" fill="#b6d6b0" opacity="0.8"/>';
  return ART_SVG("一棵小樹的插圖", SOIL + trunk + crown);
}

// 背包裡有一棵小樹：把培育計畫背回去
function artBackpack() {
  const tree = '<path d="M116 118 C118 96 114 86 118 72 L124 72 C126 88 122 98 124 118Z" fill="#8a6a4f"/>' +
    '<circle cx="120" cy="52" r="26" fill="#7fae8d"/><circle cx="102" cy="64" r="17" fill="#6d9c7e"/><circle cx="140" cy="62" r="18" fill="#9cc4a2"/><circle cx="118" cy="38" r="15" fill="#9cc4a2"/>';
  const back = '<path d="M62 116 C62 100 80 94 120 94 C160 94 178 100 178 116 L182 206 C182 218 172 224 160 224 H80 C68 224 58 218 58 206Z" fill="#c98a5f"/>';
  const flap = '<path d="M64 120 C70 100 90 98 120 98 C150 98 170 100 176 120 C150 140 90 140 64 120Z" fill="#b5764b"/><rect x="108" y="128" width="24" height="14" rx="4" fill="#f0d9a6" stroke="#8a5a36" stroke-width="2.5"/>';
  const pocket = '<path d="M84 168 H156 V206 C156 212 152 216 146 216 H94 C88 216 84 212 84 206Z" fill="#d89f74" stroke="#a8683f" stroke-width="3"/><path d="M96 178 H144" stroke="#a8683f" stroke-width="3" stroke-linecap="round"/>';
  const straps = '<path d="M58 140 C44 150 44 190 62 204 M182 140 C196 150 196 190 178 204" stroke="#a8683f" stroke-width="8" fill="none" stroke-linecap="round"/>';
  return ART_SVG("背包裡有一棵小樹的插圖", straps + tree + back + flap + pocket);
}

// 五種角色植物並排（附角色稱號）
function plantsBand() {
  const items = [["fern", "引路教練", "coach"], ["monstera", "新手守護者", "pjm_mgr"], ["bamboo", "資源推手（直接）", "direct_mgr"], ["olive", "資源推手（部級）", "dept_mgr"], ["camellia", "重要嘉賓", "guest"]];
  return '<div class="p-plants">' + items.map(([k, t, r]) => '<figure>' + sprigSvg(k) + '<figcaption style="color:' + ROLE_COLOR[r] + '">' + t + "</figcaption></figure>").join("") + "</div>";
}

const ART = { 1: artCrack, 2: artCursor, 3: artPlane, 4: artSeedling, 5: artCrack, 6: artSeedling, 7: artLeaves, 8: artTree, 10: artBackpack };
