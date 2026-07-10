/* 產品代號 (Product-code assignment) — flow:
   Admin creates a new product → picks its 對應標準 (bike category, from the
   admin-managed 車款 list) → the covered-tests list pre-filters to items whose
   車款 matches (unset items count as universal) and pre-checks them for
   review → assigns vendors. The product code auto-numbers as
   <category>-<serial> (e.g. MTB-01). Vendors then only see the items covered
   by their codes (no assignment = sees everything). */
const { useState: tcState, useEffect: tcEffect, useMemo: tcMemo } = React;

/* ---------- shared photo lightbox (works from both the admin popover and the
   vendor project card; built as a plain DOM overlay so it can sit ABOVE an
   open modal without React-state coordination between components) ---------- */
function openPhotoZoom(src) {
  if (!src) return;
  const veil = document.createElement("div");
  veil.className = "tc-zoom-veil";
  const img = document.createElement("img");
  img.className = "tc-zoom-img";
  img.src = src;
  const close = document.createElement("button");
  close.className = "tc-zoom-close";
  close.setAttribute("aria-label", "close");
  close.innerHTML = "&times;";
  veil.appendChild(img);
  veil.appendChild(close);
  function done() {
    window.removeEventListener("keydown", onKey);
    if (veil.parentNode) veil.parentNode.removeChild(veil);
  }
  function onKey(e) { if (e.key === "Escape") done(); }
  veil.addEventListener("click", done);
  window.addEventListener("keydown", onKey);
  document.body.appendChild(veil);
}

