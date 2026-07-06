/* Lightweight vendor/admin "login" (demo — no real auth backend).
   Current user persisted in localStorage; stock-take is keyed per vendor. */
(function () {
  const VENDORS = [
    { id: "giant", name: { zh: "巨大機械", en: "Giant Mfg." }, code: "1234" },
    { id: "merida", name: { zh: "美利達工業", en: "Merida Industry" }, code: "1234" },
    { id: "maxxis", name: { zh: "正新瑪吉斯", en: "Maxxis / Cheng Shin" }, code: "1234" },
    { id: "kmc", name: { zh: "桂盟企業 KMC", en: "KMC Chain" }, code: "1234" },
    { id: "sram", name: { zh: "速聯 SRAM", en: "SRAM Taiwan" }, code: "1234" },
    { id: "tektro", name: { zh: "彥豪金屬 Tektro", en: "Tektro Technology" }, code: "1234" },
  ];
  const ADMIN = { id: "admin", role: "admin", name: { zh: "品管部 管理員", en: "QC Administrator" } };
  // Admin access code is verified against a SHA-256 hash (see store.js
  // admincode_get/admincode_set + window.bffSha256) — never stored or synced
  // as plaintext, since Firestore's rules let any signed-in visitor (incl.
  // anonymous) read the shared master doc. ADMIN has no `.code` property;
  // Login hashes the entered value and compares to window.STORE.admincode_get().
  const KEY = "bff:vendor";
  function get() { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } }
  function set(v) {
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {}
    recordLogin(v);
    window.dispatchEvent(new CustomEvent("bff:authchange"));
  }
  function logout() { try { localStorage.removeItem(KEY); } catch (e) {} window.dispatchEvent(new CustomEvent("bff:authchange")); }
  function isAdmin(u) { return !!(u && u.role === "admin"); }
  /* read a given vendor's stock-take map: { partKey: {qty, by, at} } */
  function stockOf(vendorId) { try { return JSON.parse(localStorage.getItem("bff:stock:" + vendorId) || "{}"); } catch (e) { return {}; } }

  /* ---- Supplier login records (time + best-effort public IP) ----
     Tracked ONLY for vendor logins (never admin). Stored per-vendor as a
     capped array under "bff:loginlog:<vendorId>", mirroring the existing
     per-vendor stock/report storage so cloud.js can sync it the same way.
     The IP is fetched client-side from a public "what's my IP" endpoint —
     there is no backend here, so this is the network-observed public IP,
     best-effort only: it will read "—" if the request is blocked or the
     vendor is offline. It identifies the connection, not the individual. */
  const LOGIN_LOG_PREFIX = "bff:loginlog:";
  const LOGIN_LOG_CAP = 60;
  function loginLogOf(vendorId) { try { return JSON.parse(localStorage.getItem(LOGIN_LOG_PREFIX + vendorId) || "[]"); } catch (e) { return []; } }
  function saveLoginLog(vendorId, list) {
    try { localStorage.setItem(LOGIN_LOG_PREFIX + vendorId, JSON.stringify(list)); } catch (e) {}
    window.dispatchEvent(new CustomEvent("bff:loginlogchange", { detail: { vendorId } }));
  }
  function fetchPublicIp(timeoutMs) {
    return new Promise((resolve) => {
      if (!window.fetch) { resolve(null); return; }
      const ctrl = (typeof AbortController !== "undefined") ? new AbortController() : null;
      const timer = setTimeout(() => { if (ctrl) ctrl.abort(); resolve(null); }, timeoutMs || 3500);
      fetch("https://api.ipify.org?format=json", ctrl ? { signal: ctrl.signal } : {})
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { clearTimeout(timer); resolve(d && d.ip ? d.ip : null); })
        .catch(() => { clearTimeout(timer); resolve(null); });
    });
  }
  function recordLogin(v) {
    if (!v || v.role === "admin" || !v.id) return; // suppliers only
    const stamp = Date.now();
    const list = loginLogOf(v.id);
    list.push({ at: stamp, ip: null });
    saveLoginLog(v.id, list.length > LOGIN_LOG_CAP ? list.slice(-LOGIN_LOG_CAP) : list);
    fetchPublicIp().then((ip) => {
      if (!ip) return;
      const list2 = loginLogOf(v.id);
      const entry = list2.find((e) => e.at === stamp);
      if (entry) { entry.ip = ip; saveLoginLog(v.id, list2); }
    });
  }
  /* flatten every vendor's login log into one time-sorted list, for the admin panel */
  function allLoginLogs() {
    const out = [];
    VENDORS.forEach((v) => loginLogOf(v.id).forEach((e) => out.push({ vendorId: v.id, vendor: v.name, at: e.at, ip: e.ip || null })));
    out.sort((a, b) => b.at - a.at);
    return out;
  }
  window.AUTH = { VENDORS, ADMIN, get, set, logout, isAdmin, stockOf, loginLogOf, allLoginLogs };
})();
