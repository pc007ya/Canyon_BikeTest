/* Shared UI components. Exported to window for the app script. */
const { useState, useRef, useEffect } = React;

/* ---------- Icons (simple line SVGs) ---------- */
function Icon({ name, size = 20, stroke = 1.8 }) {
  const p = {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round",
  };
  const paths = {
    search: <><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
    x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    arrowLeft: <><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></>,
    chevronRight: <polyline points="9 18 15 12 9 6" />,
    globe: <><circle cx="12" cy="12" r="9" /><line x1="3" y1="12" x2="21" y2="12" /><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18" /></>,
    check: <polyline points="20 6 9 17 4 12" />,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></>,
    print: <><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></>,
    layers: <><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></>,
    bolt: <path d="M13 2 3 14h7l-1 8 10-12h-7z" />,
    ruler: <><path d="M3 8l13 13 5-5L8 3z" /><line x1="8" y1="8" x2="10" y2="10" /><line x1="11" y1="5" x2="14" y2="8" /><line x1="5" y1="11" x2="8" y2="14" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></>,
    cube: <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></>,
    clipboard: <><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" /><line x1="8" y1="11" x2="16" y2="11" /><line x1="8" y1="15" x2="13" y2="15" /></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    trash: <><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></>,
    pencil: <><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" /></>,
    arrowUp: <><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></>,
    arrowDown: <><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></>,
    cloud: <><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" /></>,
    bell: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
  };
  return <svg {...p} style={{ display: "block", flex: "none" }}>{paths[name]}</svg>;
}

/* ---------- Status badge ---------- */
function StatusBadge({ status, t }) {
  const ready = status === "ready";
  return (
    <span className={"status " + (ready ? "is-ready" : "is-draft")}>
      <span className="status-dot" />
      {ready ? t("statusReady") : t("statusDraft")}
    </span>
  );
}

