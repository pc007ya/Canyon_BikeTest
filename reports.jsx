/* Supplier test-report submission (block 05).
   Vendors record result + measured data + photos per test; saved locally and
   synced to the cloud (collection bff_report/<vendorId>). Admins see every
   vendor's submission read-only.
   Photos are downscaled to keep each vendor doc within Firestore's ~1MB limit. */
const { useState: rpState, useEffect: rpEffect, useRef: rpRef } = React;

/* ---- storage (per vendor, persisted) ----
   Reports carry photos (base64 data-URIs) which quickly blow past
   localStorage's ~5MB per-origin cap → QuotaExceededError → "空間不足".
   So we store in IndexedDB (window.KV, hundreds of MB) exactly like the main
   store: an in-memory cache serves synchronous reads (render), writes go
   through to IDB, and legacy localStorage docs are migrated on boot. */
function reportKeyFor(vendorId) { return "bff:report:" + (vendorId || "anon"); }
const _rptCache = {};              // vendorId -> report map (authoritative in memory)
const _rptUseIDB = !!(window.KV && window.KV.available);
function _rptLoadLS(vid) {
  try { return JSON.parse(localStorage.getItem(reportKeyFor(vid)) || "{}"); } catch (e) { return {}; }
}
function _rptSaveLS(vid, obj) {
  try { localStorage.setItem(reportKeyFor(vid), JSON.stringify(obj)); }
  catch (e) { try { window.dispatchEvent(new CustomEvent("bff:saveerror", { detail: { key: reportKeyFor(vid), error: String(e && e.name || e) } })); } catch (e2) {} }
}
function loadReports(vendorId) {
  const vid = vendorId || "anon";
  if (_rptCache[vid]) return _rptCache[vid];
  const v = _rptLoadLS(vid);       // sync fallback until IDB hydrates
  _rptCache[vid] = v;
  return v;
}
function saveReports(vendorId, obj) {
  const vid = vendorId || "anon";
  _rptCache[vid] = obj;
  if (_rptUseIDB) {
    window.KV.set(reportKeyFor(vid), obj).catch(() => _rptSaveLS(vid, obj));
    try { localStorage.removeItem(reportKeyFor(vid)); } catch (e) {}
  } else { _rptSaveLS(vid, obj); }
}
/* async: hydrate every vendor's reports from IDB (authoritative) and migrate
   any legacy localStorage report docs into IDB, then refresh the UI. */
(async function hydrateReports() {
  if (!_rptUseIDB) return;
  try {
    const ks = (window.KV.keys ? await window.KV.keys() : []) || [];
    for (const k of ks) {
      if (k.indexOf("bff:report:") === 0) {
        const v = await window.KV.get(k);
        if (v) _rptCache[k.slice("bff:report:".length)] = v;
      }
    }
    for (let i = 0; i < localStorage.length; i++) {   // migrate legacy LS → IDB
      const k = localStorage.key(i);
      if (k && k.indexOf("bff:report:") === 0) {
        const vid = k.slice("bff:report:".length);
        if (!_rptCache[vid]) {
          const v = _rptLoadLS(vid);
          if (v && Object.keys(v).length) { _rptCache[vid] = v; window.KV.set(k, v).catch(() => {}); }
        }
      }
    }
    window.dispatchEvent(new CustomEvent("bff:reportchange"));
  } catch (e) {}
})();

/* Accessors for cloud.js so report sync reads/writes the IDB-backed source
   (not the now-emptied localStorage). Upload reads bffReportGet; a remote pull
   applies via bffReportPut (persists to cache + IDB). */
window.bffReportGet = function (vendorId) { return loadReports(vendorId); };
window.bffReportPut = function (vendorId, map) { saveReports(vendorId, map || {}); };
function getReport(vendorId, testId) { return loadReports(vendorId)[testId]; }
function setReport(vendorId, testId, report) {
  const all = loadReports(vendorId);
  if (report == null) delete all[testId];
  else all[testId] = report;
  saveReports(vendorId, all);
  window.dispatchEvent(new CustomEvent("bff:reportchange"));
}

