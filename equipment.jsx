/* Equipment (設備) — reverse lookup + vendor stock-take + admin aggregate.
   KEY DIFFERENCE vs fixtures: required quantity is the MAX across all tests
   (equipment is shared between rigs, not accumulated), whereas fixtures sum.
   Vendor counts are stored in the SAME per-vendor stock map as fixtures, keyed
   by E-code (no collision with A-code jigs / p_ custom parts), so they sync to
   the cloud for free. */
const { useState: eqState, useEffect: eqEffect, useMemo: eqMemo, useRef: eqRef } = React;

/* part key -> { equip, uses, required(MAX), stock, shortage, state, overridden } */
function buildEquipUsage() {
  const EQ = window.DATA.EQUIPMENT || {};
  const map = new Map();
  Object.entries(EQ).forEach(([key, equip]) => map.set(key, { key, equip, uses: [], required: 0 }));
  window.DATA.ITEMS.forEach((item) => {
    (item.equipment || []).forEach((f) => {
      const rec = map.get(f.key);
      if (!rec) return;
      rec.uses.push({ item, qty: f.qty });
      if (f.qty > rec.required) rec.required = f.qty;   // ← MAX, not sum
    });
  });
  const out = [...map.values()];
  out.forEach((r) => {
    const e = window.bffGetEntry(r.key);
    r.defaultStock = r.equip.stock != null ? r.equip.stock : 0;
    r.stock = e && e.qty != null ? e.qty : r.defaultStock;
    r.overridden = !!e;
    r.by = e ? e.by : null;
    r.at = e ? e.at : null;
    r.shortage = Math.max(0, r.required - r.stock);
    r.state = window.stockState(r.stock, r.required);
    r.peak = r.uses.reduce((m, u) => (u.qty > m.qty ? { qty: u.qty, item: u.item } : m), { qty: 0, item: null });
    r.updatedAt = r.equip.updatedAt || null;
    r.needsRecount = !!r.updatedAt && (!r.at || r.at < r.updatedAt);
  });
  const order = { out: 0, low: 1, in: 2 };
  return out.sort((a, b) => order[a.state.key] - order[b.state.key] || b.shortage - a.shortage || b.required - a.required);
}
function equipUsageMap() { const m = {}; buildEquipUsage().forEach((r) => { m[r.key] = r; }); return m; }

const EQ_ICON = { "Test machine": "layers", "Actuator": "bolt", "Instrument": "ruler", "Tool": "cube" };
function EquipIcon({ equip, size }) {
  if (equip && equip.image) return <span className="eq-ico"><img src={equip.image} alt="" /></span>;
  const k = equip && equip.kind && equip.kind.en;
  const cls = "eq-ico eq-ico-" + String(k || "").toLowerCase().replace(/\s+/g, "-");
  return <span className={cls}><Icon name={EQ_ICON[k] || "cube"} size={size || 20} /></span>;
}