/* ---------- Admin page ---------- */
function TestcodesPage({ lang, t, onOpenTest }) {
  const L = (o) => o && o[lang] != null ? o[lang] : o;
  const zh = lang === "zh";
  const [, bump] = tcState(0);
  const [edit, setEdit] = tcState(null); // testcode id | "__new__" | null
  const [detail, setDetail] = tcState(null); // testcode id | null — spec popover
  const [newCat, setNewCat] = tcState("");
  tcEffect(() => {
    window.scrollTo(0, 0);
    const h = () => bump((n) => n + 1);
    window.addEventListener("bff:datachange", h);
    return () => window.removeEventListener("bff:datachange", h);
  }, []);

  const codes = window.STORE.testcodes_list();
  const vendors = window.STORE.vendors_list();
  const cats = window.STORE.bikecats_list();

  function toggleVendor(codeRec, vid) {
    const has = codeRec.vendorIds.indexOf(vid) >= 0;
    const vendorIds = has ? codeRec.vendorIds.filter((x) => x !== vid) : codeRec.vendorIds.concat(vid);
    window.STORE.testcodes_save(codeRec.id, { ...codeRec, vendorIds });
  }
  function del(codeRec) {
    if (!window.confirm(zh ? `確定刪除產品代號「${codeRec.code}」？被指派的供應商將恢復可見全部測試。` : `Delete product code "${codeRec.code}"? Assigned vendors regain full visibility.`)) return;
    window.STORE.testcodes_delete(codeRec.id);
  }
  function addCat() {
    if (!newCat.trim()) return;
    window.STORE.bikecats_add(newCat);
    setNewCat("");
  }
  function removeCat(c) {
    const used = codes.some((x) => x.standard === c);
    if (used) {window.alert(zh ? `「${c}」仍被產品代號使用中，無法刪除。` : `"${c}" is still used by a product code.`);return;}
    if (!window.confirm(zh ? `刪除車款分類「${c}」？` : `Remove bike category "${c}"?`)) return;
    window.STORE.bikecats_remove(c);
  }

  return (
    <div className="home admin">
      <section className="hero hero-sm">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-inner">
          <div className="hero-kicker"><span className="kick-dot" />{zh ? "管理員 · 測試分派" : "Admin · test assignment"}</div>
          <h1 className="hero-title">{zh ? "產品代號" : "Product codes"}</h1>
          <p className="hero-hint">{zh ? "新增產品 → 選擇對應標準（車款）→ 系統自動篩出符合車款的測試項目供勾選 → 指派供應商。代號依車款自動編號（如 MTB-01）。" : "Add a product → pick its standard (bike type) → matching tests are pre-filtered for review → assign vendors. Codes auto-number per type (e.g. MTB-01)."}</p>
          <div className="se-actions">
            <button className="btn" onClick={() => setEdit("__new__")}><Icon name="plus" size={16} />{zh ? "新增產品" : "New product"}</button>
          </div>
          <div className="tc-cats">
            <span className="tc-banner-k"><Icon name="settings" size={13} />{zh ? "車款分類" : "Bike types"}</span>
            {cats.map((c) =>
            <span className="tc-chip tc-cat" key={c}>
                <span className="mono">{c}</span>
                <button className="tc-cat-x" onClick={() => removeCat(c)} aria-label="remove"><Icon name="x" size={11} /></button>
              </span>
            )}
            <span className="tc-cat-add">
              <input className="inp" value={newCat} placeholder={zh ? "新增車款…" : "Add type…"}
              onChange={(e) => setNewCat(e.target.value)}
              onKeyDown={(e) => {if (e.key === "Enter") addCat();}} />
              <button className="mini-btn" onClick={addCat}><Icon name="plus" size={12} />{zh ? "新增" : "Add"}</button>
            </span>
          </div>
        </div>
      </section>

      <section className="list-section">
        {codes.length === 0 ?
        <div className="passcrit empty"><Icon name="grid" size={20} />{zh ? "尚未建立任何產品代號。新增後即可指派供應商。" : "No product codes yet. Create one to start assigning."}</div> :

        <div className="matrix-wrap">
            <table className="matrix">
              <thead>
                <tr>
                  <th className="mx-corner">{zh ? "產品代號" : "Product code"}</th>
                  <th className="mx-req">{zh ? "涵蓋測試" : "Tests"}</th>
                  {vendors.map((v) => <th key={v.id} className="mx-vh"><span className="mx-vh-ava">{L(v.name).trim().charAt(0)}</span><span className="mx-vh-name">{L(v.name)}</span></th>)}
                  <th className="mx-sum">{zh ? "操作" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) =>
              <tr key={c.id}>
                    <td className="mx-fx">
                      <button className="mx-fxbtn" onClick={() => setDetail(c.id)} title={zh ? "點擊查看細節" : "Click for details"}>
                        <span><span className="mx-fxname mono">{c.code || "—"}{c.name ? " · " + c.name : ""}</span>
                        <span className="mx-fxcode">{c.standard ? (zh ? "對應標準 " : "Standard ") + c.standard : zh ? "（未選車款）" : "(no type)"}</span></span>
                      </button>
                    </td>
                    <td className="mx-req mono">{(c.itemIds || []).length}</td>
                    {vendors.map((v) => {
                  const on = (c.vendorIds || []).indexOf(v.id) >= 0;
                  return (
                    <td key={v.id} className={"mx-cell tc-cell" + (on ? " tc-on" : "")}
                    title={L(v.name) + (on ? zh ? " · 已指派" : " · assigned" : "")}
                    onClick={() => toggleVendor(c, v.id)}>
                          {on ? <Icon name="check" size={15} /> : <span className="tc-off">–</span>}
                        </td>);

                })}
                    <td className="mx-sumcell">
                      <span className="tc-actions">
                        <button className="icobtn" onClick={() => setEdit(c.id)} aria-label="edit"><Icon name="pencil" size={15} /></button>
                        <button className="delrow" onClick={() => del(c)} aria-label="delete"><Icon name="trash" size={15} /></button>
                      </span>
                    </td>
                  </tr>
              )}
              </tbody>
            </table>
          </div>
        }
        <p className="se-foot">{zh ? "點代號可查看細節浮窗；點格子可直接切換指派；點編輯鈕可修改產品內容。" : "Click a code for its detail popover; click a cell to toggle assignment; use the edit button to modify."}</p>
      </section>

      {edit && <TestcodeEditor tcId={edit} lang={lang} onClose={() => setEdit(null)} />}
      {detail && !edit && <TestcodeDetail tcId={detail} lang={lang} onClose={() => setDetail(null)} onEdit={() => {setDetail(null);setEdit(detail);}} />}
    </div>);

}

