/* History: date-grouped audit log of all admin changes. Admin-only. */
const { useState: hState, useEffect: hEffect } = React;

function dayKey(ts) { const d = new Date(ts); const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())}`; }
function timeOf(ts) { const d = new Date(ts); const p = (n) => String(n).padStart(2, "0"); return `${p(d.getHours())}:${p(d.getMinutes())}`; }
function dayLabel(key, lang) {
  const today = dayKey(Date.now());
  const yest = dayKey(Date.now() - 86400000);
  if (key === today) return lang === "zh" ? "今天 " + key : "Today · " + key;
  if (key === yest) return lang === "zh" ? "昨天 " + key : "Yesterday · " + key;
  return key;
}

function HistoryPage({ lang, t }) {
  const [, bump] = hState(0);
  const [filter, setFilter] = hState("all"); // all | test | vendor
  hEffect(() => { window.scrollTo(0, 0); }, []);
  hEffect(() => {
    const h = () => bump((n) => n + 1);
    window.addEventListener("bff:datachange", h);
    return () => window.removeEventListener("bff:datachange", h);
  }, []);
  const L = (o) => (o && o[lang] != null ? o[lang] : o);

  const all = window.STORE.log_list();
  const log = all.filter((e) => filter === "all" || e.entity === filter);

  // group by day
  const groups = [];
  let cur = null;
  log.forEach((e) => {
    const k = dayKey(e.at);
    if (!cur || cur.key !== k) { cur = { key: k, entries: [] }; groups.push(cur); }
    cur.entries.push(e);
  });

  const actionLabel = (a) => ({
    create: lang === "zh" ? "新增" : "Created",
    update: lang === "zh" ? "更新" : "Updated",
    delete: lang === "zh" ? "刪除" : "Deleted",
  }[a] || a);
  const entityLabel = (e) => ({
    test: lang === "zh" ? "測試項目" : "Test",
    vendor: lang === "zh" ? "供應商" : "Vendor",
    fixture: lang === "zh" ? "制具" : "Fixture",
    system: lang === "zh" ? "系統" : "System",
  }[e] || e);

  function exportLog() {
    const head = lang === "zh" ? ["時間", "操作者", "動作", "類別", "對象", "變更內容"] : ["Time", "By", "Action", "Type", "Target", "Changes"];
    const lines = [head];
    all.forEach((e) => lines.push([
      dayKey(e.at) + " " + timeOf(e.at), L(e.by), actionLabel(e.action), entityLabel(e.entity), L(e.targetName),
      (e.changes || []).map((c) => L(c)).join("；"),
    ]));
    const csv = lines.map((r) => r.map((c) => { let s = String(c); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "change-history-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  return (
    <div className="home admin">
      <section className="hero hero-sm">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-inner">
          <div className="hero-kicker"><span className="kick-dot" />{lang === "zh" ? "管理員 · 變更稽核軌跡" : "Admin · audit trail"}</div>
          <h1 className="hero-title">{lang === "zh" ? "變更歷史" : "Change history"}</h1>
          <p className="hero-hint">{lang === "zh" ? "依日期紀錄測試項目、測試參數、制具清單與供應商名單的所有異動。" : "Date-grouped log of every change to tests, parameters, fixtures and the vendor list."}</p>
          <div className="hist-bar">
            <div className="chips">
              <button className={"chip" + (filter === "all" ? " is-active" : "")} onClick={() => setFilter("all")}>{lang === "zh" ? "全部" : "All"}<span className="chip-count">{all.length}</span></button>
              <button className={"chip" + (filter === "test" ? " is-active" : "")} onClick={() => setFilter("test")}>{lang === "zh" ? "測試項目" : "Tests"}<span className="chip-count">{all.filter((e) => e.entity === "test").length}</span></button>
              <button className={"chip" + (filter === "vendor" ? " is-active" : "")} onClick={() => setFilter("vendor")}>{lang === "zh" ? "供應商" : "Vendors"}<span className="chip-count">{all.filter((e) => e.entity === "vendor").length}</span></button>
              <button className={"chip" + (filter === "fixture" ? " is-active" : "")} onClick={() => setFilter("fixture")}>{lang === "zh" ? "制具" : "Fixtures"}<span className="chip-count">{all.filter((e) => e.entity === "fixture").length}</span></button>
            </div>
            {all.length > 0 && <button className="btn ghost hist-export" onClick={exportLog}><Icon name="download" size={15} />{lang === "zh" ? "匯出紀錄" : "Export"}</button>}
          </div>
        </div>
      </section>

      <section className="list-section">
        {log.length === 0 ? (
          <div className="empty">
            <Icon name="clock" size={30} />
            <p className="empty-title">{lang === "zh" ? "尚無變更紀錄" : "No changes yet"}</p>
            <p className="empty-hint">{lang === "zh" ? "於「管理中心」新增或編輯後，異動會記錄在此。" : "Edits made in Management will be recorded here."}</p>
          </div>
        ) : (
          <div className="timeline">
            {groups.map((g) => (
              <div className="tl-day" key={g.key}>
                <div className="tl-date"><span className="tl-dot-lg" />{dayLabel(g.key, lang)}<span className="tl-count mono">{g.entries.length}</span></div>
                <div className="tl-entries">
                  {g.entries.map((e) => (
                    <div className={"tl-entry tl-" + e.action} key={e.id}>
                      <span className="tl-time mono">{timeOf(e.at)}</span>
                      <span className={"tl-badge tl-b-" + e.action}>{actionLabel(e.action)}</span>
                      <div className="tl-main">
                        <div className="tl-target">
                          <span className="tl-ent">{entityLabel(e.entity)}</span>
                          <span className="tl-name">{L(e.targetName) || "—"}</span>
                        </div>
                        <ul className="tl-changes">
                          {(e.changes || []).map((c, i) => <li key={i}>{L(c)}</li>)}
                        </ul>
                        <div className="tl-by">{lang === "zh" ? "操作者：" : "by "}{L(e.by)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

window.HistoryPage = HistoryPage;
