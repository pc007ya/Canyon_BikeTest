/* Admin notification centre.
   A bell in the top bar that surfaces NEW supplier stock-take changes:
   red badge with unread count + a dropdown listing recent changes.
   Admin-only. "Last seen" is tracked per machine in localStorage.
   No emails are sent — this is an in-app (站內) notifier. */
const { useState: notifState, useEffect: notifEffect, useRef: notifRef } = React;

const NOTIF_SEEN_KEY = "bff:notif:seen";
function notifGetSeen() { try { return +localStorage.getItem(NOTIF_SEEN_KEY) || 0; } catch (e) { return 0; } }
function notifSetSeen(ts) { try { localStorage.setItem(NOTIF_SEEN_KEY, String(ts)); } catch (e) {} }

/* relative time, e.g. "3 分鐘前" / "3 min ago" */
function notifAgo(ts, lang) {
  if (!ts) return "";
  const s = Math.max(0, (Date.now() - ts) / 1000);
  const zh = lang === "zh";
  if (s < 60) return zh ? "剛剛" : "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return zh ? `${m} 分鐘前` : `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return zh ? `${h} 小時前` : `${h} h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return zh ? `${d} 天前` : `${d} d ago`;
  try {
    return new Date(ts).toLocaleDateString(zh ? "zh-TW" : "en-US", { month: "short", day: "numeric" });
  } catch (e) { return ""; }
}

/* flatten every vendor's stock-take into a time-sorted change list */
function notifCollect(lang) {
  const vendors = (window.STORE && window.STORE.vendors_list && window.STORE.vendors_list())
    || (window.AUTH && window.AUTH.VENDORS) || [];
  const parts = (window.DATA && window.DATA.PARTS) || {};
  const L = (o) => (o && o[lang] != null ? o[lang] : (o && o.en) || o);
  const out = [];
  vendors.forEach((v) => {
    let map = {};
    try { map = JSON.parse(localStorage.getItem("bff:stock:" + v.id) || "{}"); } catch (e) {}
    Object.keys(map).forEach((key) => {
      const e = map[key];
      if (!e || !e.at) return;
      const p = parts[key];
      out.push({
        uid: v.id + "|" + key + "|" + e.at,
        at: e.at,
        vendor: L(v.name),
        part: p ? L(p.name) : key,
        code: p ? p.code : "",
        qty: e.qty,
        shortage: (e.shortage != null) ? e.shortage : null,
      });
    });
  });
  out.sort((a, b) => b.at - a.at);
  return out;
}