/* ---------- Detail-page block: required equipment for one test ---------- */
function EquipmentTable({ equipment, lang }) {
  const L = (o) => (o && o[lang] != null ? o[lang] : o);
  const um = eqMemo(() => equipUsageMap(), [equipment]);
  if (!equipment || !equipment.length) {
    return <div className="passcrit empty"><Icon name="layers" size={20} />{lang === "zh" ? "本測試未指定共用設備" : "No shared equipment assigned"}</div>;
  }
  return (
    <div className="ftable">
      <div className="ftable-head eqtable">
        <span>{lang === "zh" ? "設備" : "Equipment"}</span>
        <span>{lang === "zh" ? "編號" : "Code"}</span>
        <span className="ta-c">{lang === "zh" ? "本測試" : "This test"}</span>
        <span className="ta-r">{lang === "zh" ? "全測試最高" : "Peak (all)"}</span>
      </div>
      {equipment.map((f, i) => {
        const rec = um[f.key];
        return (
          <div className="ftable-row eqtable" key={i}>
            <span className="fx-name">
              <EquipIcon equip={f} />
              <span className="use-meta">
                <span className="fx-title">{L(f.name)}</span>
                <span className="fx-kind">{L(f.kind)}</span>
              </span>
            </span>
            <span className="fx-part mono">{f.code || "—"}</span>
            <span className="ta-c fx-qty">×{f.qty}</span>
            <span className="ta-r mono fx-torque">{rec ? rec.required : f.qty}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- CSV export (equipment, MAX-based demand) ---------- */
function exportEquipCSV(lang) {
  const rows = buildEquipUsage();
  const head = lang === "zh"
    ? ["編號", "名稱", "類別", "使用測試數", "需求量(最高)", "現有庫存", "短缺", "狀態", "儲位", "盤點人", "盤點時間"]
    : ["Code", "Name", "Kind", "Used in", "Required (max)", "In stock", "Shortage", "Status", "Location", "Counted by", "Counted at"];
  const lines = [head];
  rows.forEach((r) => lines.push([
    r.equip.code, r.equip.name[lang], r.equip.kind[lang], r.uses.length,
    r.required, r.stock, r.shortage, r.state[lang], r.equip.loc || "",
    r.by ? r.by[lang] : "", r.at ? window.bffFmtStamp(r.at, lang) : "",
  ]));
  const csv = lines.map((row) => row.map((c) => {
    let s = String(c); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "equipment-demand-" + new Date().toISOString().slice(0, 10) + ".csv";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* ---------- Vendor equipment stock-take ---------- */
function EquipmentStockEntry({ lang, t }) {
  const L = (o) => (o && o[lang] != null ? o[lang] : o);
  const zh = lang === "zh";
  const all = buildEquipUsage();
  const [, force] = eqState(0);
  const [done, setDone] = eqState(false);
  const [q, setQ] = eqState("");
  const [filter, setFilter] = eqState("all"); // all | short | changed
  const [flashKey, setFlashKey] = eqState(null);
  const rowRefs = eqRef({});
  eqEffect(() => {
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

  const rows = eqMemo(() => {
    const n = q.trim().toLowerCase();
    return all.filter((r) => {
      if (filter === "short" && r.shortage <= 0) return false;
      if (filter === "changed" && !r.needsRecount) return false;
      if (!n) return true;
      return (r.equip.name.zh + " " + r.equip.name.en + " " + r.equip.code + " " + r.key).toLowerCase().includes(n);
    });
  }, [q, filter, all]);

  function change(key, raw) { window.bffSetStock(key, raw === "" ? null : raw); force((n) => n + 1); }
  function reset() {
    const s = window.bffLoadStock();
    Object.keys(window.DATA.EQUIPMENT).forEach((k) => { if (s[k]) window.bffSetStock(k, null); });
    force((n) => n + 1);
  }

  return (
    <div className="home">
      <section className="hero hero-sm">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-inner">
          <div className="hero-kicker"><span className="kick-dot" />{zh ? "供應商填報 · 設備可共用，需求取最高" : "Vendor entry · shared, demand = peak"}</div>
          <h1 className="hero-title">{zh ? "設備盤點" : "Equipment stock-take"}</h1>
          <p className="hero-hint">{zh ? "請輸入各設備的實際數量。需求量為「所有測試項目中的最高用量」，因為設備可在不同測試間共用、不需累加。" : "Enter on-hand equipment. Demand is the highest quantity across all tests — equipment is shared between rigs, never summed."}</p>
          <div className="searchbar se-search">
            <Icon name="search" size={18} />
            <input value={q} onChange={(e) => setQ(e.target.value)}
              placeholder={zh ? "搜尋設備名稱或編號…" : "Search equipment name or code…"}
              aria-label="search equipment" />
            {q && <button className="search-clear" onClick={() => setQ("")}><Icon name="x" size={15} /></button>}
          </div>
          <div className="chips">
            <button className={"chip" + (filter === "all" ? " is-active" : "")} onClick={() => setFilter("all")}>{zh ? "全部" : "All"}<span className="chip-count">{all.length}</span></button>
            <button className={"chip chip-warn" + (filter === "short" ? " is-active" : "")} onClick={() => setFilter("short")}>{zh ? "僅缺料" : "Shortages"}<span className="chip-count">{counts.out + counts.low}</span></button>
            <button className={"chip chip-pink" + (filter === "changed" ? " is-active" : "")} onClick={() => setFilter("changed")}>{zh ? "已異動" : "Changed"}<span className="chip-count">{counts.changed}</span></button>
          </div>
          <div className="se-actions">
            <button className="btn ghost" onClick={() => exportEquipCSV(lang)}><Icon name="download" size={16} />{zh ? "匯出需求表" : "Export demand"}</button>
            <button className="btn ghost se-reset" onClick={reset}>{zh ? "重設為系統值" : "Reset to defaults"}</button>
          </div>
          <div className="invsum">
            <span className="invsum-item"><b>{counts.counted}</b>/{rows.length} {zh ? "已盤點" : "counted"}</span>
            <span className="invsum-item invsum-out"><span className="stockb-dot" /><b>{counts.out}</b>{zh ? "欠缺" : "short"}</span>
            <span className="invsum-item invsum-low"><span className="stockb-dot" /><b>{counts.low}</b>{zh ? "不足" : "low"}</span>
            <span className="invsum-item invsum-in"><span className="stockb-dot" /><b>{counts.in}</b>{zh ? "充足" : "ok"}</span>
            {counts.shortPcs > 0 && <span className="invsum-gap" />}
            {counts.shortPcs > 0 && <span className="invsum-item invsum-need">{zh ? "待補" : "to order"} <b>{counts.shortPcs}</b> pcs</span>}
          </div>
        </div>
      </section>

      <section className="list-section">
        <div className="setable eqsetable">
          <div className="setable-head">
            <span>{zh ? "設備" : "Equipment"}</span>
            <span className="ta-c">{zh ? "系統值" : "Default"}</span>
            <span className="ta-c">{zh ? "需求(最高)" : "Need (max)"}</span>
            <span className="ta-c se-inputcol">{zh ? "實際數量" : "On hand"}</span>
            <span className="ta-c">{zh ? "短缺" : "Short"}</span>
            <span className="ta-r">{zh ? "狀態" : "Status"}</span>
          </div>
          {rows.map((r) => (
            <div className={"setable-row se-" + r.state.key + (r.needsRecount ? " se-changed" : "") + (flashKey === r.key ? " se-flash" : "")} key={r.key}
              ref={(el) => { rowRefs.current[r.key] = el; }}>
              <span className="se-fx">
                <EquipIcon equip={r.equip} />
                <span className="se-meta">
                  <span className="se-name">{L(r.equip.name)}</span>
                  <span className="se-code mono">{r.equip.code} · {L(r.equip.kind)} · {zh ? "用於" : "in"} {r.uses.length} {zh ? "項" : "tests"}{r.equip.version ? " · " + (zh ? "版本 " : "Ver. ") + r.equip.version : ""}</span>
                  {r.peak.item && <span className="se-code mono eq-peak">{zh ? "最高需求來自 " : "Peak from "}{r.peak.item.code} ×{r.peak.qty}</span>}
                  {r.needsRecount && (
                    <span className="se-recount"><Icon name="bell" size={11} />{zh ? "管理員已變更，請重新盤點" : "Changed by admin — please recount"}</span>
                  )}
                  {r.overridden && r.at && (
                    <span className="se-stamp"><Icon name="clipboard" size={11} />{r.by ? L(r.by) : "—"} · {window.bffFmtStamp(r.at, lang)}</span>
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
            <Icon name="bolt" size={30} />
            <p className="empty-title">{zh ? "沒有符合的設備" : "No matching equipment"}</p>
            <button className="btn" onClick={() => { setQ(""); setFilter("all"); }}>{zh ? "清除篩選" : "Clear filters"}</button>
          </div>
        )}
        <p className="se-foot">{zh ? "輸入即自動儲存於本機並同步。需求量＝該設備在所有測試中的單次最高用量。" : "Entries auto-save and sync. Demand = the single highest per-test usage across all tests."}</p>
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
            <h2 className="se-done-title">{zh ? "設備盤點已完成" : "Equipment stock-take complete"}</h2>
            <p className="se-done-sub">{zh ? `已盤點 ${counts.counted} / ${rows.length} 項設備，資料已儲存並同步。` : `Counted ${counts.counted} of ${rows.length}. Saved & synced.`}</p>
            <div className="se-done-actions">
              <button className="btn ghost" onClick={() => setDone(false)}>{zh ? "繼續使用" : "Stay"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Admin: equipment × vendor aggregate ---------- */
function EquipmentAdminDashboard({ lang, t }) {
  const L = (o) => (o && o[lang] != null ? o[lang] : o);
  const [, bump] = eqState(0);
  eqEffect(() => { window.scrollTo(0, 0); }, []);
  eqEffect(() => {
    const h = () => bump((n) => n + 1);
    window.addEventListener("bff:stockchange", h);
    window.addEventListener("storage", h);
    return () => { window.removeEventListener("bff:stockchange", h); window.removeEventListener("storage", h); };
  }, []);

  const vendors = window.AUTH.VENDORS;
  const base = buildEquipUsage();

  const model = eqMemo(() => {
    const list = base.map((r) => ({ key: r.key, equip: r.equip, required: r.required, defaultStock: r.defaultStock }));
    const data = {};
    const vendorStats = {};
    list.forEach((f) => { data[f.key] = {}; });
    vendors.forEach((v) => {
      const s = window.AUTH.stockOf(v.id);
      let counted = 0, shortItems = 0, shortPcs = 0, lastAt = 0;
      list.forEach((f) => {
        const e = s[f.key];
        if (e && e.qty != null) {
          const shortage = Math.max(0, f.required - e.qty);
          data[f.key][v.id] = { qty: e.qty, shortage, at: e.at, by: e.by, reported: true };
          counted++;
          if (shortage > 0) { shortItems++; shortPcs += shortage; }
          if (e.at > lastAt) lastAt = e.at;
        } else { data[f.key][v.id] = { reported: false }; }
      });
      vendorStats[v.id] = { counted, total: list.length, shortItems, shortPcs, lastAt };
    });
    return { list, data, vendorStats };
  }, [base.length, bump]);

  const totals = eqMemo(() => {
    let reported = 0, anyShort = 0, totalShortPcs = 0, active = 0;
    vendors.forEach((v) => {
      const st = model.vendorStats[v.id];
      if (st.counted > 0) active++;
      reported += st.counted; anyShort += st.shortItems; totalShortPcs += st.shortPcs;
    });
    return { reported, anyShort, totalShortPcs, active };
  }, [model]);

  function exportAll() {
    const head = lang === "zh"
      ? ["設備編號", "設備名稱", "需求(最高)", "供應商", "回報數量", "短缺", "盤點人", "盤點時間"]
      : ["Code", "Equipment", "Required(max)", "Vendor", "Reported", "Short", "By", "At"];
    const lines = [head];
    model.list.forEach((f) => {
      vendors.forEach((v) => {
        const c = model.data[f.key][v.id];
        if (!c.reported) return;
        lines.push([f.equip.code, f.equip.name[lang], f.required, v.name[lang], c.qty, c.shortage, c.by ? c.by[lang] : "", window.bffFmtStamp(c.at, lang)]);
      });
    });
    const csv = lines.map((row) => row.map((c) => {
      let s = String(c); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "equipment-stock-all-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  return (
    <div className="home admin">
      <section className="hero hero-sm">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-inner">
          <div className="hero-kicker"><span className="kick-dot" />{lang === "zh" ? "管理員 · 跨供應商檢視" : "Admin · cross-vendor view"}</div>
          <h1 className="hero-title">{lang === "zh" ? "設備盤點總覽" : "Equipment dashboard"}</h1>
          <p className="hero-hint">{lang === "zh" ? "各供應商回報的設備數量與需求短缺。需求量為所有測試的最高用量（設備共用，不累加）。" : "Each vendor's reported equipment vs demand. Demand = peak usage across tests (shared, not summed)."}</p>
          <div className="admin-stats">
            <div className="astat"><span className="astat-v">{totals.active}<span className="astat-d">/{vendors.length}</span></span><span className="astat-k">{lang === "zh" ? "已回報供應商" : "Active vendors"}</span></div>
            <div className="astat"><span className="astat-v">{totals.reported}</span><span className="astat-k">{lang === "zh" ? "盤點筆數" : "Entries"}</span></div>
            <div className="astat astat-warn"><span className="astat-v">{totals.anyShort}</span><span className="astat-k">{lang === "zh" ? "短缺項次" : "Shortage lines"}</span></div>
            <div className="astat astat-accent"><span className="astat-v">{totals.totalShortPcs}</span><span className="astat-k">{lang === "zh" ? "待補件數 (pcs)" : "To order (pcs)"}</span></div>
            <button className="btn admin-export" onClick={exportAll}><Icon name="download" size={16} />{lang === "zh" ? "匯出總表" : "Export all"}</button>
          </div>
        </div>
      </section>

      <section className="list-section">
        <h2 className="admin-h">{lang === "zh" ? "各供應商狀態" : "Vendor status"}</h2>
        <div className="vsum-grid">
          {vendors.map((v) => {
            const st = model.vendorStats[v.id];
            const done = st.counted === st.total;
            const idle = st.counted === 0;
            return (
              <div className={"vsum" + (idle ? " is-idle" : st.shortItems > 0 ? " is-warn" : done ? " is-done" : "")} key={v.id}>
                <div className="vsum-top">
                  <span className="vsum-ava">{L(v.name).trim().charAt(0)}</span>
                  <span className="vsum-name">{L(v.name)}</span>
                </div>
                <div className="vsum-prog">
                  <div className="vsum-bar"><span style={{ width: (st.counted / st.total * 100) + "%" }} /></div>
                  <span className="vsum-progtxt mono">{st.counted}/{st.total}</span>
                </div>
                <div className="vsum-foot">
                  {idle ? <span className="vsum-idle">{lang === "zh" ? "尚未盤點" : "Not started"}</span>
                    : st.shortItems > 0 ? <span className="vsum-short">{lang === "zh" ? `${st.shortItems} 項短缺 · 待補 ${st.shortPcs}` : `${st.shortItems} short · ${st.shortPcs} pcs`}</span>
                      : <span className="vsum-ok"><Icon name="check" size={13} />{lang === "zh" ? "設備充足" : "All sufficient"}</span>}
                  {!idle && <span className="vsum-at mono">{window.bffFmtStamp(st.lastAt, lang)}</span>}
                </div>
              </div>
            );
          })}
        </div>

        <h2 className="admin-h">{lang === "zh" ? "設備 × 供應商矩陣" : "Equipment × vendor matrix"}<span className="admin-h-aside">{lang === "zh" ? "數字為回報數量 · 紅底表示短缺 · 需求取最高" : "cells = reported · red = short · demand = max"}</span></h2>
        <div className="matrix-wrap">
          <table className="matrix">
            <thead>
              <tr>
                <th className="mx-fx">{lang === "zh" ? "設備" : "Equipment"}</th>
                <th className="mx-req">{lang === "zh" ? "需求" : "Need"}</th>
                {vendors.map((v) => <th key={v.id} className="mx-vh"><span className="mx-vh-ava">{L(v.name).trim().charAt(0)}</span><span className="mx-vh-name">{L(v.name)}</span></th>)}
              </tr>
            </thead>
            <tbody>
              {model.list.map((f) => (
                <tr key={f.key}>
                  <td className="mx-fx">
                    <span className="mx-fxbtn mx-fxbtn-static">
                      <EquipIcon equip={f.equip} size={18} />
                      <span><span className="mx-fxname">{L(f.equip.name)}</span><span className="mx-fxcode mono">{f.equip.code}</span></span>
                    </span>
                  </td>
                  <td className="mx-req mono">{f.required}</td>
                  {vendors.map((v) => {
                    const c = model.data[f.key][v.id];
                    if (!c.reported) return <td key={v.id} className="mx-cell mx-empty">–</td>;
                    return (
                      <td key={v.id} className={"mx-cell" + (c.shortage > 0 ? " mx-short" : " mx-ok")} title={(c.by ? L(c.by) : "") + " · " + window.bffFmtStamp(c.at, lang)}>
                        <span className="mx-qty">{c.qty}</span>
                        {c.shortage > 0 && <span className="mx-sh">−{c.shortage}</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="se-foot">{lang === "zh" ? "資料由各供應商於「設備盤點」頁填報。需求量為所有測試的最高單次用量。" : "Filed by vendors on the Equipment stock-take page. Demand is the peak per-test usage across all tests."}</p>
      </section>
    </div>
  );
}

Object.assign(window, { buildEquipUsage, equipUsageMap, EquipIcon, EquipmentTable, EquipmentStockEntry, EquipmentAdminDashboard, exportEquipCSV });
