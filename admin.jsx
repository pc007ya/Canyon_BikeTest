/* Admin dashboard: see every vendor's reported fixture stock vs required demand. */
const { useState: aState, useEffect: aEffect, useMemo: aMemo } = React;

function fmtStamp2(ts, lang) {
  if (!ts) return "";
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function AdminDashboard({ lang, t, onOpenFixture }) {
  const L = (o) => (o && o[lang] != null ? o[lang] : o);
  const [, bump] = aState(0);
  aEffect(() => { window.scrollTo(0, 0); }, []);
  aEffect(() => {
    const h = () => bump((n) => n + 1);
    window.addEventListener("storage", h);
    return () => window.removeEventListener("storage", h);
  }, []);

  const vendors = window.AUTH.VENDORS;
  const base = window.buildFixtureUsage(); // required + defaults (admin has no overrides)

  // matrix[fixtureKey][vendorId] = { qty, shortage, at, by, reported }
  const model = aMemo(() => {
    const fixtures = base.map((r) => ({ key: r.key, part: r.part, required: r.required, defaultStock: r.defaultStock }));
    const data = {};
    const vendorStats = {};
    fixtures.forEach((f) => { data[f.key] = {}; });
    vendors.forEach((v) => {
      const s = window.AUTH.stockOf(v.id);
      let counted = 0, shortItems = 0, shortPcs = 0, lastAt = 0;
      fixtures.forEach((f) => {
        const e = s[f.key];
        if (e && e.qty != null) {
          const shortage = Math.max(0, f.required - e.qty);
          data[f.key][v.id] = { qty: e.qty, shortage, at: e.at, by: e.by, reported: true };
          counted++;
          if (shortage > 0) { shortItems++; shortPcs += shortage; }
          if (e.at > lastAt) lastAt = e.at;
        } else {
          data[f.key][v.id] = { reported: false };
        }
      });
      vendorStats[v.id] = { counted, total: fixtures.length, shortItems, shortPcs, lastAt };
    });
    return { fixtures, data, vendorStats };
  }, [base.length, bump]);

  const totals = aMemo(() => {
    let reported = 0, anyShort = 0, totalShortPcs = 0, active = 0;
    vendors.forEach((v) => {
      const st = model.vendorStats[v.id];
      if (st.counted > 0) active++;
      reported += st.counted;
      anyShort += st.shortItems;
      totalShortPcs += st.shortPcs;
    });
    return { reported, anyShort, totalShortPcs, active };
  }, [model]);

  function exportAll() {
    const head = lang === "zh"
      ? ["制具編號", "制具名稱", "需求量", "供應商", "回報庫存", "短缺", "盤點人", "盤點時間"]
      : ["Part No.", "Fixture", "Required", "Vendor", "Reported", "Short", "By", "At"];
    const lines = [head];
    model.fixtures.forEach((f) => {
      vendors.forEach((v) => {
        const c = model.data[f.key][v.id];
        if (!c.reported) return;
        lines.push([f.part.code, f.part.name[lang], f.required, v.name[lang], c.qty, c.shortage, c.by ? c.by[lang] : "", fmtStamp2(c.at, lang)]);
      });
    });
    const csv = lines.map((row) => row.map((c) => {
      let s = String(c); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "vendor-stock-all-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  return (
    <div className="home admin">
      <section className="hero hero-sm">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-inner">
          <div className="hero-kicker"><span className="kick-dot" />{lang === "zh" ? "管理員 · 跨供應商檢視" : "Admin · cross-vendor view"}</div>
          <h1 className="hero-title">{lang === "zh" ? "供應商盤點總覽" : "Vendor stock dashboard"}</h1>
          <p className="hero-hint">{lang === "zh" ? "檢視各供應商回報的制具庫存與需求短缺，即時彙整。" : "Review each vendor's reported fixture stock and shortages against demand."}</p>
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
        {/* per-vendor summary cards */}
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
                  {idle
                    ? <span className="vsum-idle">{lang === "zh" ? "尚未盤點" : "Not started"}</span>
                    : st.shortItems > 0
                      ? <span className="vsum-short">{lang === "zh" ? `${st.shortItems} 項短缺 · 待補 ${st.shortPcs}` : `${st.shortItems} short · ${st.shortPcs} pcs`}</span>
                      : <span className="vsum-ok"><Icon name="check" size={13} />{lang === "zh" ? "庫存充足" : "All sufficient"}</span>}
                  {!idle && <span className="vsum-at mono">{fmtStamp2(st.lastAt, lang)}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* matrix: fixtures × vendors */}
        <h2 className="admin-h">{lang === "zh" ? "制具庫存矩陣" : "Fixture × vendor matrix"}<span className="admin-h-aside">{lang === "zh" ? "數字為回報庫存 · 紅底表示短缺" : "cells = reported stock · red = shortage"}</span></h2>
        <div className="matrix-wrap">
          <table className="matrix">
            <thead>
              <tr>
                <th className="mx-fx">{lang === "zh" ? "制具" : "Fixture"}</th>
                <th className="mx-req">{lang === "zh" ? "需求" : "Need"}</th>
                {vendors.map((v) => <th key={v.id} className="mx-vh"><span className="mx-vh-ava">{L(v.name).trim().charAt(0)}</span><span className="mx-vh-name">{L(v.name)}</span></th>)}
              </tr>
            </thead>
            <tbody>
              {model.fixtures.map((f) => (
                <tr key={f.key}>
                  <td className="mx-fx">
                    <button className="mx-fxbtn" onClick={() => onOpenFixture(f.key)}>
                      <img src={f.part.image} alt="" loading="lazy" />
                      <span><span className="mx-fxname">{L(f.part.name)}</span><span className="mx-fxcode mono">{f.part.code}</span></span>
                    </button>
                  </td>
                  <td className="mx-req mono">{f.required}</td>
                  {vendors.map((v) => {
                    const c = model.data[f.key][v.id];
                    if (!c.reported) return <td key={v.id} className="mx-cell mx-empty">–</td>;
                    return (
                      <td key={v.id} className={"mx-cell" + (c.shortage > 0 ? " mx-short" : " mx-ok")} title={(c.by ? L(c.by) : "") + " · " + fmtStamp2(c.at, lang)}>
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
        <p className="se-foot">{lang === "zh" ? "懸停儲存格可見盤點人與時間。資料由各供應商於「庫存盤點」頁填報。" : "Hover a cell for who/when. Data is filed by vendors on the Stock-take page."}</p>
      </section>
    </div>
  );
}

window.AdminDashboard = AdminDashboard;