function NotificationCenter({ lang, onOpenStock }) {
  const [open, setOpen] = notifState(false);
  const [seen, setSeen] = notifState(notifGetSeen);
  const [viewSeen, setViewSeen] = notifState(notifGetSeen);
  const [, bump] = notifState(0);
  const ref = notifRef(null);
  const zh = lang === "zh";

  notifEffect(() => {
    const h = () => bump((n) => n + 1);
    window.addEventListener("bff:stockchange", h);
    window.addEventListener("bff:datachange", h);
    const tick = setInterval(h, 60000); // refresh relative times
    return () => {
      window.removeEventListener("bff:stockchange", h);
      window.removeEventListener("bff:datachange", h);
      clearInterval(tick);
    };
  }, []);

  notifEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const changes = notifCollect(lang);
  const count = changes.reduce((n, c) => n + (c.at > seen ? 1 : 0), 0);
  const recent = changes.slice(0, 40);

  function toggle() {
    if (!open) {
      setViewSeen(seen); // freeze highlight baseline for this viewing
      const latest = changes.length ? changes[0].at : Date.now();
      notifSetSeen(latest); setSeen(latest);
      setOpen(true);
    } else {
      setOpen(false);
    }
  }

  return (
    <div className="notif" ref={ref}>
      <button className={"notif-bell" + (count ? " has-unread" : "")} onClick={toggle}
        aria-label={zh ? "供應商盤點通知" : "Supplier stock notifications"} title={zh ? "供應商盤點通知" : "Supplier notifications"}>
        <Icon name="bell" size={18} />
        {count > 0 && <span className="notif-badge">{count > 99 ? "99+" : count}</span>}
      </button>

      {open && (
        <div className="notif-pop" role="dialog">
          <div className="notif-head">
            <span className="notif-title">{zh ? "供應商盤點通知" : "Supplier stock updates"}</span>
            {onOpenStock && (
              <button className="notif-all" onClick={() => { setOpen(false); onOpenStock(); }}>
                {zh ? "查看全部" : "View all"}<Icon name="chevronRight" size={13} />
              </button>
            )}
          </div>

          {recent.length === 0 ? (
            <div className="notif-empty">
              <Icon name="clipboard" size={26} />
              <p>{zh ? "尚無供應商回報盤點" : "No supplier stock-takes yet"}</p>
            </div>
          ) : (
            <ul className="notif-list">
              {recent.map((c) => (
                <li key={c.uid} className={"notif-item" + (c.at > viewSeen ? " is-new" : "")}>
                  <span className="notif-dot" aria-hidden="true" />
                  <div className="notif-body">
                    <div className="notif-line1">
                      <span className="notif-vendor">{c.vendor}</span>
                      <span className="notif-time">{notifAgo(c.at, lang)}</span>
                    </div>
                    <div className="notif-line2">
                      <span className="notif-part">{c.part}</span>
                      {c.code && <span className="notif-code mono">{c.code}</span>}
                    </div>
                    <div className="notif-line3">
                      <span className="notif-qty">{zh ? "回報數量" : "Reported"} <strong>{c.qty}</strong></span>
                      {c.shortage > 0 && (
                        <span className="notif-short">{zh ? "短缺" : "short"} {c.shortage}</span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Vendor-facing alert: fixtures/equipment changed by admin ----------
   Shows a pink bell whenever a fixture or equipment record was edited by the
   admin more recently than this vendor last counted it (buildFixtureUsage /
   buildEquipUsage already scope to the current vendor via getEntry()/bffGetEntry()).
   Purely a live "action needed" indicator — it has no separate seen/unseen
   state, since the badge count naturally drops to zero once the vendor
   recounts each flagged item. */
function VendorAlertBell({ lang, onGoStock, onGoEquip }) {
  const [open, setOpen] = notifState(false);
  const [, bump] = notifState(0);
  const ref = notifRef(null);
  const zh = lang === "zh";
  const L = (o) => (o && o[lang] != null ? o[lang] : (o && o.en) || o);

  notifEffect(() => {
    const h = () => bump((n) => n + 1);
    window.addEventListener("bff:datachange", h);
    window.addEventListener("bff:stockchange", h);
    return () => { window.removeEventListener("bff:datachange", h); window.removeEventListener("bff:stockchange", h); };
  }, []);
  notifEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const fx = (window.buildFixtureUsage ? window.buildFixtureUsage() : []).filter((r) => r.needsRecount);
  const eq = (window.buildEquipUsage ? window.buildEquipUsage() : []).filter((r) => r.needsRecount);
  const list = [
    ...fx.map((r) => ({ uid: "fx:" + r.key, type: "fx", key: r.key, code: r.part.code, name: r.part.name, at: r.updatedAt })),
    ...eq.map((r) => ({ uid: "eq:" + r.key, type: "eq", key: r.key, code: r.equip.code, name: r.equip.name, at: r.updatedAt })),
  ].sort((a, b) => b.at - a.at);
  const count = list.length;

  function goto(it) {
    try { sessionStorage.setItem("bff:focusKey", it.key); } catch (e) {}
    setOpen(false);
    if (it.type === "fx") onGoStock(); else onGoEquip();
  }

  return (
    <div className="notif" ref={ref}>
      <button className={"notif-bell" + (count ? " has-unread notif-bell-pink" : "")} onClick={() => setOpen((o) => !o)}
        aria-label={zh ? "制具／設備異動通知" : "Fixture/equipment change alerts"} title={zh ? "制具／設備異動通知" : "Change alerts"}>
        <Icon name="bell" size={18} />
        {count > 0 && <span className="notif-badge notif-badge-pink">{count > 99 ? "99+" : count}</span>}
      </button>

      {open && (
        <div className="notif-pop" role="dialog">
          <div className="notif-head">
            <span className="notif-title">{zh ? "制具／設備已異動" : "Fixture/equipment changes"}</span>
          </div>

          {list.length === 0 ? (
            <div className="notif-empty">
              <Icon name="check" size={26} />
              <p>{zh ? "目前沒有需要重新盤點的項目" : "Nothing needs recounting"}</p>
            </div>
          ) : (
            <ul className="notif-list">
              {list.map((it) => (
                <li key={it.uid} className="notif-item is-pink">
                  <span className="notif-dot" aria-hidden="true" />
                  <div className="notif-body">
                    <div className="notif-line1">
                      <span className="notif-vendor">{it.type === "fx" ? (zh ? "制具" : "Fixture") : (zh ? "設備" : "Equipment")}</span>
                      <span className="notif-time">{notifAgo(it.at, lang)}</span>
                    </div>
                    <div className="notif-line2">
                      <span className="notif-part">{L(it.name)}</span>
                      <span className="notif-code mono">{it.code}</span>
                    </div>
                    <button className="notif-goto" onClick={() => goto(it)}>{zh ? "前往盤點" : "Go count"}<Icon name="chevronRight" size={12} /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

window.NotificationCenter = NotificationCenter;
window.VendorAlertBell = VendorAlertBell;

/* ---------- Supplier-facing "Change notices" page ----------
   Full page (not just a bell dropdown): every test / fixture / equipment
   change QC makes, with a timestamp, grouped by day. Prototype per request —
   reachable from its own topnav tab; content is the same list vendors' pink
   bell already flags, just persistent and browsable instead of transient. */
function vnDayKey(ts) { const d = new Date(ts); const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())}`; }
function vnTimeOf(ts) { const d = new Date(ts); const p = (n) => String(n).padStart(2, "0"); return `${p(d.getHours())}:${p(d.getMinutes())}`; }
function vnDayLabel(key, lang) {
  const today = vnDayKey(Date.now());
  const yest = vnDayKey(Date.now() - 86400000);
  if (key === today) return lang === "zh" ? "今天 " + key : "Today · " + key;
  if (key === yest) return lang === "zh" ? "昨天 " + key : "Yesterday · " + key;
  return key;
}
const VN_ENTITIES = ["test", "fixture", "equipment"];

/* per-vendor "acknowledged" set — an entry stays pink until the supplier
   clicks it at least once. Pruned to the current log's ids on every save so
   it can't grow past the log itself. */
function vnLoadAcked(vendorId) {
  try { return new Set(JSON.parse(localStorage.getItem("bff:noticeack:" + vendorId) || "[]")); } catch (e) { return new Set(); }
}
function vnSaveAcked(vendorId, set, validIds) {
  const pruned = [...set].filter((id) => validIds.has(id));
  try { localStorage.setItem("bff:noticeack:" + vendorId, JSON.stringify(pruned)); } catch (e) {}
}

function VendorNoticesPage({ lang, t, goStock, goEquip }) {
  const [, bump] = notifState(0);
  notifEffect(() => { window.scrollTo(0, 0); }, []);
  notifEffect(() => {
    const h = () => bump((n) => n + 1);
    window.addEventListener("bff:datachange", h);
    return () => window.removeEventListener("bff:datachange", h);
  }, []);
  const zh = lang === "zh";
  const L = (o) => (o && o[lang] != null ? o[lang] : o);
  const all = (window.STORE.log_list() || []).filter((e) => VN_ENTITIES.includes(e.entity));

  const me = window.AUTH.get && window.AUTH.get();
  const vendorId = (me && me.id) || "anon";
  const ackedRef = notifRef(null);
  if (!ackedRef.current) ackedRef.current = vnLoadAcked(vendorId);
  function ack(id) {
    if (ackedRef.current.has(id)) return;
    ackedRef.current.add(id);
    vnSaveAcked(vendorId, ackedRef.current, new Set(all.map((e) => e.id)));
    bump((n) => n + 1);
  }

  const actionLabel = (a) => ({
    create: zh ? "新增" : "Created",
    update: zh ? "更新" : "Updated",
    delete: zh ? "刪除" : "Deleted",
  }[a] || a);
  const entityLabel = (e) => ({
    test: zh ? "測試項目" : "Test",
    fixture: zh ? "制具" : "Fixture",
    equipment: zh ? "設備" : "Equipment",
  }[e] || e);

  const groups = [];
  let cur = null;
  all.forEach((e) => {
    const k = vnDayKey(e.at);
    if (!cur || cur.key !== k) { cur = { key: k, entries: [] }; groups.push(cur); }
    cur.entries.push(e);
  });

  return (
    <div className="home">
      <section className="hero hero-sm">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-inner">
          <div className="hero-kicker"><span className="kick-dot" />{zh ? "供應商 · 變更通知" : "Supplier · change notices"}</div>
          <h1 className="hero-title">{zh ? "變更通知" : "Change notices"}</h1>
          <p className="hero-hint">{zh ? "品管部異動測試項目、制具或設備時，會列在這裡（依日期、時間排序）。" : "Every time QC changes a test, fixture or equipment, it's listed here — grouped by day and time."}</p>
        </div>
      </section>

      <section className="list-section">
        {all.length === 0 ? (
          <div className="empty">
            <Icon name="bell" size={30} />
            <p className="empty-title">{zh ? "目前沒有變更通知" : "No change notices yet"}</p>
            <p className="empty-hint">{zh ? "品管部異動測試項目、制具或設備後，會出現在這裡。" : "Notices appear here once QC changes a test, fixture or equipment."}</p>
          </div>
        ) : (
          <div className="timeline">
            {groups.map((g) => (
              <div className="tl-day" key={g.key}>
                <div className="tl-date"><span className="tl-dot-lg" />{vnDayLabel(g.key, lang)}<span className="tl-count mono">{g.entries.length}</span></div>
                <div className="tl-entries">
                  {g.entries.map((e) => (
                    <div className={"tl-entry tl-" + e.action + (!ackedRef.current.has(e.id) ? " tl-unread" : "")} key={e.id} onClick={() => ack(e.id)}>
                      <span className="tl-time mono">{vnTimeOf(e.at)}</span>
                      <span className={"tl-badge tl-b-" + e.action}>{actionLabel(e.action)}</span>
                      <div className="tl-main">
                        <div className="tl-target">
                          <span className="tl-ent">{entityLabel(e.entity)}</span>
                          <span className="tl-name">{L(e.targetName) || "—"}</span>
                        </div>
                        <ul className="tl-changes">
                          {(e.changes || []).map((c, i) => <li key={i}>{L(c)}</li>)}
                        </ul>
                        {e.entity !== "test" && (
                          <button className="notif-goto" onClick={() => (e.entity === "equipment" ? goEquip() : goStock())}>
                            {zh ? "前往盤點" : "Go count"}<Icon name="chevronRight" size={12} />
                          </button>
                        )}
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
window.VendorNoticesPage = VendorNoticesPage;
