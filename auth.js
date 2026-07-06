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
  // Admin access code is overridable (stored in localStorage, synced via cloud).
  try {
    Object.defineProperty(ADMIN, "code", {
      enumerable: true,
      get() { try { return localStorage.getItem("bff:admincode") || "admin"; } catch (e) { return "admin"; } },
    });
  } catch (e) { ADMIN.code = "admin"; }
  const KEY = "bff:vendor";
  function get() { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } }
  function set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} window.dispatchEvent(new CustomEvent("bff:authchange")); }
  function logout() { try { localStorage.removeItem(KEY); } catch (e) {} window.dispatchEvent(new CustomEvent("bff:authchange")); }
  function isAdmin(u) { return !!(u && u.role === "admin"); }
  /* read a given vendor's stock-take map: { partKey: {qty, by, at} } */
  function stockOf(vendorId) { try { return JSON.parse(localStorage.getItem("bff:stock:" + vendorId) || "{}"); } catch (e) { return {}; } }
  window.AUTH = { VENDORS, ADMIN, get, set, logout, isAdmin, stockOf };
})();