/* ---------- Detail popover: click a product code to see its specs ---------- */
function TestcodeDetail({ tcId, lang, onClose, onEdit }) {
  const zh = lang === "zh";
  const c = window.STORE.testcodes_get(tcId);
  const [tab, setTab] = tcState(() => c && c.photoBike ? "bike" : "spec");
  tcEffect(() => {
    const h = (e) => {if (e.key === "Escape") onClose();};
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  if (!c) return null;
  const params = c.params || [];
  const hasPhotos = !!(c.photoBike || c.photoSpec);
  const cur = tab === "bike" ? c.photoBike : c.photoSpec;
  return (
    <div className="modal-veil" onClick={onClose}>
      <div className="modal tc-detail" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3><span className="mono">{c.code}</span>{c.name ? " · " + c.name : ""}</h3>
          <button className="icobtn" onClick={onClose} aria-label="close"><Icon name="x" size={16} /></button>
        </div>
        <div className="modal-body tc-detail-body">
          <div className="tc-detail-meta">
            <span className="tc-chip"><span className="tc-chip-std">{zh ? "對應標準" : "Standard"}</span><span className="mono">{c.standard || "—"}</span></span>
            <span className="tc-chip"><span className="tc-chip-std">{zh ? "涵蓋測試" : "Tests"}</span><span className="mono">{(c.itemIds || []).length}</span></span>
            <span className="tc-chip"><span className="tc-chip-std">{zh ? "指派供應商" : "Vendors"}</span><span className="mono">{(c.vendorIds || []).length}</span></span>
          </div>
          {hasPhotos &&
          <div className="tc-photoframe">
            <div className="tc-phototabs">
              <button className={"tc-phototab" + (tab === "bike" ? " on" : "")} onClick={() => setTab("bike")} disabled={!c.photoBike}>{zh ? "車款圖" : "Bike"}</button>
              <button className={"tc-phototab" + (tab === "spec" ? " on" : "")} onClick={() => setTab("spec")} disabled={!c.photoSpec}>{zh ? "規格圖" : "Spec"}</button>
            </div>
            {cur ?
            <img className="tc-photoframe-img tc-zoomable" src={cur} alt="" onClick={() => openPhotoZoom(cur)} /> :
            <div className="tc-photo-ph"><span>{zh ? "未上傳" : "No image"}</span></div>}
          </div>}
          {params.length === 0 ?
          <div className="tc-pick-empty">{zh ? "尚未登記車架參數。點「編輯」新增（如後軸寬、五通規格…）。" : "No frame parameters yet — use Edit to add (e.g. rear axle spacing, BB spec…)."}</div> :
          <div className="tc-params">
            {params.map(function (p, i) {
              return (
                <div className="tc-param" key={i}>
                  <span className="tc-param-k">{p.label}</span>
                  <span className="tc-param-v mono">{p.value}{p.unit ? " " + p.unit : ""}</span>
                </div>);
            })}
          </div>}
        </div>
        {onEdit &&
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>{zh ? "關閉" : "Close"}</button>
          <button className="btn" onClick={onEdit}><Icon name="pencil" size={15} />{zh ? "編輯" : "Edit"}</button>
        </div>}
      </div>
    </div>);

}

/* ---------- Editor modal ---------- */
function TestcodeEditor({ tcId, lang, onClose }) {
  const zh = lang === "zh";
  const L = (o) => o && o[lang] != null ? o[lang] : o;
  const isNew = tcId === "__new__";
  const [id] = tcState(() => isNew ? window.STORE.newTestcodeKey() : tcId);
  const [d, setD] = tcState(() => {
    if (isNew) return window.STORE.blankTestcode();
    const rec = window.STORE.clone(window.STORE.testcodes_get(tcId));
    if (rec.standard && typeof rec.standard === "object") rec.standard = rec.standard.zh || rec.standard.en || "";
    if (rec.name == null) rec.name = "";
    if (!Array.isArray(rec.params)) rec.params = [];
    if (rec.photoBike == null) rec.photoBike = "";
    if (rec.photoSpec == null) rec.photoSpec = "";
    return rec;
  });
  const [err, setErr] = tcState("");
  const set = (patch) => setD((p) => ({ ...p, ...patch }));
  const items = window.STORE.items_list();
  const vendors = window.STORE.vendors_list();
  const cats = window.STORE.bikecats_list();

  /* items matching the picked bike type (unset bike = universal, always shown) */
  const matching = d.standard ? items.filter((it) => !it.bike || it.bike === d.standard) : items;

  function pickStandard(cat) {
    const patch = { standard: cat };
    // auto product code (only if empty or still an auto value for another type)
    if (!d.code || /^([A-Za-z-]+)-\d+$/.test(d.code)) patch.code = window.STORE.nextTestcodeCode(cat);
    // pre-check all matching tests for the admin to review
    patch.itemIds = items.filter((it) => !it.bike || it.bike === cat).map((it) => it.id);
    setD((p) => ({ ...p, ...patch }));
  }
  function loadPhoto(key, file) {
    if (!file || !file.type.startsWith("image/")) return;
    const path = "catalog/testcodes/" + (id || "code") + "_" + key + ".jpg";
    window.bffUploadImage(file, 1100, 0.72, path).then(function (src) {setD(function (p) {const n = { ...p };n[key] = src;return n;});setErr("");}).
    catch(function () {setErr(zh ? "上傳失敗（檔案不是圖片，或超過 20MB）" : "Upload failed (not an image, or over 20MB)");});
  }
  function toggleItem(itemId) {
    const has = d.itemIds.indexOf(itemId) >= 0;
    set({ itemIds: has ? d.itemIds.filter((x) => x !== itemId) : d.itemIds.concat(itemId) });
  }
  function toggleVendor(vid) {
    const has = d.vendorIds.indexOf(vid) >= 0;
    set({ vendorIds: has ? d.vendorIds.filter((x) => x !== vid) : d.vendorIds.concat(vid) });
  }
  /* frame parameters (車架參數) — shown only in the detail popover, not the table */
  const params = d.params || [];
  const addParam = () => set({ params: params.concat({ label: "", value: "", unit: "" }) });
  const setParam = (i, patch) => set({ params: params.map(function (p, j) {return j === i ? { ...p, ...patch } : p;}) });
  const delParam = (i) => set({ params: params.filter(function (_, j) {return j !== i;}) });
  function save() {
    if (!d.name.trim()) {setErr(zh ? "請輸入產品名稱" : "Enter a product name");return;}
    if (!d.standard) {setErr(zh ? "請選擇對應標準（車款）" : "Pick a standard (bike type)");return;}
    window.STORE.testcodes_save(id, window.STORE.clone(d)); // code auto-numbers in the store if empty
    onClose();
  }

  return (
    <div className="modal-veil" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{isNew ? zh ? "新增產品" : "New product" : zh ? "編輯產品" : "Edit product"}</h3>
          <button className="icobtn" onClick={onClose} aria-label="close"><Icon name="x" size={16} /></button>
        </div>
        <div className="modal-body tc-body">
          <div className="ed-grid">
            <Field label={zh ? "產品名稱" : "Product name"}><input className="inp mono" value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="FRM180" /></Field>
            <Field label={zh ? "對應標準（車款）" : "Standard (bike type)"}>
              <select className="inp" value={d.standard} onChange={(e) => pickStandard(e.target.value)}>
                <option value="" disabled>{zh ? "請選擇…" : "Select…"}</option>
                {cats.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>

          <div className="tc-photos-ed">
            {[["photoBike", zh ? "車款圖" : "Bike photo"], ["photoSpec", zh ? "規格圖" : "Spec drawing"]].map(function (pair) {
              const key = pair[0],label = pair[1];
              return (
                <div className="tc-photo-slot" key={key}>
                  <div className="tc-pick-h">{label}</div>
                  {d[key] ?
                  <img src={d[key]} alt="" /> :
                  <div className="tc-photo-ph"><Icon name="upload" size={18} /><span>{zh ? "尚未上傳" : "No image"}</span></div>}
                  <div className="tc-photo-tools">
                    <label className="mini-btn"><Icon name="upload" size={12} />{d[key] ? zh ? "更換" : "Replace" : zh ? "上傳" : "Upload"}
                      <input type="file" accept="image/*" hidden onChange={function (e) {loadPhoto(key, e.target.files[0]);e.target.value = "";}} /></label>
                    {d[key] && <button className="mini-btn ghost" onClick={function () {set({ [key]: "" });}}>{zh ? "移除" : "Remove"}</button>}
                  </div>
                </div>);
            })}
          </div>

          <div className="tc-pickwrap">
            <div className="tc-pick">
              <div className="tc-pick-h">{zh ? "涵蓋測試項目" : "Covered tests"}<span className="mono">{d.itemIds.length}/{matching.length}</span>
                {d.standard && <span className="tc-pick-note">{zh ? `已依「${d.standard}」預選，請檢視勾選` : `Pre-selected for ${d.standard} — review`}</span>}
              </div>
              <div className="tc-pick-list">
                {!d.standard ?
                <div className="tc-pick-empty">{zh ? "請先選擇對應標準（車款），符合的測試項目會列在這裡。" : "Pick a standard first — matching tests appear here."}</div> :
                matching.map((it) =>
                <label className={"tc-opt" + (d.itemIds.indexOf(it.id) >= 0 ? " on" : "")} key={it.id}>
                    <input type="checkbox" checked={d.itemIds.indexOf(it.id) >= 0} onChange={() => toggleItem(it.id)} />
                    <span className="mono tc-opt-code">{it.code}</span>
                    <span className="tc-opt-name">{L(it.name)}</span>
                    {it.bike ? <span className="tc-opt-bike mono">{it.bike}</span> : <span className="tc-opt-bike tc-opt-all">{zh ? "通用" : "all"}</span>}
                  </label>
                )}
              </div>
            </div>
            <div className="tc-pick">
              <div className="tc-pick-h">{zh ? "指派供應商" : "Assigned vendors"}<span className="mono">{d.vendorIds.length}</span></div>
              <div className="tc-pick-list">
                {vendors.map((v) =>
                <label className={"tc-opt" + (d.vendorIds.indexOf(v.id) >= 0 ? " on" : "")} key={v.id}>
                    <input type="checkbox" checked={d.vendorIds.indexOf(v.id) >= 0} onChange={() => toggleVendor(v.id)} />
                    <span className="tc-opt-name">{L(v.name)}</span>
                  </label>
                )}
              </div>
            </div>
          </div>

          <div className="tc-pick tc-params-ed">
            <div className="tc-pick-h">{zh ? "車架參數（僅於細節浮窗顯示）" : "Frame parameters (popover only)"}<span className="mono">{params.length}</span>
              <button className="addrow" onClick={addParam}><Icon name="plus" size={13} />{zh ? "新增" : "Add"}</button>
            </div>
            {params.length === 0 ?
            <div className="tc-pick-empty">{zh ? "例：後軸寬 148 mm、五通 BSA 68、前叉行程 160 mm…這些不會帶入表格，只在點選代號時顯示。" : "e.g. rear axle 148 mm, BB BSA 68, fork travel 160 mm — shown only in the code popover."}</div> :
            <div className="tc-params-rows">
              {params.map(function (p, i) {
                return (
                  <div className="tc-param-row" key={i}>
                    <input className="inp" value={p.label} placeholder={zh ? "參數（如：後軸寬）" : "Label (e.g. rear axle)"} onChange={function (e) {setParam(i, { label: e.target.value });}} />
                    <input className="inp mono" value={p.value} placeholder="148" onChange={function (e) {setParam(i, { value: e.target.value });}} />
                    <input className="inp mono tc-param-unit" value={p.unit} placeholder="mm" onChange={function (e) {setParam(i, { unit: e.target.value });}} />
                    <button className="delrow" onClick={function () {delParam(i);}} aria-label="delete"><Icon name="trash" size={14} /></button>
                  </div>);
              })}
            </div>}
          </div>
        </div>
        {err && <div className="login-err modal-err"><Icon name="x" size={14} />{err}</div>}
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>{zh ? "取消" : "Cancel"}</button>
          <button className="btn" onClick={save}><Icon name="check" size={16} />{zh ? "儲存" : "Save"}</button>
        </div>
      </div>
    </div>);

}

/* ---------- Vendor: assigned-codes banner on Home ---------- */
function VendorCodeBanner({ vendorId, lang }) {
  const L = (o) => o && o[lang] != null ? o[lang] : o;
  const zh = lang === "zh";
  const [detail, setDetail] = tcState(null);
  const mine = window.STORE.testcodes_forVendor(vendorId);
  if (!mine.length) return null;
  return (
    <div className="tc-banner">
      <span className="tc-banner-k"><Icon name="grid" size={14} />{zh ? "您的產品代號" : "Your product codes"}</span>
      {mine.map((c) =>
      <button className="tc-chip tc-chip-btn" key={c.id} onClick={() => setDetail(c.id)} title={zh ? "點擊查看細節" : "Click for details"}>
          <span className="mono">{c.code}</span>
          {c.name && <span className="tc-chip-std">{c.name}</span>}
          {c.standard && <span className="tc-chip-std mono">{typeof c.standard === "string" ? c.standard : L(c.standard)}</span>}
          <span className="tc-chip-n mono">{(c.itemIds || []).length}</span>
        </button>
      )}
      {detail && <TestcodeDetail tcId={detail} lang={lang} onClose={() => setDetail(null)} />}
    </div>);

}

/* ---------- Vendor: 目前專案 page — full detail of each assigned product ---------- */
function VendorProjectCard({ c, lang, onOpenTest }) {
  const zh = lang === "zh";
  const L = (o) => o && o[lang] != null ? o[lang] : o;
  const [tab, setTab] = tcState(c.photoBike ? "bike" : "spec");
  const items = window.STORE.items_list().filter(function (it) {return (c.itemIds || []).indexOf(it.id) >= 0;});
  const params = c.params || [];
  const hasPhotos = !!(c.photoBike || c.photoSpec);
  const cur = tab === "bike" ? c.photoBike : c.photoSpec;
  return (
    <div className="vproj">
      <div className="vproj-head">
        <span className="vproj-code mono">{c.code}</span>
        {c.name && <span className="vproj-name">{c.name}</span>}
        {c.standard && <span className="tc-chip"><span className="tc-chip-std">{zh ? "對應標準" : "Standard"}</span><span className="mono">{c.standard}</span></span>}
        <span className="tc-chip"><span className="tc-chip-std">{zh ? "涵蓋測試" : "Tests"}</span><span className="mono">{items.length}</span></span>
      </div>
      <div className={"vproj-body" + (hasPhotos ? " has-photo" : "")}>
        {hasPhotos &&
        <div className="tc-photoframe">
          <div className="tc-phototabs">
            <button className={"tc-phototab" + (tab === "bike" ? " on" : "")} onClick={() => setTab("bike")} disabled={!c.photoBike}>{zh ? "車款圖" : "Bike"}</button>
            <button className={"tc-phototab" + (tab === "spec" ? " on" : "")} onClick={() => setTab("spec")} disabled={!c.photoSpec}>{zh ? "規格圖" : "Spec"}</button>
          </div>
          {cur ? <img className="tc-photoframe-img tc-zoomable" src={cur} alt="" onClick={() => openPhotoZoom(cur)} /> : <div className="tc-photo-ph"><span>{zh ? "未上傳" : "No image"}</span></div>}
        </div>}
        <div className="vproj-info">
          {params.length > 0 &&
          <div className="tc-params">
            {params.map(function (p, i) {
              return (
                <div className="tc-param" key={i}>
                  <span className="tc-param-k">{p.label}</span>
                  <span className="tc-param-v mono">{p.value}{p.unit ? " " + p.unit : ""}</span>
                </div>);
            })}
          </div>}
          <div className="tc-pick">
            <div className="tc-pick-h">{zh ? "涵蓋測試項目" : "Covered tests"}<span className="mono">{items.length}</span></div>
            <div className="tc-pick-list">
              {items.map(function (it) {
                return (
                  <button className="tc-opt vproj-test" key={it.id} onClick={function () {onOpenTest && onOpenTest(it.id);}}>
                    <span className="mono tc-opt-code">{it.code}</span>
                    <span className="tc-opt-name">{L(it.name)}</span>
                    <Icon name="chevronRight" size={14} />
                  </button>);
              })}
            </div>
          </div>
        </div>
      </div>
    </div>);

}

function VendorProjectsPage({ lang, vendorId, onOpenTest }) {
  const zh = lang === "zh";
  const [, bump] = tcState(0);
  tcEffect(() => {
    window.scrollTo(0, 0);
    const h = () => bump((n) => n + 1);
    window.addEventListener("bff:datachange", h);
    return () => window.removeEventListener("bff:datachange", h);
  }, []);
  const mine = window.STORE.testcodes_forVendor(vendorId);
  return (
    <div className="home">
      <section className="hero hero-sm">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-inner">
          <div className="hero-kicker"><span className="kick-dot" />{zh ? "供應商 · 專案總覽" : "Vendor · project overview"}</div>
          <h1 className="hero-title">{zh ? "目前專案" : "Current projects"}</h1>
          <p className="hero-hint">{zh ? "您被指派的產品代號與對應的測試項目、車架參數與圖面。制具總覽與盤點頁也只會顯示這些測試用到的制具與設備。" : "Your assigned products — covered tests, frame parameters and drawings. Fixture/equipment pages are scoped to these tests too."}</p>
        </div>
      </section>
      <section className="list-section">
        {mine.length === 0 ?
        <div className="passcrit empty"><Icon name="grid" size={20} />{zh ? "目前沒有被指派的專案。" : "No assigned projects yet."}</div> :
        <div className="vproj-list">
          {mine.map(function (c) {return <VendorProjectCard c={c} lang={lang} onOpenTest={onOpenTest} key={c.id} />;})}
        </div>}
      </section>
    </div>);

}

Object.assign(window, { TestcodesPage, TestcodeEditor, VendorCodeBanner, TestcodeDetail, VendorProjectsPage });