/* every vendor's reports, flattened & time-sorted (for the admin view) */
function collectReports(lang) {
  const vendors = (window.STORE && window.STORE.vendors_list && window.STORE.vendors_list())
    || (window.AUTH && window.AUTH.VENDORS) || [];
  const L = (o) => (o && o[lang] != null ? o[lang] : (o && o.en) || o);
  const out = [];
  vendors.forEach((v) => {
    const map = loadReports(v.id);
    Object.keys(map).forEach((testId) => {
      const r = map[testId];
      if (!r || !r.at) return;
      out.push(Object.assign({ vendorId: v.id, vendor: L(v.name), testId }, r));
    });
  });
  out.sort((a, b) => b.at - a.at);
  return out;
}

const REPORT_MAX_PHOTOS = 6;

function fmtReportStamp(ts, lang) {
  if (!ts) return "";
  try { return new Date(ts).toLocaleString(lang === "zh" ? "zh-TW" : "en-US", { dateStyle: "medium", timeStyle: "short" }); }
  catch (e) { return ""; }
}

/* ================= Report panel ================= */
function ReportPanel({ item, lang, t, vendor, admin, onZoom }) {
  const L = (o) => (o && o[lang] != null ? o[lang] : o);
  if (admin) return <AdminReportView item={item} lang={lang} t={t} onZoom={onZoom} />;

  const vid = vendor ? vendor.id : "anon";
  const existing = getReport(vid, item.id) || {};
  const [result, setResult] = rpState(existing.result || "");
  const [values, setValues] = rpState(existing.values || "");
  const [note, setNote] = rpState(existing.note || "");
  const [photos, setPhotos] = rpState(existing.photos || []);
  const [busy, setBusy] = rpState(false);
  const [saved, setSaved] = rpState(false);
  const [uploadErr, setUploadErr] = rpState("");
  const fileRef = rpRef(null);

  rpEffect(() => { // re-hydrate when switching test
    const e = getReport(vid, item.id) || {};
    setResult(e.result || ""); setValues(e.values || ""); setNote(e.note || ""); setPhotos(e.photos || []);
    setSaved(false);
  }, [item.id, vid]);

  function dirty() { setSaved(false); }

  async function onFiles(list) {
    const files = Array.from(list || []).filter((f) => /^image\//.test(f.type));
    if (!files.length) return;
    setBusy(true);
    setUploadErr("");
    const room = REPORT_MAX_PHOTOS - photos.length;
    const next = photos.slice();
    let failed = 0;
    for (const f of files.slice(0, room)) {
      try {
        const path = "vendors/" + (vid || "anon") + "/reports/" + item.id + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7) + ".jpg";
        next.push(await window.bffUploadImage(f, 1280, 0.7, path));
      }
      catch (e) { failed++; }
    }
    setPhotos(next); setBusy(false); dirty();
    if (failed) {
      setUploadErr(lang === "zh"
        ? `${failed} 張照片上傳失敗（檔案不是圖片，或超過 20MB）`
        : `${failed} photo(s) failed to upload (not an image, or over 20MB)`);
    }
  }
  function removePhoto(i) {
    const gone = photos[i];
    // clean up the orphaned Storage object (only for uploaded https URLs;
    // data-URIs live inline and need no cleanup). Best-effort, non-blocking.
    if (typeof gone === "string" && /^https?:/.test(gone) && window.bffDeleteStorage) { window.bffDeleteStorage(gone); }
    setPhotos(photos.filter((_, j) => j !== i)); dirty();
  }

  function submit() {
    const report = {
      result, values: values.trim(), note: note.trim(), photos,
      by: vendor ? vendor.name : { zh: "—", en: "—" }, at: Date.now(),
    };
    setReport(vid, item.id, report);
    setSaved(true);
  }
  function clearReport() {
    setReport(vid, item.id, null);
    setResult(""); setValues(""); setNote(""); setPhotos([]); setSaved(false);
  }

  const hasContent = !!(values.trim() || note.trim() || photos.length);
  const canSubmit = !!result;

  return (
    <div className="report">
      <p className="report-hint"><Icon name="upload" size={14} />{t("reportHint")}</p>

      <div className="report-field">
        <label className="report-lab">{t("reportResult")}</label>
        <div className="report-result">
          <button type="button" className={"rr-btn pass" + (result === "pass" ? " on" : "")} onClick={() => { setResult("pass"); dirty(); }}>
            <Icon name="check" size={16} />{t("reportPass")}
          </button>
          <button type="button" className={"rr-btn fail" + (result === "fail" ? " on" : "")} onClick={() => { setResult("fail"); dirty(); }}>
            <Icon name="x" size={16} />{t("reportFail")}
          </button>
        </div>
      </div>

      <div className="report-field">
        <label className="report-lab">{t("reportValues")}</label>
        <textarea className="report-ta" rows={3} value={values} placeholder={t("reportValuesPh")}
          onChange={(e) => { setValues(e.target.value); dirty(); }} />
      </div>

      <div className="report-field">
        <label className="report-lab">{t("reportNote")}</label>
        <textarea className="report-ta" rows={2} value={note} placeholder={t("reportNotePh")}
          onChange={(e) => { setNote(e.target.value); dirty(); }} />
      </div>

      <div className="report-field">
        <label className="report-lab">{t("reportPhotos")} <span className="report-sub">· {t("reportPhotoLimit")}</span></label>
        <div className="report-photos">
          {photos.map((src, i) => (
            <div className="rp-thumb" key={i}>
              <button type="button" className="rp-img" onClick={() => onZoom && onZoom(src, L(item.name))}>
                <img src={src} alt={"photo " + (i + 1)} />
              </button>
              <button type="button" className="rp-del" onClick={() => removePhoto(i)} aria-label="remove"><Icon name="x" size={13} /></button>
            </div>
          ))}
          {photos.length < REPORT_MAX_PHOTOS && (
            <button type="button" className="rp-add" onClick={() => fileRef.current && fileRef.current.click()} disabled={busy}>
              <Icon name={busy ? "clock" : "image"} size={20} />
              <span>{busy ? "…" : t("reportAddPhoto")}</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" multiple hidden
            onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
        </div>
        {uploadErr && <div className="login-err" style={{ marginTop: 8 }}><Icon name="x" size={13} />{uploadErr}</div>}
      </div>

      <div className="report-actions">
        <button type="button" className="btn" disabled={!canSubmit} onClick={submit}>
          <Icon name="check" size={16} />{t("reportSubmit")}
        </button>
        {!result && hasContent && (
          <span className="report-warn"><Icon name="bell" size={13} />{t("reportNeedResult")}</span>
        )}
        {(existing.at) && (
          <button type="button" className="btn ghost" onClick={clearReport}>
            <Icon name="trash" size={15} />{t("reportClear")}
          </button>
        )}
        {saved && <span className="report-ok"><Icon name="check" size={14} />{t("reportSaved")}</span>}
        {existing.at && !saved && <span className="report-stamp">{t("reportAt")}: {fmtReportStamp(existing.at, lang)}</span>}
      </div>
    </div>
  );
}

/* admin: read-only list of every vendor's report for this test */
function AdminReportView({ item, lang, t, onZoom }) {
  const L = (o) => (o && o[lang] != null ? o[lang] : o);
  const [, bump] = rpState(0);
  rpEffect(() => {
    const h = () => bump((n) => n + 1);
    window.addEventListener("bff:reportchange", h);
    return () => window.removeEventListener("bff:reportchange", h);
  }, []);

  const rows = collectReports(lang).filter((r) => r.testId === item.id);
  if (!rows.length) {
    return <div className="passcrit empty"><Icon name="clipboard" size={20} />{t("reportEmpty")}</div>;
  }
  return (
    <div className="report-admin">
      {rows.map((r) => (
        <div className="ra-card" key={r.vendorId}>
          <div className="ra-head">
            <span className="ra-vendor">{r.vendor}</span>
            {r.result && (
              <span className={"ra-result " + r.result}>
                <Icon name={r.result === "pass" ? "check" : "x"} size={13} />
                {r.result === "pass" ? t("reportPass") : t("reportFail")}
              </span>
            )}
            <span className="ra-at">{fmtReportStamp(r.at, lang)}</span>
          </div>
          {r.values && <div className="ra-row"><span className="ra-k">{t("reportValues")}</span><span className="ra-v">{r.values}</span></div>}
          {r.note && <div className="ra-row"><span className="ra-k">{t("reportNote")}</span><span className="ra-v">{r.note}</span></div>}
          {r.photos && r.photos.length > 0 && (
            <div className="ra-photos">
              {r.photos.map((src, i) => (
                <button type="button" className="ra-thumb" key={i} onClick={() => onZoom && onZoom(src, r.vendor)}>
                  <img src={src} alt={"photo " + (i + 1)} />
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { ReportPanel, loadReports, collectReports, reportKeyFor });

/* ================= Test results matrix (admin) =================
   Rows = tests, columns = vendors, cells = pass/fail traffic-light + date. */
function ResultsMatrix({ lang, t, onOpenTest, onZoom }) {
  const L = (o) => (o && o[lang] != null ? o[lang] : o);
  const [, bump] = rpState(0);
  rpEffect(() => {
    window.scrollTo(0, 0);
    const h = () => bump((n) => n + 1);
    window.addEventListener("bff:reportchange", h);
    window.addEventListener("bff:datachange", h);
    return () => { window.removeEventListener("bff:reportchange", h); window.removeEventListener("bff:datachange", h); };
  }, []);

  const tests = (window.STORE && window.STORE.items_list && window.STORE.items_list()) || (window.DATA && window.DATA.ITEMS) || [];
  const vendors = (window.STORE && window.STORE.vendors_list && window.STORE.vendors_list()) || (window.AUTH && window.AUTH.VENDORS) || [];

  // ---- filters ----
  const [fStatus, setFStatus] = rpState("all");   // all | ready | draft
  const [fVendor, setFVendor] = rpState("all");   // all | <vendorId>
  // ---- test-code gate: when codes exist, pick one (or 全部) before the matrix shows ----
  const codes = (window.STORE.testcodes_list && window.STORE.testcodes_list()) || [];
  const [fCode, setFCode] = rpState("");          // "" = not chosen yet | "all" | <codeId>
  const codeRec = fCode && fCode !== "all" ? codes.find((c) => c.id === fCode) : null;
  const gateOpen = codes.length === 0 || !!fCode;
  const codeVendors = codeRec && (codeRec.vendorIds || []).length ? vendors.filter((v) => codeRec.vendorIds.indexOf(v.id) >= 0) : vendors;
  const shownVendors = (fVendor === "all" ? codeVendors : codeVendors.filter((v) => v.id === fVendor));

  // index reports: vendorId -> { testId -> report }
  const byVendor = {};
  vendors.forEach((v) => { byVendor[v.id] = loadReports(v.id); });

  function cellFor(vId, tId) {
    const r = byVendor[vId] && byVendor[vId][tId];
    if (!r || !r.at) return { state: "none" };
    return { state: r.result === "pass" ? "pass" : r.result === "fail" ? "fail" : "sub", at: r.at, r };
  }
  function dstr(ts) {
    try { return new Date(ts).toLocaleDateString(lang === "zh" ? "zh-TW" : "en-US", { month: "2-digit", day: "2-digit" }); }
    catch (e) { return ""; }
  }

  const reportedCount = (tId) => shownVendors.reduce((n, v) => n + (cellFor(v.id, tId).state !== "none" ? 1 : 0), 0);

  // apply status + test-code filters to the row list
  const rows = tests.filter((it) => {
    if (fStatus !== "all" && (it.status || "draft") !== fStatus) return false;
    if (codeRec && (codeRec.itemIds || []).indexOf(it.id) < 0) return false;
    return true;
  });

  // ---- CSV export ----
  function stateLabel(s) {
    return s === "pass" ? t("resultsPass") : s === "fail" ? t("resultsFail") : s === "sub" ? t("resultsSubmitted") : t("resultsPending");
  }
  function exportCSV() {
    const esc = (c) => { let s = String(c == null ? "" : c); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const header = [t("resultsTest"), lang === "zh" ? "代號" : "Code", lang === "zh" ? "狀態" : "Status"];
    shownVendors.forEach((v) => { header.push(L(v.name)); header.push(L(v.name) + " " + (lang === "zh" ? "日期" : "date")); });
    const lines = [header];
    rows.forEach((it) => {
      const row = [L(it.name), it.code, it.status === "ready" ? t("statusReady") : t("statusDraft")];
      shownVendors.forEach((v) => {
        const c = cellFor(v.id, it.id);
        row.push(stateLabel(c.state));
        row.push(c.at ? new Date(c.at).toLocaleDateString(lang === "zh" ? "zh-TW" : "en-US") : "");
      });
      lines.push(row);
    });
    const csv = "\uFEFF" + lines.map((r) => r.map(esc).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "test-results-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="results">
      <header className="results-head">
        <div>
          <h1 className="results-h1"><Icon name="grid" size={20} />{t("resultsTitle")}</h1>
          <p className="results-sub">{t("resultsHint")}</p>
        </div>
        <div className="results-legend">
          <span className="rl-item"><span className="light pass" />{t("resultsPass")}</span>
          <span className="rl-item"><span className="light fail" />{t("resultsFail")}</span>
          <span className="rl-item"><span className="light sub" />{t("resultsSubmitted")}</span>
          <span className="rl-item"><span className="light none" />{t("resultsPending")}</span>
        </div>
      </header>

      <div className="results-filters">
        {codes.length > 0 &&
        <label className="rf-group"><span className="rf-lab">{lang === "zh" ? "產品代號" : "Product code"}</span>
          <select className="inp rf-sel" value={fCode} onChange={(e) => setFCode(e.target.value)}>
            <option value="" disabled>{lang === "zh" ? "請先選擇…" : "Select…"}</option>
            <option value="all">{t("resultsAll")}</option>
            {codes.map((c) => <option key={c.id} value={c.id}>{c.code}{c.name ? " · " + c.name : ""}{c.standard && typeof c.standard === "string" ? " · " + c.standard : ""}</option>)}
          </select>
        </label>}
        <label className="rf-group"><span className="rf-lab">{t("resultsFilterStatus")}</span>
          <select className="inp rf-sel" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option value="all">{t("resultsAll")}</option>
            <option value="ready">{t("statusReady")}</option>
            <option value="draft">{t("statusDraft")}</option>
          </select>
        </label>
        <label className="rf-group"><span className="rf-lab">{t("resultsFilterVendor")}</span>
          <select className="inp rf-sel" value={fVendor} onChange={(e) => setFVendor(e.target.value)}>
            <option value="all">{t("resultsAll")}</option>
            {vendors.map((v) => <option key={v.id} value={v.id}>{L(v.name)}</option>)}
          </select>
        </label>
        <span className="rf-count mono">{rows.length} / {tests.length}</span>
        <button className="btn sm rf-export" onClick={exportCSV}><Icon name="download" size={15} />{t("resultsExport")}</button>
      </div>

      {!gateOpen ? (
        <div className="passcrit empty"><Icon name="grid" size={20} />{lang === "zh" ? "請先於上方選定產品代號，再呈現對應的測試結果。" : "Select a product code above to display its results."}</div>
      ) : vendors.length === 0 ? (
        <div className="passcrit empty"><Icon name="clipboard" size={20} />{t("resultsNoVendors")}</div>
      ) : (
        <div className="matrix-wrap">
          <table className="matrix">
            <thead>
              <tr>
                <th className="mx-corner">{t("resultsTest")}</th>
                {shownVendors.map((v) => (
                  <th key={v.id} className="mx-vendor"><span>{L(v.name)}</span></th>
                ))}
                <th className="mx-sum">{t("resultsSummary")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((it) => (
                <tr key={it.id}>
                  <th className="mx-test" onClick={() => onOpenTest && onOpenTest(it.id)} title={L(it.name)}>
                    <span className="mx-code mono">{it.code}</span>
                    <span className="mx-name">{L(it.name)}</span>
                  </th>
                  {shownVendors.map((v) => {
                    const c = cellFor(v.id, it.id);
                    return (
                      <td key={v.id} className={"mx-cell " + c.state}
                        title={(L(v.name)) + " · " + (c.state === "pass" ? t("resultsPass") : c.state === "fail" ? t("resultsFail") : c.state === "sub" ? t("resultsSubmitted") : t("resultsPending")) + (c.at ? " · " + dstr(c.at) : "")}
                        onClick={() => onOpenTest && onOpenTest(it.id)}>
                        <span className={"light " + c.state} />
                        {c.at && <span className="mx-date">{dstr(c.at)}</span>}
                      </td>
                    );
                  })}
                  <td className="mx-sumcell mono">{reportedCount(it.id)}/{shownVendors.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <div className="mx-nomatch">{t("resultsNoMatch")}</div>}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { ResultsMatrix });