/* ---------- Category chip / filter ---------- */
function FilterChips({ cats, active, onPick, t }) {
  return (
    <div className="chips" role="tablist">
      {cats.map((c) => (
        <button key={c.key} role="tab" aria-selected={active === c.key}
          className={"chip" + (active === c.key ? " is-active" : "")}
          onClick={() => onPick(c.key)}>
          {c.label}{c.count != null && <span className="chip-count">{c.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------- Test item card ---------- */
function ItemCard({ item, lang, t, onOpen }) {
  const L = (o) => (o && o[lang] != null ? o[lang] : o);
  return (
    <button className="card" onClick={() => onOpen(item.id)}>
      <div className="card-media">
        <img src={item.schematic} alt="" loading="lazy" />
        <span className="card-code">{item.code}</span>
      </div>
      <div className="card-body">
        <div className="card-top">
          <span className="card-cat">{L(item.category)}</span>
          <StatusBadge status={item.status} t={t} />
        </div>
        <h3 className="card-title">{L(item.name)}</h3>
        <div className="card-foot">
          <span className="mono-tag">{item.standard} <em>{item.clause}</em></span>
          <span className="card-fix"><Icon name="cube" size={14} />{item.fixtures.length} {t("fixturesUnit")}</span>
        </div>
      </div>
      <span className="card-go"><Icon name="chevronRight" size={18} /></span>
    </button>
  );
}

/* ---------- Param tile ---------- */
function ParamGrid({ params, lang }) {
  const L = (o) => (o && typeof o === "object" && !Array.isArray(o) ? (o[lang] != null ? o[lang] : o) : o);
  return (
    <div className="params">
      {params.map((p, i) => (
        <div className="param" key={i}>
          <div className="param-label">{L(p.label)}</div>
          <div className="param-value">{L(p.value)}{p.unit && <span className="param-unit">{p.unit}</span>}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Fixture table ---------- */
function FixtureTable({ fixtures, lang, t, onZoom }) {
  const L = (o) => (o && o[lang] != null ? o[lang] : o);
  const usage = React.useMemo(() => {
    const m = {};
    if (window.buildFixtureUsage) window.buildFixtureUsage().forEach((r) => { m[r.key] = r; });
    return m;
  }, []);
  return (
    <div className="ftable">
      <div className="ftable-head">
        <span>{t("colFixture")}</span>
        <span>{t("colPart")}</span>
        <span className="ta-c">{t("colQty")}</span>
        <span className="ta-r">{t("colTorque")}</span>
      </div>
      {fixtures.map((f, i) => {
        const st = usage[f.key];
        const warn = st && st.state.key !== "in";
        return (
        <div className="ftable-row" key={i}>
          <span className="fx-name">
            <button className="fx-thumb" onClick={() => onZoom(f.image, L(f.name))} aria-label="zoom">
              <img src={f.image} alt="" loading="lazy" />
            </button>
            <span>
              <span className="fx-title">{L(f.name)}</span>
              <span className="fx-subrow">
                <span className="fx-kind">{L(f.kind)}</span>
                {warn && <span className={"stockb sm stockb-" + st.state.key}><span className="stockb-dot" />{lang === "zh" ? st.state.zh : st.state.en}</span>}
              </span>
            </span>
          </span>
          <span className="fx-part mono">{f.code}</span>
          <span className="ta-c fx-qty">×{f.qty}</span>
          <span className="ta-r mono fx-torque">{f.torque || "—"}</span>
        </div>
        );
      })}
    </div>
  );
}

/* ---------- Step image: official (read-only) + optional per-vendor comparison photo ----------
   The shared/official image (item.steps[i].image) is never edited from here —
   only the admin's TestEditor can change it. A logged-in vendor may attach
   their OWN comparison photo alongside it, purely for their own reference;
   other vendors never see it, and it never overwrites the official image. */
function StepImage({ itemId, stepIndex, official, vendor, isAdmin, t, onZoom, alt }) {
  const vendorId = vendor && !isAdmin ? vendor.id : null;
  const [mine, setMine] = useState(() => window.STORE.stepphoto_get(vendorId, itemId, stepIndex));
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    setMine(window.STORE.stepphoto_get(vendorId, itemId, stepIndex));
    const h = () => setMine(window.STORE.stepphoto_get(vendorId, itemId, stepIndex));
    window.addEventListener("bff:stepphotochange", h);
    return () => window.removeEventListener("bff:stepphotochange", h);
  }, [vendorId, itemId, stepIndex]);

  function load(file) {
    if (!file || !vendorId) return;
    setBusy(true); setErr("");
    window.bffResizeImage(file, 1280, 0.72)
      .then((src) => { window.STORE.stepphoto_set(vendorId, itemId, stepIndex, src); setMine(src); setBusy(false); })
      .catch(() => { setBusy(false); setErr(t("uploadFailed")); });
  }
  function remove(e) {
    e.stopPropagation();
    window.STORE.stepphoto_remove(vendorId, itemId, stepIndex);
    setMine(null);
  }

  const showCompare = !!vendorId; // only a logged-in vendor gets the second slot
  return (
    <div className={"stepimg-row" + (showCompare ? " has-compare" : "")}>
      <div className="stepimg stepimg-official">
        <img src={official} alt={alt || ""} onClick={() => onZoom(official, alt)} />
        {showCompare && <span className="stepimg-label">{t("officialPhoto")}</span>}
      </div>
      {showCompare &&
      <div
        className={"stepimg stepimg-yours" + (drag ? " is-drag" : "") + (mine ? "" : " is-empty")}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); load(e.dataTransfer.files[0]); }}
      >
        {mine
          ? <img src={mine} alt={alt || ""} onClick={() => onZoom(mine, alt)} />
          : <div className="stepimg-placeholder" onClick={() => fileRef.current.click()}>
              <Icon name="upload" size={20} />
              <span>{t("addYourPhoto")}</span>
            </div>}
        <span className="stepimg-label stepimg-label-yours">{t("yourPhoto")}</span>
        <div className="stepimg-tools">
          <button className="mini-btn" disabled={busy} onClick={() => fileRef.current.click()}>
            <Icon name="upload" size={13} />{mine ? t("replace") : t("uploadPhoto")}
          </button>
          {mine && <button className="mini-btn ghost" onClick={remove}>{t("revert")}</button>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden
          onChange={(e) => { load(e.target.files[0]); e.target.value = ""; }} />
        {drag && <div className="drop-veil"><Icon name="upload" size={22} />{t("dropHere")}</div>}
        {err && <div className="stepimg-err">{err}</div>}
      </div>}
    </div>
  );
}

/* ---------- Lightbox ---------- */
function Lightbox({ img, onClose }) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  if (!img) return null;
  return (
    <div className="lightbox" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose}><Icon name="x" size={22} /></button>
      <figure onClick={(e) => e.stopPropagation()}>
        <img src={img.src} alt={img.cap || ""} />
        {img.cap && <figcaption>{img.cap}</figcaption>}
      </figure>
    </div>
  );
}

Object.assign(window, { Icon, StatusBadge, FilterChips, ItemCard, ParamGrid, FixtureTable, StepImage, Lightbox });
