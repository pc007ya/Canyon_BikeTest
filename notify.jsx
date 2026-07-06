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
