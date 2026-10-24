// Facilitator 後台：工作坊剪影（助教上傳照片，標註拍到哪些小組，或是大合照）
// 依賴 admin.js 的 D、PASS、rpc、toast、tab，以及 common.js 的 sb、SUPABASE_URL、SUPABASE_KEY、teamName

const photoUrl = (path) => SUPABASE_URL + "/storage/v1/object/public/pjm-photos/" + path;

// 縮小到長邊 1600px 的 JPEG，手機拍的大圖上傳與 PDF 都比較快
async function shrinkImage(file, max = 1600) {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas"); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return await new Promise((res) => c.toBlob(res, "image/jpeg", 0.85));
}

async function photoApi(body) {
  const r = await fetch(SUPABASE_URL + "/functions/v1/pjm-photo", {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY },
    body: JSON.stringify({ pass: PASS, ...body }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "HTTP " + r.status);
  return j;
}

// 標籤：all = 大合照；unit:IEI = 該產品單位的培育小組；其他 = 跨產品小組（Team N）
const photoTagLabel = (t) => (t === "all" ? "大合照" : t.startsWith("unit:") ? t.slice(5) + " 培育小組" : teamName(t));
const photoUnits = () => UNITS.map((u) => "unit:" + u);
const seatGroupNames = () => [...new Set(D.people.map((p) => p.seat2).filter(Boolean))].sort((a, b) => (+a || 0) - (+b || 0) || a.localeCompare(b));

async function pPhotos() {
  const pane = document.getElementById("pane");
  const groups = seatGroupNames();
  pane.innerHTML = `<p class="hint">助教上傳工作坊的照片。每次上傳的照片會套用你勾選的標籤：拍到哪幾組就勾哪幾組，全班合照請勾「大合照」。每位參與者的 PDF 最後會有「工作坊剪影」，收錄大合照與有拍到他那一組的照片。</p>
    <div class="card"><h3>上傳照片</h3>
      <input type="file" id="phFiles" accept="image/*" multiple>
      <div class="q" style="margin-top:12px">這批照片拍到的是：</div>
      <div class="row" id="phTags"><label class="opt" style="padding:6px 14px"><input type="checkbox" value="all"><span>大合照</span></label>
        ${groups.map((g) => '<label class="opt" style="padding:6px 14px"><input type="checkbox" value="' + esc(g) + '"><span>' + teamName(g) + "</span></label>").join("")}</div>
      <div class="q" style="margin-top:12px">培育小組討論時拍的（以產品單位為主）：</div>
      <div class="row" id="phTags2">${photoUnits().map((u) => '<label class="opt" style="padding:6px 14px"><input type="checkbox" value="' + esc(u) + '"><span>' + photoTagLabel(u) + "</span></label>").join("")}</div>
      ${groups.length ? "" : '<p class="hint">還沒有分組，所以沒有小組可勾選；請先到「跨產品分組」分好組。</p>'}
      <p class="row"><button class="btn" id="phGo">上傳</button><span class="saved" id="phMsg"></span></p></div>
    <h2>已上傳的照片</h2><div id="phList"><p class="hint">載入中…</p></div>`;
  document.getElementById("phGo").onclick = uploadPhotos;
  await listPhotos();
}

async function uploadPhotos() {
  const files = [...document.getElementById("phFiles").files];
  const tags = [...document.querySelectorAll("#phTags input:checked, #phTags2 input:checked")].map((x) => x.value);
  const msg = document.getElementById("phMsg");
  if (!files.length) { toast("請先選擇照片"); return; }
  if (!tags.length) { toast("請勾選這批照片拍到的是大合照、哪幾個小組，或是哪個產品單位的培育小組"); return; }
  const btn = document.getElementById("phGo"); btn.disabled = true;
  let ok = 0;
  for (const f of files) {
    msg.textContent = "上傳中 " + (ok + 1) + "／" + files.length + "…";
    try {
      const blob = await shrinkImage(f);
      const { path, token } = await photoApi({ action: "sign" });
      const up = await sb.storage.from("pjm-photos").uploadToSignedUrl(path, token, blob, { contentType: "image/jpeg" });
      if (up.error) throw up.error;
      await rpc("pjm_admin_add_photo", { ph: path, tg: tags });
      ok++;
    } catch (e) { toast("有一張上傳失敗：" + (e.message || e)); }
  }
  btn.disabled = false; msg.textContent = "完成：" + ok + "／" + files.length + " 張";
  document.getElementById("phFiles").value = "";
  await listPhotos();
}

async function listPhotos() {
  const box = document.getElementById("phList"); if (!box) return;
  const { data, error } = await sb.from("pjm_photos").select("*").order("id", { ascending: false });
  if (error) { box.innerHTML = '<p class="hint">讀取失敗：' + esc(error.message) + "</p>"; return; }
  const groups = seatGroupNames();
  box.innerHTML = data.length ? '<div class="grid2" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px">' + data.map((p) =>
    '<div class="card" style="margin:0;padding:8px"><img src="' + esc(photoUrl(p.path)) + '" alt="" style="width:100%;height:150px;object-fit:cover;border-radius:12px" loading="lazy">' +
    '<div style="margin:6px 0 4px">' + p.tags.map((t) => '<span class="pill" style="margin:2px">' + photoTagLabel(t) + "</span>").join("") + "</div>" +
    '<details class="ref"><summary style="font-size:13px">修改標籤</summary><div class="row" data-ptags="' + p.id + '" style="gap:4px">' +
    ['all', ...groups, ...photoUnits()].map((g) => '<label class="opt" style="padding:2px 10px;font-size:13px"><input type="checkbox" value="' + esc(g) + '" ' + (p.tags.includes(g) ? "checked" : "") + "><span>" + photoTagLabel(g) + "</span></label>").join("") + "</div></details>" +
    '<button class="btn ghost" style="padding:6px 14px;font-size:13px;margin-top:6px" data-pdel="' + p.id + '" data-ppath="' + esc(p.path) + '">刪除</button></div>').join("") + "</div>" : '<p class="hint">還沒有上傳照片。</p>';
  box.querySelectorAll("[data-ptags]").forEach((el) => el.addEventListener("change", async () => {
    const tg = [...el.querySelectorAll("input:checked")].map((x) => x.value);
    if (!tg.length) { toast("至少要有一個標籤"); return; }
    await rpc("pjm_admin_set_photo_tags", { pid: +el.dataset.ptags, tg }); await listPhotos();
  }));
  box.querySelectorAll("[data-pdel]").forEach((b) => (b.onclick = async () => {
    if (!confirm("確定要刪除這張照片嗎？")) return;
    await rpc("pjm_admin_delete_photo", { pid: +b.dataset.pdel });
    try { await photoApi({ action: "remove", path: b.dataset.ppath }); } catch {}
    await listPhotos();
  }));
}
