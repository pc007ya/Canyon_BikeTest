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
    equipment: lang === "zh" ? "設備" : "Equipment",
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
        <div className="hist-layout">
          <aside className="hist-side"><SupplierNotifiedPanel lang={lang} actionLabel={actionLabel} entityLabel={entityLabel} /></aside>
          <div className="hist-main">
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
          </div>
          <aside className="hist-side"><LoginRecordsPanel lang={lang} /></aside>
        </div>
      </section>
    </div>
  );
}

/* ---------- Left panel: recent changes that were pushed to suppliers
   (test items / fixtures / equipment — these are exactly what drive the
   supplier-facing recount alerts) ---------- */
const SP_ENTITIES = ["test", "fixture", "equipment"];
function SupplierNotifiedPanel({ lang, actionLabel, entityLabel }) {
  const [, bump] = hState(0);
  hEffect(() => {
    const h = () => bump((n) => n + 1);
    window.addEventListener("bff:datachange", h);
    return () => window.removeEventListener("bff:datachange", h);
  }, []);
  const zh = lang === "zh";
  const L = (o) => (o && o[lang] != null ? o[lang] : o);
  const all = window.STORE.log_list().filter((e) => SP_ENTITIES.includes(e.entity));
  const recent = all.slice(0, 30);
  const freshCutoff = Date.now() - 86400000;

  return (
    <div className="side-panel">
      <div className="sp-head">
        <span className="sp-title"><Icon name="bell" size={15} />{zh ? "供應商通知" : "Supplier notifications"}</span>
        <span className="sp-count mono">{all.length}</span>
      </div>
      <p className="sp-sub">{zh ? "測試項目、制具、設備的變更——已反映在供應商盤點頁面的提醒中。" : "Changes to tests, fixtures & equipment — these drive the recount alerts suppliers see."}</p>
      {recent.length === 0 ? (
        <div className="sp-empty"><Icon name="bell" size={22} /><p>{zh ? "尚無通知" : "No notifications yet"}</p></div>
      ) : (
        <ul className="notif-list sp-list">
          {recent.map((e) => (
            <li key={e.id} className={"notif-item" + (e.at > freshCutoff ? " is-new" : "")}>
              <span className="notif-dot" aria-hidden="true" />
              <div className="notif-body">
                <div className="notif-line1">
                  <span className="notif-vendor">{entityLabel(e.entity)} · {actionLabel(e.action)}</span>
                  <span className="notif-time">{notifAgo(e.at, lang)}</span>
                </div>
                <div className="notif-line2"><span className="notif-part">{L(e.targetName) || "—"}</span></div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Right panel: supplier login records (time + best-effort public IP) ---------- */
function LoginRecordsPanel({ lang }) {
  const [, bump] = hState(0);
  hEffect(() => {
    const h = () => bump((n) => n + 1);
    window.addEventListener("bff:loginlogchange", h);
    window.addEventListener("bff:authchange", h);
    const tick = setInterval(h, 60000);
    return () => { window.removeEventListener("bff:loginlogchange", h); window.removeEventListener("bff:authchange", h); clearInterval(tick); };
  }, []);
  const zh = lang === "zh";
  const L = (o) => (o && o[lang] != null ? o[lang] : o);
  const all = window.AUTH.allLoginLogs();
  const recent = all.slice(0, 40);

  return (
    <div className="side-panel">
      <div className="sp-head">
        <span className="sp-title"><Icon name="clipboard" size={15} />{zh ? "供應商登入紀錄" : "Supplier logins"}</span>
        <span className="sp-count mono">{all.length}</span>
      </div>
      <p className="sp-sub">{zh ? "IP 為登入時偵測到的公用網路位址（客戶端自報，僅供參考）。" : "IP is the public network address observed at login (client-reported, best-effort)."}</p>
      {recent.length === 0 ? (
        <div className="sp-empty"><Icon name="clipboard" size={22} /><p>{zh ? "尚無供應商登入紀錄" : "No supplier logins yet"}</p></div>
      ) : (
        <div className="sp-loglist">
          <div className="sp-logrow sp-logrow-head">
            <span>{zh ? "供應商" : "Vendor"}</span><span>{zh ? "時間" : "Time"}</span><span>IP</span>
          </div>
          {recent.map((e, i) => (
            <div className="sp-logrow" key={e.vendorId + "|" + e.at + "|" + i}>
              <span className="sp-logvendor">{L(e.vendor)}</span>
              <span className="sp-logtime mono">{dayKey(e.at)} {timeOf(e.at)}</span>
              <span className={"sp-logip mono" + (e.ip ? "" : " sp-logip-na")}>{e.ip || "—"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

window.HistoryPage = HistoryPage;
