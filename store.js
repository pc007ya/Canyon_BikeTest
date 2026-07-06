/* Persistent data store + audit log (demo — localStorage backed).
   Overlays editable copies of ITEMS and VENDORS onto the static defaults,
   and records every admin change for the History page.
   Must load AFTER data.js + auth.js, BEFORE the babel component scripts. */
  /* ---- shared image downscale -> JPEG data-URI ----
     Admin uploads (制具圖 / 設備圖 / 步驟圖 / 示意圖) are stored as data-URIs and
     synced INSIDE the single Firestore master doc, which is hard-capped at 1 MiB.
     Full-resolution phone photos blow that limit, so every upload is downscaled
     and JPEG-compressed first (mirrors the vendor report-photo path). */
  window.bffResizeImage = function (file, maxPx, quality) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type || !file.type.startsWith("image/")) { reject(new Error("not an image")); return; }
      const fr = new FileReader();
      fr.onerror = reject;
      fr.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          let w = img.width, h = img.height;
          const scale = Math.min(1, (maxPx || 1200) / Math.max(w, h));
          w = Math.max(1, Math.round(w * scale)); h = Math.max(1, Math.round(h * scale));
          const cv = document.createElement("canvas");
          cv.width = w; cv.height = h;
          const ctx = cv.getContext("2d");
          ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h); // flatten transparency for JPEG
          ctx.drawImage(img, 0, 0, w, h);
          let out;
          try { out = cv.toDataURL("image/jpeg", quality || 0.72); }
          catch (e) { out = fr.result; } // tainted/unsupported -> fall back to original
          resolve(out);
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  };

  /* Re-compress an existing data-URI image (used by the maintenance/compact tool). */
  window.bffCompressDataUri = function (uri, maxPx, quality) {
    return new Promise((resolve) => {
      if (typeof uri !== "string" || uri.slice(0, 11) !== "data:image/") { resolve(uri); return; }
      const img = new Image();
      img.onerror = () => resolve(uri);
      img.onload = () => {
        let w = img.width, h = img.height;
        const scale = Math.min(1, (maxPx || 1200) / Math.max(w, h));
        w = Math.max(1, Math.round(w * scale)); h = Math.max(1, Math.round(h * scale));
        const cv = document.createElement("canvas");
        cv.width = w; cv.height = h;
        const ctx = cv.getContext("2d");
        ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        let out;
        try { out = cv.toDataURL("image/jpeg", quality || 0.72); } catch (e) { out = uri; }
        resolve(out.length < uri.length ? out : uri); // keep whichever is smaller
      };
      img.src = uri;
    });
  };

