/* Fixture overview (reverse lookup) + inventory status + BOM export. */
const { useState: fState, useMemo: fMemo, useEffect: fEffect, useRef: fRef } = React;

/* stock vs required → status */
function stockState(stock, required) {
  if (stock <= 0) return { key: "out", zh: "欠缺", en: "Short" };
  if (stock < required) return { key: "low", zh: "不足", en: "Low" };
  return { key: "in", zh: "充足", en: "In stock" };
}

/* ---- live stock overrides (vendor stock-take), per-vendor, persisted ---- */
function stockKeyFor() {
  const v = window.AUTH && window.AUTH.get();
  return "bff:stock:" + (v ? v.id : "anon");
}
function loadStock() { try { return JSON.parse(localStorage.getItem(stockKeyFor()) || "{}"); } catch (e) { return {}; } }
function saveStock(obj) { try { localStorage.setItem(stockKeyFor(), JSON.stringify(obj)); } catch (e) {} }
function getEntry(key) { return loadStock()[key]; }            // { qty, by:{zh,en}, at } | undefined
function getStock(key, fallback) { const e = getEntry(key); return e && e.qty != null ? e.qty : fallback; }
function isOverridden(key) { return !!getEntry(key); }
function setStock(key, val) {
  const s = loadStock();
  const v = window.AUTH && window.AUTH.get();
  if (val === "" || val == null || isNaN(val)) delete s[key];
  else s[key] = { qty: Math.max(0, Math.round(+val)), by: v ? v.name : { zh: "—", en: "—" }, at: Date.now() };
  saveStock(s);
  window.dispatchEvent(new CustomEvent("bff:stockchange"));
}
function resetStock() { saveStock({}); window.dispatchEvent(new CustomEvent("bff:stockchange")); }

