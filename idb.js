/* Tiny IndexedDB key-value store. Large quota (hundreds of MB) — unlike
   localStorage's ~5MB — so embedded image data-URIs persist reliably.
   Falls back gracefully; callers handle the unavailable case. */
window.KV = (function () {
  const DBN = "bff-store", STORE = "kv", VER = 1;
  let dbp = null;
  const available = (() => { try { return !!window.indexedDB; } catch (e) { return false; } })();

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      let r;
      try { r = indexedDB.open(DBN, VER); } catch (e) { return rej(e); }
      r.onupgradeneeded = () => { try { r.result.createObjectStore(STORE); } catch (e) {} };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
      r.onblocked = () => rej(new Error("idb blocked"));
    });
    return dbp;
  }
  async function get(k) {
    try {
      const db = await open();
      return await new Promise((res, rej) => {
        const req = db.transaction(STORE, "readonly").objectStore(STORE).get(k);
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
      });
    } catch (e) { return undefined; }
  }
  async function set(k, v) {
    const db = await open();
    return new Promise((res, rej) => {
      const req = db.transaction(STORE, "readwrite").objectStore(STORE).put(v, k);
      req.onsuccess = () => res(true);
      req.onerror = () => rej(req.error);
    });
  }
  async function del(k) {
    try {
      const db = await open();
      return await new Promise((res) => {
        const req = db.transaction(STORE, "readwrite").objectStore(STORE).delete(k);
        req.onsuccess = () => res(true);
        req.onerror = () => res(false);
      });
    } catch (e) { return false; }
  }
  async function keys() {
    try {
      const db = await open();
      return await new Promise((res, rej) => {
        const req = db.transaction(STORE, "readonly").objectStore(STORE).getAllKeys();
        req.onsuccess = () => res(req.result || []);
        req.onerror = () => rej(req.error);
      });
    } catch (e) { return []; }
  }
  return { get, set, del, keys, available };
})();