(function () {
  const KEYS = { items: "bff:items:v2", vendors: "bff:vendors:v1", parts: "bff:parts:v2", equipment: "bff:equipment:v1", log: "bff:auditlog:v1" };
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const useIDB = !!(window.KV && window.KV.available);
  const load = (k, f) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? f : v; } catch (e) { return f; } };
  // write-through: prefer IndexedDB (big quota); fall back to localStorage and
  // surface a visible error if even that fails (e.g. quota exceeded on file://).
  const save = (k, v) => {
    if (useIDB) {
      window.KV.set(k, v).catch(() => saveLocal(k, v));
      return;
    }
    saveLocal(k, v);
  };
  function saveLocal(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); }
    catch (e) { try { window.dispatchEvent(new CustomEvent("bff:saveerror", { detail: { key: k, error: String(e && e.name || e) } })); } catch (e2) {} }
  }

  const defaults = { items: clone(window.DATA.ITEMS), vendors: clone(window.AUTH.VENDORS), parts: clone(window.DATA.PARTS), equipment: clone(window.DATA.EQUIPMENT || {}) };

  // live state (mutated in place so existing window.DATA.* / window.AUTH.* readers stay valid)
  const items = load(KEYS.items, null) || clone(window.DATA.ITEMS);
  const vendors = load(KEYS.vendors, null) || clone(window.AUTH.VENDORS);
  const parts = load(KEYS.parts, null) || clone(window.DATA.PARTS);
  const _loadedEquip = load(KEYS.equipment, null);
  const equipment = (_loadedEquip && Object.keys(_loadedEquip).length) ? _loadedEquip : clone(window.DATA.EQUIPMENT || {});
  const log = load(KEYS.log, []);
  window.DATA.ITEMS = items;
  window.DATA.PARTS = parts;
  window.DATA.EQUIPMENT = equipment;
  window.AUTH.VENDORS = vendors;

  // back-fill `equipment` onto test items loaded from caches predating the
  // equipment feature, using the bundled defaults keyed by test id.
  const _defEquipById = {};
  defaults.items.forEach((d) => { _defEquipById[d.id] = d.equipment || []; });
  const _EQMIG = "bff:equipmig:1";
  let _needRecover; try { _needRecover = !localStorage.getItem(_EQMIG); } catch (e) { _needRecover = true; }
  function migrateEquip() {
    let touched = false;
    items.forEach((it) => {
      const def = _defEquipById[it.id];
      if (!Array.isArray(it.equipment)) { it.equipment = clone(def || []); touched = true; }
      else if (_needRecover && it.equipment.length === 0 && def && def.length) { it.equipment = clone(def); touched = true; }
    });
    return touched;
  }
  function markEquipMigrated() { try { localStorage.setItem(_EQMIG, "1"); } catch (e) {} }
  migrateEquip();
  if (!useIDB) markEquipMigrated();

  // normalize legacy object-shaped `version` fields (an earlier iteration of
  // this feature stored version as {zh,en}; the shipped schema is a plain string)
  function normalizeVersion(dict) {
    Object.keys(dict).forEach((k) => {
      const v = dict[k].version;
      if (v && typeof v === "object") dict[k].version = v.zh || v.en || "";
    });
  }
  normalizeVersion(parts);
  normalizeVersion(equipment);

  const emit = () => window.dispatchEvent(new CustomEvent("bff:datachange"));
  const actor = () => { const u = window.AUTH.get && window.AUTH.get(); return u && u.name ? u.name : { zh: "系統", en: "System" }; };

  function addLog(entry) {
    log.unshift(Object.assign(
      { id: "L" + Date.now() + "-" + Math.random().toString(36).slice(2, 6), at: Date.now(), by: actor() },
      entry
    ));
    save(KEYS.log, log);
  }

  /* ---- fixtures helper: build a full embedded fixture object from a part key ---- */
  function fxObj(key, qty, torque) {
    const p = window.DATA.PARTS[key];
    if (!p) return null;
    return { key, code: p.code, name: p.name, image: p.image, kind: p.kind, qty: Math.max(0, Math.round(+qty || 0)), torque: torque && String(torque).trim() ? String(torque).trim() : null };
  }
  /* ---- equipment helper: build a full embedded equipment object from a key ---- */
  function eqObj(key, qty) {
    const e = window.DATA.EQUIPMENT[key];
    if (!e) return null;
    return { key, code: e.code, name: e.name, image: e.image || "", kind: e.kind, qty: Math.max(0, Math.round(+qty || 0)) };
  }

  /* ---- test items ---- */
  const items_list = () => items;
  const items_get = (id) => items.find((i) => i.id === id);
  /* Touch updatedAt on library entries so the vendor recount-alert (bell +
     pink row, see fixtures.jsx/equipment.jsx needsRecount) fires whenever a
     test's fixture/equipment usage is newly created or its qty changes —
     not just when the library record itself is edited. */
  function touchLibrary(dict, keys) {
    const now = Date.now();
    keys.forEach((k) => { if (dict[k]) dict[k].updatedAt = now; });
  }
  function usageKeysNeedingTouch(before, after) {
    const bm = {}; (before || []).forEach((f) => { bm[f.key] = f.qty; });
    const out = [];
    (after || []).forEach((f) => { if (bm[f.key] !== f.qty) out.push(f.key); });
    return out;
  }
  function items_save(item) {
    const idx = items.findIndex((i) => i.id === item.id);
    if (idx >= 0) {
      const changes = diffItem(items[idx], item);
      const touchedFx = usageKeysNeedingTouch(items[idx].fixtures, item.fixtures);
      const touchedEq = usageKeysNeedingTouch(items[idx].equipment, item.equipment);
      items[idx] = item;
      save(KEYS.items, items);
      if (touchedFx.length) { touchLibrary(parts, touchedFx); save(KEYS.parts, parts); }
      if (touchedEq.length) { touchLibrary(equipment, touchedEq); save(KEYS.equipment, equipment); }
      addLog({ action: "update", entity: "test", targetId: item.id, targetName: clone(item.name), changes });
    } else {
      items.push(item);
      save(KEYS.items, items);
      const fxKeys = (item.fixtures || []).map((f) => f.key);
      const eqKeys = (item.equipment || []).map((f) => f.key);
      if (fxKeys.length) { touchLibrary(parts, fxKeys); save(KEYS.parts, parts); }
      if (eqKeys.length) { touchLibrary(equipment, eqKeys); save(KEYS.equipment, equipment); }
      addLog({ action: "create", entity: "test", targetId: item.id, targetName: clone(item.name), changes: [{ zh: "新增測試項目", en: "Created test item" }] });
    }
    emit();
  }
  function items_delete(id) {
    const idx = items.findIndex((i) => i.id === id);
    if (idx < 0) return;
    const it = items[idx];
    items.splice(idx, 1);
    save(KEYS.items, items);
    addLog({ action: "delete", entity: "test", targetId: id, targetName: clone(it.name), changes: [{ zh: "刪除測試項目", en: "Deleted test item" }] });
    emit();
  }

  /* ---- vendors ---- */
  const vendors_list = () => vendors;
  function slugId(s, fallback) {
    const base = String(s || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return base || fallback;
  }
  function nextVendorId() {
    const ex = new Set(vendors.map((v) => v.id));
    let n = vendors.length + 1, id = "vendor-" + n;
    while (ex.has(id)) { n++; id = "vendor-" + n; }
    return id;
  }
  function vendors_save(v, oldId) {
    // rename: migrate stock-take and remove the old record
    if (oldId && oldId !== v.id) {
      const oi = vendors.findIndex((x) => x.id === oldId);
      if (oi >= 0) vendors.splice(oi, 1);
      try {
        const s = localStorage.getItem("bff:stock:" + oldId);
        if (s != null) { localStorage.setItem("bff:stock:" + v.id, s); localStorage.removeItem("bff:stock:" + oldId); }
      } catch (e) {}
    }
    const idx = vendors.findIndex((x) => x.id === v.id);
    if (idx >= 0) {
      const before = vendors[idx];
      const ch = [];
      if (JSON.stringify(before.name) !== JSON.stringify(v.name)) ch.push({ zh: `名稱 → ${v.name.zh}`, en: `Name → ${v.name.en}` });
      if (before.code !== v.code) ch.push({ zh: "更新存取碼", en: "Access code changed" });
      if (oldId && oldId !== v.id) ch.push({ zh: `代號 ${oldId} → ${v.id}`, en: `ID ${oldId} → ${v.id}` });
      vendors[idx] = v;
      save(KEYS.vendors, vendors);
      addLog({ action: "update", entity: "vendor", targetId: v.id, targetName: clone(v.name), changes: ch.length ? ch : [{ zh: "更新供應商資料", en: "Updated vendor" }] });
    } else {
      vendors.push(v);
      save(KEYS.vendors, vendors);
      addLog({ action: "create", entity: "vendor", targetId: v.id, targetName: clone(v.name), changes: [{ zh: "新增供應商", en: "Added vendor" }] });
    }
    emit();
  }
  function vendors_delete(id) {
    const idx = vendors.findIndex((x) => x.id === id);
    if (idx < 0) return;
    const v = vendors[idx];
    vendors.splice(idx, 1);
    save(KEYS.vendors, vendors);
    try { localStorage.removeItem("bff:stock:" + id); } catch (e) {}
    addLog({ action: "delete", entity: "vendor", targetId: id, targetName: clone(v.name), changes: [{ zh: "刪除供應商", en: "Removed vendor" }] });
    emit();
  }

  /* ---- diff for test item updates ---- */
  function diffItem(a, b) {
    const c = [];
    if (JSON.stringify(a.name) !== JSON.stringify(b.name)) c.push({ zh: `名稱 → ${b.name.zh}`, en: `Name → ${b.name.en}` });
    if (a.standard !== b.standard || a.clause !== b.clause)
      c.push({ zh: `對應標準 ${a.standard} ${a.clause} → ${b.standard} ${b.clause}`, en: `Standard ${a.standard} ${a.clause} → ${b.standard} ${b.clause}` });
    if (JSON.stringify(a.params) !== JSON.stringify(b.params)) c.push(a.params.length !== b.params.length ? { zh: `測試參數已更新（${a.params.length} → ${b.params.length} 項）`, en: `Parameters updated (${a.params.length} → ${b.params.length})` } : { zh: "測試參數已更新", en: "Parameters updated" });
    if (JSON.stringify(a.fixtures) !== JSON.stringify(b.fixtures)) c.push(a.fixtures.length !== b.fixtures.length ? { zh: `所需制具已更新（${a.fixtures.length} → ${b.fixtures.length} 件）`, en: `Fixtures updated (${a.fixtures.length} → ${b.fixtures.length})` } : { zh: "所需制具已更新", en: "Fixtures updated" });
    if (JSON.stringify(a.equipment || []) !== JSON.stringify(b.equipment || [])) { const an = (a.equipment || []).length, bn = (b.equipment || []).length; c.push(an !== bn ? { zh: `所需設備已更新（${an} → ${bn} 項）`, en: `Equipment updated (${an} → ${bn})` } : { zh: "所需設備已更新", en: "Equipment updated" }); }
    if (JSON.stringify(a.steps) !== JSON.stringify(b.steps)) c.push(a.steps.length !== b.steps.length ? { zh: `安裝步驟已更新（${a.steps.length} → ${b.steps.length} 步）`, en: `Steps updated (${a.steps.length} → ${b.steps.length})` } : { zh: "安裝步驟已更新", en: "Steps updated" });
    if (a.status !== b.status) c.push({ zh: `狀態 → ${b.status === "ready" ? "可測" : "草稿"}`, en: `Status → ${b.status}` });
    if (JSON.stringify(a.summary) !== JSON.stringify(b.summary)) c.push({ zh: "概述已更新", en: "Summary updated" });
    return c.length ? c : [{ zh: "內容微調", en: "Minor edits" }];
  }

  /* ---- fixture library (PARTS) ---- */
  const parts_list = () => Object.keys(parts).map((key) => Object.assign({ key }, parts[key]));
  const parts_get = (key) => parts[key];
  function refreshEmbedded(key) {
    const p = parts[key];
    if (!p) return;
    items.forEach((it) => it.fixtures.forEach((f) => {
      if (f.key === key) { f.code = p.code; f.name = p.name; f.image = p.image; f.kind = p.kind; }
    }));
    save(KEYS.items, items);
  }
  /* small helper: diff a {zh,en} field pair for the audit log */
  function diffBiField(labelZh, labelEn, before, after, ch) {
    const b = before || { zh: "", en: "" }, a = after || { zh: "", en: "" };
    if ((b.zh || "") !== (a.zh || "") || (b.en || "") !== (a.en || "")) {
      ch.push({ zh: `${labelZh} → ${a.zh || "—"}`, en: `${labelEn} → ${a.en || "—"}` });
    }
  }

  function parts_save(key, data) {
    const exists = !!parts[key];
    const before = exists ? parts[key] : null;
    parts[key] = { code: data.code, name: data.name, image: data.image, kind: data.kind, stock: Math.max(0, Math.round(+data.stock || 0)), loc: data.loc || "", updatedAt: Date.now(),
      vendor: data.vendor || { zh: "", en: "" }, material: data.material || { zh: "", en: "" }, version: data.version || "" };
    save(KEYS.parts, parts);
    if (exists) {
      const ch = [];
      if (JSON.stringify(before.name) !== JSON.stringify(data.name)) ch.push({ zh: `名稱 → ${data.name.zh}`, en: `Name → ${data.name.en}` });
      if (before.code !== data.code) ch.push({ zh: `編號 ${before.code} → ${data.code}`, en: `Part no. ${before.code} → ${data.code}` });
      if (before.image !== data.image) ch.push({ zh: "更換制具圖", en: "Image replaced" });
      if ((before.stock || 0) !== (parts[key].stock || 0)) ch.push({ zh: `系統庫存 ${before.stock || 0} → ${parts[key].stock}`, en: `Default stock ${before.stock || 0} → ${parts[key].stock}` });
      if ((before.loc || "") !== (parts[key].loc || "")) ch.push({ zh: `儲位 → ${parts[key].loc || "—"}`, en: `Location → ${parts[key].loc || "—"}` });
      diffBiField("廠商", "Vendor", before.vendor, parts[key].vendor, ch);
      diffBiField("材質", "Material", before.material, parts[key].material, ch);
      if ((before.version || "") !== (parts[key].version || "")) ch.push({ zh: `版本 → ${parts[key].version || "—"}`, en: `Version → ${parts[key].version || "—"}` });
      refreshEmbedded(key);
      addLog({ action: "update", entity: "fixture", targetId: key, targetName: clone(data.name), changes: ch.length ? ch : [{ zh: "內容微調", en: "Minor edits" }] });
    } else {
      addLog({ action: "create", entity: "fixture", targetId: key, targetName: clone(data.name), changes: [{ zh: "新增制具", en: "Created fixture" }] });
    }
    emit();
  }
  function parts_delete(key) {
    const p = parts[key];
    if (!p) return;
    let affected = 0;
    items.forEach((it) => {
      const n = it.fixtures.length;
      it.fixtures = it.fixtures.filter((f) => f.key !== key);
      if (it.fixtures.length !== n) affected++;
    });
    delete parts[key];
    save(KEYS.parts, parts); save(KEYS.items, items);
    const ch = [{ zh: "刪除制具", en: "Deleted fixture" }];
    if (affected) ch.push({ zh: `已自 ${affected} 項測試移除`, en: `Removed from ${affected} test(s)` });
    addLog({ action: "delete", entity: "fixture", targetId: key, targetName: clone(p.name), changes: ch });
    emit();
  }
  function blankPart() {
    return { code: "", name: { zh: "", en: "" }, image: window.DATA.IMG.slideTable, kind: { zh: "", en: "" }, stock: 0, loc: "", version: "",
      vendor: { zh: "", en: "" }, material: { zh: "", en: "" } };
  }
  const newPartKey = () => "p_" + Date.now().toString(36);

  /* ---- maintenance: re-compress every stored data-URI image in place ----
     Recovers a dataset that has grown past Firestore's 1 MiB master-doc limit
     because of large admin-uploaded photos. Only touches base64 data-URIs;
     built-in file-path images (e.g. "jigs/A1.png") are left untouched. */
  const _isDataImg = (s) => typeof s === "string" && s.slice(0, 11) === "data:image/";
  async function compactImages() {
    let scanned = 0, shrunk = 0, before = 0, after = 0;
    async function squeeze(uri, maxPx, q) {
      before += uri.length; scanned++;
      const c = await window.bffCompressDataUri(uri, maxPx, q);
      after += c.length; if (c.length < uri.length) shrunk++;
      return c;
    }
    for (const it of items) {
      if (_isDataImg(it.schematic)) it.schematic = await squeeze(it.schematic, 1400, 0.72);
      for (const s of (it.steps || [])) if (_isDataImg(s.image)) s.image = await squeeze(s.image, 1100, 0.7);
    }
    for (const k of Object.keys(parts)) if (_isDataImg(parts[k].image)) parts[k].image = await squeeze(parts[k].image, 900, 0.72);
    for (const k of Object.keys(equipment)) if (_isDataImg(equipment[k].image)) equipment[k].image = await squeeze(equipment[k].image, 900, 0.72);
    // propagate compressed library images into the embedded copies inside items
    items.forEach((it) => {
      (it.fixtures || []).forEach((f) => { if (parts[f.key]) f.image = parts[f.key].image; });
      (it.equipment || []).forEach((f) => { if (equipment[f.key]) f.image = equipment[f.key].image || ""; });
    });
    save(KEYS.items, items); save(KEYS.parts, parts); save(KEYS.equipment, equipment);
    emit();
    return { scanned, shrunk, before, after };
  }

  /* ---- equipment library (EQUIPMENT) — vendor stock-take needs the MAX qty
     across tests (shared), not the sum (see equipment.jsx buildEquipUsage) ---- */
  const equipment_list = () => Object.keys(equipment).map((key) => Object.assign({ key }, equipment[key]));
  const equipment_get = (key) => equipment[key];
  function refreshEmbeddedEquip(key) {
    const e = equipment[key];
    if (!e) return;
    items.forEach((it) => (it.equipment || []).forEach((f) => {
      if (f.key === key) { f.code = e.code; f.name = e.name; f.image = e.image || ""; f.kind = e.kind; }
    }));
    save(KEYS.items, items);
  }
  function equipment_save(key, data) {
    const exists = !!equipment[key];
    const before = exists ? equipment[key] : null;
    equipment[key] = { code: data.code, name: data.name, image: data.image || "", kind: data.kind, stock: Math.max(0, Math.round(+data.stock || 0)), loc: data.loc || "", updatedAt: Date.now(),
      vendor: data.vendor || { zh: "", en: "" }, material: data.material || { zh: "", en: "" }, version: data.version || "" };
    save(KEYS.equipment, equipment);
    if (exists) {
      const ch = [];
      if (JSON.stringify(before.name) !== JSON.stringify(data.name)) ch.push({ zh: `名稱 → ${data.name.zh}`, en: `Name → ${data.name.en}` });
      if (before.code !== data.code) ch.push({ zh: `編號 ${before.code} → ${data.code}`, en: `Code ${before.code} → ${data.code}` });
      if ((before.stock || 0) !== (equipment[key].stock || 0)) ch.push({ zh: `系統庫存 ${before.stock || 0} → ${equipment[key].stock}`, en: `Default stock ${before.stock || 0} → ${equipment[key].stock}` });
      if ((before.loc || "") !== (equipment[key].loc || "")) ch.push({ zh: `儲位 → ${equipment[key].loc || "—"}`, en: `Location → ${equipment[key].loc || "—"}` });
      diffBiField("廠商", "Vendor", before.vendor, equipment[key].vendor, ch);
      diffBiField("材質", "Material", before.material, equipment[key].material, ch);
      if ((before.version || "") !== (equipment[key].version || "")) ch.push({ zh: `版本 → ${equipment[key].version || "—"}`, en: `Version → ${equipment[key].version || "—"}` });
      refreshEmbeddedEquip(key);
      addLog({ action: "update", entity: "equipment", targetId: key, targetName: clone(data.name), changes: ch.length ? ch : [{ zh: "內容微調", en: "Minor edits" }] });
    } else {
      addLog({ action: "create", entity: "equipment", targetId: key, targetName: clone(data.name), changes: [{ zh: "新增設備", en: "Created equipment" }] });
    }
    emit();
  }
  function equipment_delete(key) {
    const e = equipment[key];
    if (!e) return;
    let affected = 0;
    items.forEach((it) => {
      if (!Array.isArray(it.equipment)) return;
      const n = it.equipment.length;
      it.equipment = it.equipment.filter((f) => f.key !== key);
      if (it.equipment.length !== n) affected++;
    });
    delete equipment[key];
    save(KEYS.equipment, equipment); save(KEYS.items, items);
    const ch = [{ zh: "刪除設備", en: "Deleted equipment" }];
    if (affected) ch.push({ zh: `已自 ${affected} 項測試移除`, en: `Removed from ${affected} test(s)` });
    addLog({ action: "delete", entity: "equipment", targetId: key, targetName: clone(e.name), changes: ch });
    emit();
  }
  function blankEquip() {
    return { code: "", name: { zh: "", en: "" }, image: "", kind: { zh: "", en: "" }, stock: 0, loc: "", version: "",
      vendor: { zh: "", en: "" }, material: { zh: "", en: "" } };
  }
  const newEquipKey = () => "e_" + Date.now().toString(36);

  /* ---- snapshot backup / restore (stand-in for cloud sync) ---- */
  function collectStock() {
    const out = {};
    vendors.forEach((v) => { const s = localStorage.getItem("bff:stock:" + v.id); if (s) out[v.id] = JSON.parse(s); });
    return out;
  }
  function exportSnapshot() {
    return { format: "bff-snapshot", version: 1, at: Date.now(),
      items: clone(items), vendors: clone(vendors), parts: clone(parts), equipment: clone(equipment), log: clone(log), stock: collectStock() };
  }
  function importSnapshot(snap) {
    if (!snap || snap.format !== "bff-snapshot") throw new Error("格式不符 / Invalid snapshot file");
    items.length = 0; (snap.items || []).forEach((i) => items.push(i));
    vendors.length = 0; (snap.vendors || []).forEach((v) => vendors.push(v));
    Object.keys(parts).forEach((k) => delete parts[k]); Object.assign(parts, snap.parts || {});
    if (snap.equipment) { Object.keys(equipment).forEach((k) => delete equipment[k]); Object.assign(equipment, snap.equipment); }
    log.length = 0; (snap.log || []).forEach((e) => log.push(e));
    migrateEquip();
    save(KEYS.items, items); save(KEYS.vendors, vendors); save(KEYS.parts, parts); save(KEYS.equipment, equipment); save(KEYS.log, log);
    if (snap.stock) Object.keys(snap.stock).forEach((vid) => { try { localStorage.setItem("bff:stock:" + vid, JSON.stringify(snap.stock[vid])); } catch (e) {} });
    addLog({ action: "update", entity: "system", targetId: "restore", targetName: { zh: "資料還原", en: "Data restore" }, changes: [{ zh: "已從備份檔還原全部資料", en: "Restored all data from snapshot" }] });
    emit();
    window.dispatchEvent(new CustomEvent("bff:stockchange"));
  }

  const log_list = () => log;

  /* ---- hydrate from a remote source (cloud sync); does NOT re-log ---- */
  let applyingRemote = false;
  function hydrate(snap) {
    if (!snap) return;
    applyingRemote = true;
    if (snap.items) { items.length = 0; snap.items.forEach((i) => items.push(i)); save(KEYS.items, items); }
    if (snap.vendors) { vendors.length = 0; snap.vendors.forEach((v) => vendors.push(v)); save(KEYS.vendors, vendors); }
    if (snap.parts) { Object.keys(parts).forEach((k) => delete parts[k]); Object.assign(parts, snap.parts); save(KEYS.parts, parts); }
    if (snap.equipment) { Object.keys(equipment).forEach((k) => delete equipment[k]); Object.assign(equipment, snap.equipment); save(KEYS.equipment, equipment); }
    if (snap.log) { log.length = 0; snap.log.forEach((e) => log.push(e)); save(KEYS.log, log); }
    if (snap.adminCode) { try { localStorage.setItem("bff:admincode", snap.adminCode); } catch (e) {} }
    if (migrateEquip()) save(KEYS.items, items);
    emit();
    setTimeout(() => { applyingRemote = false; }, 0);
  }
  const isApplyingRemote = () => applyingRemote;
  const snapshotData = () => ({ items: clone(items), vendors: clone(vendors), parts: clone(parts), equipment: clone(equipment), log: clone(log), adminCode: admincode_get() });

  function admincode_get() { try { return localStorage.getItem("bff:admincode") || "admin"; } catch (e) { return "admin"; } }
  function admincode_set(code) {
    const c = String(code == null ? "" : code).trim();
    if (!c) return;
    try { localStorage.setItem("bff:admincode", c); } catch (e) {}
    addLog({ action: "update", entity: "system", targetId: "admincode", targetName: { zh: "管理員存取碼", en: "Admin access code" }, changes: [{ zh: "已變更管理員存取碼", en: "Admin access code changed" }] });
    emit();
  }

  function resetAll() {
    [KEYS.items, KEYS.vendors, KEYS.parts, KEYS.equipment, KEYS.log].forEach((k) => { try { localStorage.removeItem(k); } catch (e) {} if (useIDB) window.KV.del(k); });
    items.length = 0; clone(defaults.items).forEach((i) => items.push(i));
    vendors.length = 0; clone(defaults.vendors).forEach((v) => vendors.push(v));
    Object.keys(parts).forEach((k) => delete parts[k]); Object.assign(parts, clone(defaults.parts));
    Object.keys(equipment).forEach((k) => delete equipment[k]); Object.assign(equipment, clone(defaults.equipment));
    log.length = 0;
    emit();
  }

  function blankItem() {
    return {
      id: "new-" + Date.now(),
      code: "",
      category: { zh: "", en: "" },
      name: { zh: "", en: "" },
      standard: "",
      clause: "",
      status: "draft",
      schematic: window.DATA.IMG.frameSchematic,
      summary: { zh: "", en: "" },
      passCriteria: { zh: "", en: "" },
      params: [],
      fixtures: [],
      equipment: [],
      steps: [],
    };
  }

  window.STORE = {
    clone, defaults, fxObj, eqObj, blankItem, blankPart, newPartKey, blankEquip, newEquipKey,
    items_list, items_get, items_save, items_delete,
    vendors_list, vendors_save, vendors_delete, nextVendorId, slugId,
    parts_list, parts_get, parts_save, parts_delete,
    equipment_list, equipment_get, equipment_save, equipment_delete, compactImages,
    exportSnapshot, importSnapshot, hydrate, isApplyingRemote, snapshotData,
    admincode_get, admincode_set,
    log_list, addLog, resetAll,
  };

  /* ---- async boot: prefer IndexedDB; migrate any legacy localStorage data ---- */
  (async function boot() {
    if (!useIDB) return;
    const specs = [KEYS.items, KEYS.vendors, KEYS.parts, KEYS.equipment, KEYS.log];
    const liveFor = (k) => k === KEYS.parts ? parts : k === KEYS.equipment ? equipment : k === KEYS.items ? items : k === KEYS.vendors ? vendors : log;
    let changed = false;
    for (const k of specs) {
      const v = await window.KV.get(k);
      if (v != null) {
        if (k === KEYS.parts) { Object.keys(parts).forEach((x) => delete parts[x]); Object.assign(parts, v); }
        else if (k === KEYS.equipment) { if (v && Object.keys(v).length) { Object.keys(equipment).forEach((x) => delete equipment[x]); Object.assign(equipment, v); } else { window.KV.set(k, equipment).catch(() => {}); } }
        else if (k === KEYS.items) { items.length = 0; v.forEach((x) => items.push(x)); }
        else if (k === KEYS.vendors) { vendors.length = 0; v.forEach((x) => vendors.push(x)); }
        else if (k === KEYS.log) { log.length = 0; v.forEach((x) => log.push(x)); }
        changed = true;
      } else {
        // nothing in IDB yet — migrate whatever we loaded synchronously (localStorage/defaults)
        window.KV.set(k, liveFor(k)).catch(() => {});
        try { localStorage.removeItem(k); } catch (e) {}
      }
    }
    if (migrateEquip()) { save(KEYS.items, items); changed = true; }
    markEquipMigrated();
    if (changed) emit();
  })();
})();