function fmtStamp(ts, lang) {
  if (!ts) return "";
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* part key -> { part, uses, totalQty/required, stock, shortage, state, overridden, by, at } */
function buildFixtureUsage() {
  const PARTS = window.DATA.PARTS;
  const map = new Map();
  Object.entries(PARTS).forEach(([key, part]) => {
    map.set(key, { key, part, uses: [], totalQty: 0 });
  });
  window.DATA.ITEMS.forEach((item) => {
    item.fixtures.forEach((f) => {
      const rec = map.get(f.key);
      if (!rec) return;
      rec.uses.push({ item, qty: f.qty, torque: f.torque });
      rec.totalQty += f.qty;
    });
  });
  const out = [...map.values()];
  out.forEach((r) => {
    const e = getEntry(r.key);
    r.required = r.totalQty;
    r.defaultStock = r.part.stock != null ? r.part.stock : 0;
    r.stock = e && e.qty != null ? e.qty : r.defaultStock;
    r.overridden = !!e;
    r.by = e ? e.by : null;
    r.at = e ? e.at : null;
    r.shortage = Math.max(0, r.required - r.stock);
    r.state = stockState(r.stock, r.required);
    r.updatedAt = r.part.updatedAt || null;
    r.needsRecount = !!r.updatedAt && (!r.at || r.at < r.updatedAt);
  });
  const order = { out: 0, low: 1, in: 2 };
  return out.sort((a, b) => order[a.state.key] - order[b.state.key] || b.shortage - a.shortage || b.uses.length - a.uses.length);
}

/* ---------- BOM CSV export ---------- */
function exportBOM(lang) {
  const rows = buildFixtureUsage();
  const head = lang === "zh"
    ? ["編號", "名稱", "類別", "使用測試數", "需求總量", "現有庫存", "短缺", "狀態", "儲位", "盤點人", "盤點時間"]
    : ["Part No.", "Name", "Kind", "Used in", "Required", "In stock", "Shortage", "Status", "Location", "Counted by", "Counted at"];
  const lines = [head];
  rows.forEach((r) => lines.push([
    r.part.code, r.part.name[lang], r.part.kind[lang], r.uses.length,
    r.required, r.stock, r.shortage, r.state[lang], r.part.loc || "",
    r.by ? r.by[lang] : "", r.at ? fmtStamp(r.at, lang) : "",
  ]));
  const csv = lines.map((row) => row.map((c) => {
    let s = String(c); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "fixture-BOM-" + new Date().toISOString().slice(0, 10) + ".csv";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function StockBadge({ state, lang, small }) {
  return (
    <span className={"stockb stockb-" + state.key + (small ? " sm" : "")}>
      <span className="stockb-dot" />{lang === "zh" ? state.zh : state.en}
    </span>
  );
}

/* ---------- Overview grid ---------- */
function FixturesOverview({ lang, t, onOpenFixture, onOpenTest }) {
  const [q, setQ] = fState("");
  const [filter, setFilter] = fState("all"); // all | short
  const L = (o) => (o && o[lang] != null ? o[lang] : o);
  const all = buildFixtureUsage();

  const counts = fMemo(() => {
    const c = { in: 0, low: 0, out: 0, shortItems: 0, shortPcs: 0 };
    all.forEach((r) => { c[r.state.key]++; if (r.shortage > 0) { c.shortItems++; c.shortPcs += r.shortage; } });
    return c;
  }, [all]);

  const results = fMemo(() => {
    const n = q.trim().toLowerCase();
    return all.filter((r) => {
      if (filter === "short" && r.shortage <= 0) return false;
      if (!n) return true;
      return (r.part.name.zh + " " + r.part.name.en + " " + r.part.code + " " + r.key).toLowerCase().includes(n);
    });
  }, [q, filter, all]);

  return (
    <div className="home">
      <section className="hero hero-sm">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-inner">
          <div className="hero-kicker"><span className="kick-dot" />{lang === "zh" ? "反查 · 制具用於哪些測試 · 庫存狀態" : "Reverse lookup · usage & inventory"}</div>
          <h1 className="hero-title">{lang === "zh" ? "制具總覽" : "Fixture library"}</h1>
          <div className="fx-actionbar">
            <div className="searchbar">
              <Icon name="search" size={20} />
              <input value={q} onChange={(e) => setQ(e.target.value)}
                placeholder={lang === "zh" ? "搜尋制具名稱或編號…" : "Search fixture name or part no.…"}
                aria-label="search fixtures" />
              {q && <button className="search-clear" onClick={() => setQ("")}><Icon name="x" size={16} /></button>}
            </div>
            <button className="btn bom-btn" onClick={() => exportBOM(lang)}>
              <Icon name="download" size={16} />{lang === "zh" ? "匯出 BOM" : "Export BOM"}
            </button>
          </div>
          <div className="invsum">
            <span className="invsum-item"><b>{all.length}</b>{lang === "zh" ? "項制具" : "fixtures"}</span>
            <span className="invsum-item invsum-out"><span className="stockb-dot" /><b>{counts.out}</b>{lang === "zh" ? "欠缺" : "short"}</span>
            <span className="invsum-item invsum-low"><span className="stockb-dot" /><b>{counts.low}</b>{lang === "zh" ? "不足" : "low"}</span>
            <span className="invsum-item invsum-in"><span className="stockb-dot" /><b>{counts.in}</b>{lang === "zh" ? "充足" : "ok"}</span>
            {counts.shortPcs > 0 && <span className="invsum-gap" />}
            {counts.shortPcs > 0 && <span className="invsum-item invsum-need">{lang === "zh" ? "待補" : "to order"} <b>{counts.shortPcs}</b> pcs</span>}
          </div>
        </div>
      </section>

      <section className="list-section">
        <div className="list-toolbar">
          <div className="chips">
            <button className={"chip" + (filter === "all" ? " is-active" : "")} onClick={() => setFilter("all")}>
              {lang === "zh" ? "全部" : "All"}<span className="chip-count">{all.length}</span>
            </button>
            <button className={"chip chip-warn" + (filter === "short" ? " is-active" : "")} onClick={() => setFilter("short")}>
              {lang === "zh" ? "僅缺料" : "Shortages"}<span className="chip-count">{counts.shortItems}</span>
            </button>
          </div>
          <span className="result-count"><strong>{results.length}</strong> {lang === "zh" ? "項制具" : (results.length === 1 ? "fixture" : "fixtures")}</span>
        </div>

        {results.length === 0 ? (
          <div className="empty">
            <Icon name="cube" size={30} />
            <p className="empty-title">{lang === "zh" ? "沒有符合的制具" : "No matching fixtures"}</p>
            <button className="btn" onClick={() => { setQ(""); setFilter("all"); }}>{t("clear")}</button>
          </div>
        ) : (
          <div className="fx-grid">
            {results.map((r) => (
              <button key={r.key} className={"fxc fxc-" + r.state.key} onClick={() => onOpenFixture(r.key)}>
                <span className="fxc-media">
                  <img src={r.part.image} alt="" loading="lazy" />
                  <StockBadge state={r.state} lang={lang} small />
                </span>
                <span className="fxc-body">
                  <span className="fxc-kind">{L(r.part.kind)}</span>
                  <span className="fxc-name">{L(r.part.name)}</span>
                  <span className="fxc-coderow">
                    <span className="fxc-code mono">{r.part.code}</span>
                    {r.overridden && <span className="counted-tag">{lang === "zh" ? "已盤點" : "Counted"}</span>}
                  </span>
                  <span className="fxc-inv">
                    <span className="fxc-inv-cell"><span className="fxc-inv-k">{lang === "zh" ? "庫存" : "Stock"}</span><span className="fxc-inv-v mono">{r.stock}</span></span>
                    <span className="fxc-inv-cell"><span className="fxc-inv-k">{lang === "zh" ? "需求" : "Need"}</span><span className="fxc-inv-v mono">{r.required}</span></span>
                    {r.shortage > 0
                      ? <span className="fxc-inv-cell short"><span className="fxc-inv-k">{lang === "zh" ? "短缺" : "Short"}</span><span className="fxc-inv-v mono">−{r.shortage}</span></span>
                      : <span className="fxc-inv-cell ok"><span className="fxc-inv-k">{lang === "zh" ? "測試" : "Tests"}</span><span className="fxc-inv-v mono">{r.uses.length}</span></span>}
                  </span>
                  <span className="fxc-tests">
                    {r.uses.slice(0, 5).map((u, i) => <span key={i} className="fxc-chip mono">{u.item.code}</span>)}
                    {r.uses.length > 5 && <span className="fxc-chip mono more">+{r.uses.length - 5}</span>}
                  </span>
                </span>
                <span className="card-go"><Icon name="chevronRight" size={18} /></span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------- Fixture detail ---------- */
function FixtureDetail({ fxKey, lang, t, onBack, onOpenTest, onZoom }) {
  const L = (o) => (o && o[lang] != null ? o[lang] : o);
  const rec = buildFixtureUsage().find((r) => r.key === fxKey);
  fEffect(() => { window.scrollTo(0, 0); }, [fxKey]);
  if (!rec) return null;
  const part = rec.part;

  return (
    <div className="detail">
      <div className="detail-bar">
        <button className="back" onClick={onBack}><Icon name="arrowLeft" size={18} />{lang === "zh" ? "制具總覽" : "All fixtures"}</button>
        <button className="btn ghost no-print" onClick={() => exportBOM(lang)}><Icon name="download" size={16} />{lang === "zh" ? "匯出 BOM" : "Export BOM"}</button>
      </div>

      <header className="detail-head fxd-head">
        <div className="dh-left">
          <div className="dh-codes">
            <span className="dh-code">{part.code}</span>
            <span className="dh-cat">{L(part.kind)}</span>
            <StockBadge state={rec.state} lang={lang} />
          </div>
          <h1 className="dh-title">{L(part.name)}</h1>
          <div className="dh-meta">
            <span className="meta-pill"><span className="mp-k">{lang === "zh" ? "現有庫存" : "In stock"}</span><span className="mp-v mono">{rec.stock} pcs</span></span>
            <span className="meta-pill"><span className="mp-k">{lang === "zh" ? "需求總量" : "Total need"}</span><span className="mp-v mono">{rec.required} pcs</span></span>
            <span className={"meta-pill" + (rec.shortage > 0 ? " mp-short" : "")}><span className="mp-k">{lang === "zh" ? "短缺" : "Shortage"}</span><span className="mp-v mono">{rec.shortage > 0 ? "−" + rec.shortage : "0"} pcs</span></span>
            <span className="meta-pill"><span className="mp-k">{lang === "zh" ? "儲位" : "Location"}</span><span className="mp-v mono">{part.loc || "—"}</span></span>
            <span className="meta-pill"><span className="mp-k">{lang === "zh" ? "使用測試" : "Used in"}</span><span className="mp-v mono">{rec.uses.length} {lang === "zh" ? "項" : "tests"}</span></span>
            {L(part.vendor) && <span className="meta-pill"><span className="mp-k">{lang === "zh" ? "廠商" : "Vendor"}</span><span className="mp-v">{L(part.vendor)}</span></span>}
            {L(part.material) && <span className="meta-pill"><span className="mp-k">{lang === "zh" ? "材質" : "Material"}</span><span className="mp-v">{L(part.material)}</span></span>}
            {part.version && <span className="meta-pill"><span className="mp-k">{lang === "zh" ? "版本" : "Version"}</span><span className="mp-v mono">{part.version}</span></span>}
          </div>
          {rec.overridden && rec.at && (
            <div className="fxd-stamp"><Icon name="clipboard" size={13} />{lang === "zh" ? "最後盤點：" : "Last counted: "}<b>{rec.by ? L(rec.by) : "—"}</b> · {fmtStamp(rec.at, lang)}</div>
          )}
        </div>
        <figure className="dh-figure">
          <button className="dh-img fxd-img" onClick={() => onZoom(part.image, L(part.name))}>
            <img src={part.image} alt={L(part.name)} />
          </button>
          <figcaption><Icon name="cube" size={13} />{lang === "zh" ? "制具外觀" : "Fixture render"}</figcaption>
        </figure>
      </header>

      <section className="block">
        <h2 className="block-h"><span className="bh-num">01</span><span className="bh-title">{lang === "zh" ? "用於下列測試" : "Used in these tests"}</span>
          <span className="block-aside mono">{rec.uses.length} {lang === "zh" ? "項" : "tests"}</span>
        </h2>
        <div className="ftable">
          <div className="ftable-head usetable">
            <span>{lang === "zh" ? "測試項目" : "Test item"}</span>
            <span>{lang === "zh" ? "標準" : "Standard"}</span>
            <span className="ta-c">{t("colQty")}</span>
            <span className="ta-r">{t("colTorque")}</span>
          </div>
          {rec.uses.map((u, i) => (
            <button key={i} className="ftable-row usetable userow" onClick={() => onOpenTest(u.item.id)}>
              <span className="fx-name">
                <span className="use-code mono">{u.item.code}</span>
                <span className="use-meta">
                  <span className="fx-title">{L(u.item.name)}</span>
                  <span className="fx-kind">{L(u.item.category)}</span>
                </span>
              </span>
              <span className="fx-part mono">{u.item.standard} {u.item.clause}</span>
              <span className="ta-c fx-qty">×{u.qty}</span>
              <span className="ta-r mono fx-torque">{u.torque || "—"}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ---------- Stock entry: vendor-editable inventory table ---------- */
function StockEntry({ lang, t, goFixtures }) {
  const L = (o) => (o && o[lang] != null ? o[lang] : o);
  const zh = lang === "zh";
  const all = buildFixtureUsage().slice().sort((a, b) => (a.part.kind.en === b.part.kind.en ? 0 : a.part.kind.en === "Fixture assembly" ? -1 : 1));
  const [, force] = fState(0);
  const [done, setDone] = fState(false);
  const [q, setQ] = fState("");
  const [filter, setFilter] = fState("all"); // all | short | changed
  const [flashKey, setFlashKey] = fState(null);
  const rowRefs = fRef({});
  fEffect(() => {
    window.scrollTo(0, 0);
    let focusKey = null;
    try { focusKey = sessionStorage.getItem("bff:focusKey"); sessionStorage.removeItem("bff:focusKey"); } catch (e) {}
    if (focusKey && all.some((r) => r.key === focusKey)) {
      setQ(""); setFilter("all"); setFlashKey(focusKey);
      setTimeout(() => {
        const el = rowRefs.current[focusKey];
        if (el) el.scrollIntoView({ block: "center" });
      }, 60);
      setTimeout(() => setFlashKey(null), 2600);
    }
  }, []);

  const counts = { in: 0, low: 0, out: 0, counted: 0, shortPcs: 0, changed: 0 };
  all.forEach((r) => { counts[r.state.key]++; if (r.overridden) counts.counted++; if (r.shortage > 0) counts.shortPcs += r.shortage; if (r.needsRecount) counts.changed++; });

  const rows = fMemo(() => {
    const n = q.trim().toLowerCase();
    return all.filter((r) => {
      if (filter === "short" && r.shortage <= 0) return false;
      if (filter === "changed" && !r.needsRecount) return false;
      if (!n) return true;
      return (r.part.name.zh + " " + r.part.name.en + " " + r.part.code + " " + r.key).toLowerCase().includes(n);
    });
  }, [q, filter, all]);

  function change(key, raw) {
    setStock(key, raw === "" ? null : raw);
    force((n) => n + 1);
  }
  function reset() { resetStock(); force((n) => n + 1); }

  return (
    <div className="home">
      <section className="hero hero-sm">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-inner">
          <div className="hero-kicker"><span className="kick-dot" />{lang === "zh" ? "供應商填報 · 即時連動制具總覽" : "Vendor entry · live-linked to library"}</div>
          <h1 className="hero-title">{lang === "zh" ? "庫存盤點" : "Stock-take"}</h1>
          <p className="hero-hint">{lang === "zh" ? "請輸入各制具的實際庫存數量。系統會即時計算短缺並更新「制具總覽」與測試清單的庫存狀態。" : "Enter the on-hand quantity for each fixture. Shortages and the library status update live."}</p>
          <div className="searchbar se-search">
            <Icon name="search" size={18} />
            <input value={q} onChange={(e) => setQ(e.target.value)}
              placeholder={lang === "zh" ? "搜尋制具名稱或編號…" : "Search fixture name or code…"}
              aria-label="search fixtures" />
            {q && <button className="search-clear" onClick={() => setQ("")}><Icon name="x" size={15} /></button>}
          </div>
          <div className="chips">
            <button className={"chip" + (filter === "all" ? " is-active" : "")} onClick={() => setFilter("all")}>{lang === "zh" ? "全部" : "All"}<span className="chip-count">{all.length}</span></button>
            <button className={"chip chip-warn" + (filter === "short" ? " is-active" : "")} onClick={() => setFilter("short")}>{lang === "zh" ? "僅缺料" : "Shortages"}<span className="chip-count">{counts.shortItems || counts.out + counts.low}</span></button>
            <button className={"chip chip-pink" + (filter === "changed" ? " is-active" : "")} onClick={() => setFilter("changed")}>{lang === "zh" ? "已異動" : "Changed"}<span className="chip-count">{counts.changed}</span></button>
          </div>
          <div className="se-actions">
            <button className="btn" onClick={goFixtures}><Icon name="cube" size={16} />{lang === "zh" ? "前往制具總覽" : "Open library"}</button>
            <button className="btn ghost" onClick={() => exportBOM(lang)}><Icon name="download" size={16} />{lang === "zh" ? "匯出 BOM" : "Export BOM"}</button>
            <button className="btn ghost se-reset" onClick={reset}>{lang === "zh" ? "重設為系統值" : "Reset to defaults"}</button>
          </div>
          <div className="invsum">
            <span className="invsum-item"><b>{counts.counted}</b>/{rows.length} {lang === "zh" ? "已盤點" : "counted"}</span>
            <span className="invsum-item invsum-out"><span className="stockb-dot" /><b>{counts.out}</b>{lang === "zh" ? "欠缺" : "short"}</span>
            <span className="invsum-item invsum-low"><span className="stockb-dot" /><b>{counts.low}</b>{lang === "zh" ? "不足" : "low"}</span>
            <span className="invsum-item invsum-in"><span className="stockb-dot" /><b>{counts.in}</b>{lang === "zh" ? "充足" : "ok"}</span>
            {counts.shortPcs > 0 && <span className="invsum-gap" />}
            {counts.shortPcs > 0 && <span className="invsum-item invsum-need">{lang === "zh" ? "待補" : "to order"} <b>{counts.shortPcs}</b> pcs</span>}
          </div>
        </div>
      </section>

      <section className="list-section">
        <div className="setable">
          <div className="setable-head">
            <span>{lang === "zh" ? "制具" : "Fixture"}</span>
            <span className="ta-c">{lang === "zh" ? "系統值" : "Default"}</span>
            <span className="ta-c">{lang === "zh" ? "需求" : "Need"}</span>
            <span className="ta-c se-inputcol">{lang === "zh" ? "實際庫存" : "On hand"}</span>
            <span className="ta-c">{lang === "zh" ? "短缺" : "Short"}</span>
            <span className="ta-r">{lang === "zh" ? "狀態" : "Status"}</span>
          </div>
          {rows.map((r) => (
            <div className={"setable-row se-" + r.state.key + (r.needsRecount ? " se-changed" : "") + (flashKey === r.key ? " se-flash" : "")} key={r.key}
              ref={(el) => { rowRefs.current[r.key] = el; }}>
              <span className="se-fx">
                <button className="fx-thumb" onClick={() => {}} aria-hidden="true" tabIndex={-1}>
                  <img src={r.part.image} alt="" loading="lazy" />
                </button>
                <span className="se-meta">
                  <span className="se-name">{L(r.part.name)}</span>
                  <span className="se-code mono">{r.part.code} · {lang === "zh" ? "儲位" : "Loc"} {r.part.loc || "—"}{r.part.version ? " · " + (lang === "zh" ? "版本 " : "Ver. ") + r.part.version : ""}</span>
                  {r.needsRecount && (
                    <span className="se-recount"><Icon name="bell" size={11} />{lang === "zh" ? "管理員已變更，請重新盤點" : "Changed by admin — please recount"}</span>
                  )}
                  {r.overridden && r.at && (
                    <span className="se-stamp"><Icon name="clipboard" size={11} />{r.by ? L(r.by) : "—"} · {fmtStamp(r.at, lang)}</span>
                  )}
                </span>
              </span>
              <span className="ta-c se-default mono">{r.defaultStock}</span>
              <span className="ta-c se-need mono">{r.required}</span>
              <span className="ta-c se-inputcol">
                <span className="se-stepper">
                  <button className="se-step" onClick={() => change(r.key, Math.max(0, r.stock - 1))} aria-label="minus">−</button>
                  <input className="se-input mono" type="number" min="0" inputMode="numeric"
                    value={r.overridden ? r.stock : (r.stock === r.defaultStock ? "" : r.stock)}
                    placeholder={String(r.defaultStock)}
                    onChange={(e) => change(r.key, e.target.value)}
                    onFocus={(e) => e.target.select()} />
                  <button className="se-step" onClick={() => change(r.key, (r.overridden ? r.stock : r.defaultStock) + 1)} aria-label="plus">+</button>
                </span>
              </span>
              <span className={"ta-c se-short mono" + (r.shortage > 0 ? " is-short" : "")}>{r.shortage > 0 ? "−" + r.shortage : "—"}</span>
              <span className="ta-r se-status"><StockBadge state={r.state} lang={lang} /></span>
            </div>
          ))}
        </div>
        {rows.length === 0 && (
          <div className="empty">
            <Icon name="cube" size={30} />
            <p className="empty-title">{lang === "zh" ? "沒有符合的制具" : "No matching fixtures"}</p>
            <button className="btn" onClick={() => { setQ(""); setFilter("all"); }}>{lang === "zh" ? "清除篩選" : "Clear filters"}</button>
          </div>
        )}
        <p className="se-foot">{lang === "zh" ? "輸入即自動儲存於本機,並同步至「制具總覽」、制具詳情與各測試清單。" : "Entries auto-save locally and sync to the library, fixture pages and every test list."}</p>
        <div className="se-complete">
          <button className="btn se-complete-btn" onClick={() => setDone(true)}>
            <Icon name="check" size={18} />{zh ? "完成盤點" : "Finish stock-take"}
          </button>
        </div>
      </section>

      {done && (
        <div className="se-done-overlay" onClick={() => setDone(false)} role="dialog" aria-modal="true">
          <div className="se-done-card" onClick={(e) => e.stopPropagation()}>
            <span className="se-done-ico"><Icon name="check" size={30} /></span>
            <h2 className="se-done-title">{zh ? "盤點已完成" : "Stock-take complete"}</h2>
            <p className="se-done-sub">
              {zh
                ? `已盤點 ${counts.counted} / ${rows.length} 項制具，資料已儲存並同步。要登出系統嗎？`
                : `Counted ${counts.counted} of ${rows.length} fixtures. Saved & synced. Log out now?`}
            </p>
            <div className="se-done-actions">
              <button className="btn" onClick={() => window.AUTH.logout()}>
                <Icon name="logout" size={16} />{zh ? "登出系統" : "Log out"}
              </button>
              <button className="btn ghost" onClick={() => setDone(false)}>
                {zh ? "繼續使用" : "Stay signed in"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { buildFixtureUsage, exportBOM, resetStock, stockState, StockBadge, FixturesOverview, FixtureDetail, StockEntry,
  bffLoadStock: loadStock, bffSetStock: setStock, bffGetEntry: getEntry, bffFmtStamp: fmtStamp });
