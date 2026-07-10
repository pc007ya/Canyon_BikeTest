/* Optional Firebase cloud sync (Auth + Firestore).
   STAYS FULLY LOCAL unless a Firebase config is provided
   (via localStorage "bff:fbconfig" or window.FIREBASE_CONFIG).

   Architecture: STORE remains the in-memory + localStorage source of truth.
   This layer mirrors STORE <-> Firestore so multiple machines share one dataset:
     - doc  bff/data            { items, vendors, parts, log }     (admin-edited)
     - docs bff_stock/<vendorId>{ ...stock map }                  (per-vendor)
   Last-write-wins on the data doc; per-vendor stock writes only touch their own doc.

   Loaded as a module; self-guards so the app works with no config. */

const CLOUD = {
  enabled: false,
  status: "local",          // local | connecting | online | signedout | error
  message: "",
  user: null,
  configured: false,
  setConfig, disableCloud, signIn, signOutCloud,
};
window.CLOUD = CLOUD;

function emitStatus() { try { window.dispatchEvent(new CustomEvent("bff:cloudstatus")); } catch (e) {} }
function setStatus(s, msg) { CLOUD.status = s; CLOUD.message = msg || ""; emitStatus(); }

function readConfig() {
  if (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey) return window.FIREBASE_CONFIG;
  try { const v = JSON.parse(localStorage.getItem("bff:fbconfig") || "null"); return v && v.apiKey ? v : null; } catch (e) { return null; }
}
function setConfig(text) {
  let cfg;
  try { cfg = typeof text === "string" ? JSON.parse(text) : text; } catch (e) { throw new Error("設定 JSON 格式錯誤 / Invalid config JSON"); }
  if (!cfg || !cfg.apiKey || !cfg.projectId) throw new Error("缺少 apiKey / projectId");
  localStorage.setItem("bff:fbconfig", JSON.stringify(cfg));
  location.reload();
}
function disableCloud() { localStorage.removeItem("bff:fbconfig"); location.reload(); }

// announce initial (local) status after load so UI can read it
setTimeout(emitStatus, 0);

let _api = null;        // { auth, db, fns... }
let _signInImpl = null;
let _signOutImpl = null;
function signIn() { return _signInImpl ? _signInImpl() : Promise.resolve(); }
function signOutCloud() { return _signOutImpl ? _signOutImpl() : Promise.resolve(); }

(async function init() {
  const cfg = readConfig();
  CLOUD.configured = !!cfg;
  if (!cfg) { setStatus("local"); return; }
  CLOUD.enabled = true;
  setStatus("connecting");
  try {
    const appMod = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
    const authMod = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
    const fsMod = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    let stMod = null;
    try { stMod = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js"); } catch (e) { stMod = null; }

    const app = appMod.initializeApp(cfg);
    const auth = authMod.getAuth(app);
    const db = fsMod.getFirestore(app);
    _api = { app, auth, db, authMod, fsMod, stMod };
    // Expose a Storage handle for storage.js (bffUploadImage). Absent =>
    // uploads fall back to inline data-URIs (offline / storage unavailable).
    if (stMod) { try { CLOUD.storage = stMod.getStorage(app); CLOUD.stMod = stMod; } catch (e) { CLOUD.storage = null; } }

    const provider = new authMod.GoogleAuthProvider();
    _signInImpl = () => authMod.signInWithPopup(auth, provider).catch((e) => setStatus("error", e.message));
    _signOutImpl = () => authMod.signOut(auth);

    // Role-aware cloud connection:
    //  - Admin signs in with Google (button) -> can edit master data.
    //  - Everyone else (vendors AND the login screen itself) connects SILENTLY
    //    as an anonymous user, so the latest vendor list / access codes are
    //    pulled BEFORE login and vendor stock-takes reach the cloud.
    function roleIsAdmin() {
      const u = window.AUTH && window.AUTH.get && window.AUTH.get();
      return !!(u && u.role === "admin");
    }
    function maybeAnonSignIn() {
      if (auth.currentUser) return;       // already connected
      if (roleIsAdmin()) return;          // admin waits for the Google button
      authMod.signInAnonymously(auth).catch((e) => setStatus("error", e.message));
    }

    authMod.onAuthStateChanged(auth, (user) => {
      // An admin must NOT stay on an anonymous connection: Firestore rejects
      // master-data writes from anyone but the Google admin, which would make
      // edits (e.g. add vendor) silently fail. Drop anon admins to local-only.
      if (user && user.isAnonymous && roleIsAdmin()) {
        authMod.signOut(auth);
        return;
      }
      CLOUD.user = user
        ? (user.isAnonymous ? { anon: true } : { name: user.displayName, email: user.email, photo: user.photoURL })
        : null;
      if (user) { setStatus("online"); startSync(); }
      else { setStatus("signedout"); stopSync(); maybeAnonSignIn(); }
    });

    // When the local user switches (login / logout / vendor pick), rebind the
    // sync so the correct role-based behaviour is active.
    window.addEventListener("bff:authchange", function () {
      // Admin on an anonymous session -> go local-only (no rejected writes).
      if (auth.currentUser && auth.currentUser.isAnonymous && roleIsAdmin()) {
        authMod.signOut(auth);
        return;
      }
      if (auth.currentUser) { stopSync(); startSync(); }
      else maybeAnonSignIn();
    });
    maybeAnonSignIn();
  } catch (e) {
    setStatus("error", e && e.message ? e.message : String(e));
  }
})();

/* ---- sync engine ---- */
let _unsubData = null, _unsubStock = null, _unsubReport = null, _unsubLoginLog = null, _unsubStepPhoto = null, _writeTimer = null;
/* Guard against a real race: our own debounced write (800ms) can be beaten by
   a late/out-of-order remote snapshot carrying OLDER data, which would
   silently revert an edit the admin just made (e.g. a version/name change)
   before the local write even goes out. Every push is stamped with a
   monotonic `_rev`; incoming snapshots older than the last rev WE know about
   are ignored instead of blindly overwriting local state. */
let _lastRev = 0;

/* ---- master-doc chunking ----
   Firestore caps ANY single document at 1,048,576 bytes. The master snapshot
   (all items + libraries + product photos as data-URIs) can exceed that. So
   instead of one `bff/data` doc we may split the serialized snapshot across
   several docs:
     bff/data        = { _rev, chunked:true, chunks:N }   (small meta)
     bff/data_0..N-1 = { _rev, i, s:<slice of JSON string> }
   When the payload is small we keep the legacy single inline doc (no `chunked`
   flag) so old readers still work. Reassembly requires every chunk present and
   sharing the meta's _rev, else we wait for the next consistent snapshot. */
const CHUNK_CHARS = 700000; // ~700 KB per chunk doc, safely under the 1 MB cap
function chunkSafe(json) {
  const parts = [];
  let i = 0;
  while (i < json.length) {
    let end = Math.min(i + CHUNK_CHARS, json.length);
    if (end < json.length) {
      const code = json.charCodeAt(end - 1); // never split a surrogate pair (emoji)
      if (code >= 0xD800 && code <= 0xDBFF) end--;
    }
    parts.push(json.slice(i, end));
    i = end;
  }
  return parts;
}
function writeMaster(data) {
  const { db, fsMod } = _api;
  const json = JSON.stringify(data);
  const dataRef = fsMod.doc(db, "bff", "data");
  if (json.length <= 900000) {
    // small enough for one doc — legacy inline format
    return fsMod.setDoc(dataRef, data);
  }
  const parts = chunkSafe(json);
  const batch = fsMod.writeBatch(db);
  batch.set(dataRef, { _rev: data._rev || 0, chunked: true, chunks: parts.length, ts: Date.now() });
  parts.forEach((s, i) => batch.set(fsMod.doc(db, "bff", "data_" + i), { _rev: data._rev || 0, i: i, s: s }));
  return batch.commit();
}
async function readMaster(meta) {
  if (!meta || !meta.chunked) return meta; // legacy inline doc IS the data
  const { db, fsMod } = _api;
  const gets = [];
  for (let i = 0; i < meta.chunks; i++) gets.push(fsMod.getDoc(fsMod.doc(db, "bff", "data_" + i)));
  const snaps = await Promise.all(gets);
  let json = "";
  for (let i = 0; i < meta.chunks; i++) {
    const s = snaps[i];
    if (!s.exists()) throw new Error("missing chunk " + i);
    const d = s.data();
    if ((d._rev || 0) !== (meta._rev || 0)) throw new Error("chunk rev mismatch");
    json += d.s || "";
  }
  return JSON.parse(json);
}
function startSync() {
  const { db, fsMod } = _api;
  const dataRef = fsMod.doc(db, "bff", "data");

  // 1) initial pull (or seed if cloud empty — admin only, vendors can't write master data)
  fsMod.getDoc(dataRef).then(async (snap) => {
    if (snap.exists()) {
      const meta = snap.data();
      if ((meta._rev || 0) >= _lastRev) {
        try { const d = await readMaster(meta); _lastRev = meta._rev || _lastRev; window.STORE.hydrate(d); }
        catch (e) { /* incomplete/mid-write chunk set — a later snapshot will be consistent */ }
      }
    } else {
      const u = window.AUTH && window.AUTH.get && window.AUTH.get();
      if (u && u.role === "admin") {
        const seed = window.STORE.snapshotData();
        seed._rev = ++_lastRev;
        writeMaster(seed).catch((e) => setStatus("error", e.message));
      }
    }
  }).catch((e) => setStatus("error", e.message));

  // 2) subscribe to remote data changes
  _unsubData = fsMod.onSnapshot(dataRef, async (snap) => {
    if (!snap.exists()) return;
    if (snap.metadata.hasPendingWrites) return; // ignore our own optimistic write
    const meta = snap.data();
    if ((meta._rev || 0) < _lastRev) return; // stale/out-of-order — do not clobber a newer local edit
    try {
      const d = await readMaster(meta);
      if ((meta._rev || 0) < _lastRev) return; // re-check after async chunk fetch
      _lastRev = meta._rev || _lastRev;
      window.STORE.hydrate(d);
    } catch (e) { /* chunks not all present yet — wait for the next snapshot */ }
  }, (e) => setStatus("error", e.message));

  // 3) subscribe to vendor stock docs.
  //    Admin watches ALL vendors (for the overview + notifications);
  //    a vendor watches only their OWN doc.
  const me = window.AUTH && window.AUTH.get && window.AUTH.get();
  if (me && me.role === "admin") {
    _unsubStock = fsMod.onSnapshot(fsMod.collection(db, "bff_stock"), (qs) => {
      qs.docChanges().forEach((ch) => {
        if (ch.doc.metadata.hasPendingWrites) return;
        try { localStorage.setItem("bff:stock:" + ch.doc.id, JSON.stringify(ch.doc.data())); } catch (e) {}
      });
      window.dispatchEvent(new CustomEvent("bff:stockchange"));
    }, (e) => setStatus("error", e.message));
  } else if (me) {
    _unsubStock = fsMod.onSnapshot(fsMod.doc(db, "bff_stock", me.id), (snap) => {
      if (snap.metadata.hasPendingWrites) return;
      if (snap.exists()) { try { localStorage.setItem("bff:stock:" + me.id, JSON.stringify(snap.data())); } catch (e) {} }
      window.dispatchEvent(new CustomEvent("bff:stockchange"));
    }, (e) => setStatus("error", e.message));
  }

  // 3b) subscribe to vendor report docs (same role split as stock).
  if (me && me.role === "admin") {
    _unsubReport = fsMod.onSnapshot(fsMod.collection(db, "bff_report"), (qs) => {
      qs.docChanges().forEach((ch) => {
        if (ch.doc.metadata.hasPendingWrites) return;
        try { window.bffReportPut(ch.doc.id, ch.doc.data()); } catch (e) {}
      });
      window.dispatchEvent(new CustomEvent("bff:reportchange"));
    }, (e) => setStatus("error", e.message));
  } else if (me) {
    _unsubReport = fsMod.onSnapshot(fsMod.doc(db, "bff_report", me.id), (snap) => {
      if (snap.metadata.hasPendingWrites) return;
      if (snap.exists()) { try { window.bffReportPut(me.id, snap.data()); } catch (e) {} }
      window.dispatchEvent(new CustomEvent("bff:reportchange"));
    }, (e) => setStatus("error", e.message));
  }

  // 3c) subscribe to vendor login-log docs (admin only — vendors don't need to read this back).
  if (me && me.role === "admin") {
    _unsubLoginLog = fsMod.onSnapshot(fsMod.collection(db, "bff_loginlog"), (qs) => {
      qs.docChanges().forEach((ch) => {
        if (ch.doc.metadata.hasPendingWrites) return;
        const d = ch.doc.data() || {};
        try { localStorage.setItem("bff:loginlog:" + ch.doc.id, JSON.stringify(d.entries || [])); } catch (e) {}
      });
      window.dispatchEvent(new CustomEvent("bff:loginlogchange"));
    }, (e) => setStatus("error", e.message));
  }

  // 3d) subscribe to vendor step-comparison-photo docs (same role split as stock/report).
  //     Admin gets read-only visibility into every vendor's submissions; a
  //     vendor only pulls their own (and never writes anyone else's).
  if (me && me.role === "admin") {
    _unsubStepPhoto = fsMod.onSnapshot(fsMod.collection(db, "bff_stepphoto"), (qs) => {
      qs.docChanges().forEach((ch) => {
        if (ch.doc.metadata.hasPendingWrites) return;
        try { window.STORE.stepphoto_putMap(ch.doc.id, ch.doc.data()); } catch (e) {}
      });
      window.dispatchEvent(new CustomEvent("bff:stepphotochange"));
    }, (e) => setStatus("error", e.message));
  } else if (me) {
    _unsubStepPhoto = fsMod.onSnapshot(fsMod.doc(db, "bff_stepphoto", me.id), (snap) => {
      if (snap.metadata.hasPendingWrites) return;
      if (snap.exists()) { try { window.STORE.stepphoto_putMap(me.id, snap.data()); } catch (e) {} }
      window.dispatchEvent(new CustomEvent("bff:stepphotochange"));
    }, (e) => setStatus("error", e.message));
  }

  // 4) push local data changes (debounced)
  window.addEventListener("bff:datachange", onLocalData);
  // 5) push local stock changes for the active vendor
  window.addEventListener("bff:stockchange", onLocalStock);
  // 6) push local report changes for the active vendor
  window.addEventListener("bff:reportchange", onLocalReport);
  // 7) push local login-log changes for the active vendor (fires on login + once IP resolves)
  window.addEventListener("bff:loginlogchange", onLocalLoginLog);
  if (me && me.role !== "admin") onLocalLoginLog(); // push any login recorded before this connection was ready
  // 8) push local step-comparison-photo changes for the active vendor
  window.addEventListener("bff:stepphotochange", onLocalStepPhoto);
}
function stopSync() {
  if (_unsubData) { _unsubData(); _unsubData = null; }
  if (_unsubStock) { _unsubStock(); _unsubStock = null; }
  if (_unsubReport) { _unsubReport(); _unsubReport = null; }
  if (_unsubLoginLog) { _unsubLoginLog(); _unsubLoginLog = null; }
  if (_unsubStepPhoto) { _unsubStepPhoto(); _unsubStepPhoto = null; }
  window.removeEventListener("bff:datachange", onLocalData);
  window.removeEventListener("bff:stockchange", onLocalStock);
  window.removeEventListener("bff:reportchange", onLocalReport);
  window.removeEventListener("bff:loginlogchange", onLocalLoginLog);
  window.removeEventListener("bff:stepphotochange", onLocalStepPhoto);
}
function onLocalData() {
  if (window.STORE.isApplyingRemote()) return;
  const u = window.AUTH && window.AUTH.get && window.AUTH.get();
  if (!u || u.role !== "admin") return; // only admin pushes master data
  // Bump the revision NOW (synchronously, before the debounce/write even
  // fires) so any remote snapshot that arrives while our write is in flight
  // is recognized as stale and ignored rather than reverting this edit.
  const myRev = ++_lastRev;
  clearTimeout(_writeTimer);
  _writeTimer = setTimeout(() => {
    const { db, fsMod } = _api;
    const data = window.STORE.snapshotData();
    data._rev = myRev;
    // Firestore caps any ONE document at 1,048,576 bytes; we split the payload
    // across several docs (writeMaster) so the whole dataset is no longer
    // bounded by that. Keep a generous outer guard for the batch total (~9 MB).
    let size = 0;
    try { size = new Blob([JSON.stringify(data)]).size; } catch (e) { try { size = JSON.stringify(data).length; } catch (e2) {} }
    if (size > 9000000) {
      setStatus("error", "資料過大（>9MB），無法同步。請到「管理 → 備份」壓縮圖片，或移除部分大圖。 / Dataset too large (>9MB) to sync — compress or remove large images.");
      return;
    }
    writeMaster(data).catch((e) => setStatus("error", e.message));
  }, 800);
}
function onLocalStock() {
  if (window.STORE.isApplyingRemote()) return;
  const u = window.AUTH && window.AUTH.get && window.AUTH.get();
  if (!u || u.role === "admin") return; // only vendors write their own stock
  const { db, fsMod } = _api;
  let map = {};
  try { map = JSON.parse(localStorage.getItem("bff:stock:" + u.id) || "{}"); } catch (e) {}
  fsMod.setDoc(fsMod.doc(db, "bff_stock", u.id), map).catch((e) => setStatus("error", e.message));
}
function onLocalReport() {
  if (window.STORE.isApplyingRemote()) return;
  const u = window.AUTH && window.AUTH.get && window.AUTH.get();
  if (!u || u.role === "admin") return; // only vendors write their own reports
  const { db, fsMod } = _api;
  let map = {};
  try { map = (window.bffReportGet && window.bffReportGet(u.id)) || JSON.parse(localStorage.getItem("bff:report:" + u.id) || "{}"); } catch (e) {}
  fsMod.setDoc(fsMod.doc(db, "bff_report", u.id), map).catch((e) => setStatus("error", e.message));
}
function onLocalLoginLog() {
  const u = window.AUTH && window.AUTH.get && window.AUTH.get();
  if (!u || u.role === "admin") return; // only vendors push their own login log
  const { db, fsMod } = _api;
  let list = [];
  try { list = JSON.parse(localStorage.getItem("bff:loginlog:" + u.id) || "[]"); } catch (e) {}
  fsMod.setDoc(fsMod.doc(db, "bff_loginlog", u.id), { entries: list }).catch((e) => setStatus("error", e.message));
}
function onLocalStepPhoto() {
  if (window.STORE.isApplyingRemote()) return;
  const u = window.AUTH && window.AUTH.get && window.AUTH.get();
  if (!u || u.role === "admin") return; // only vendors write their own comparison photos
  const { db, fsMod } = _api;
  let map = {};
  try { map = (window.STORE.stepphoto_mapForVendor && window.STORE.stepphoto_mapForVendor(u.id)) || JSON.parse(localStorage.getItem("bff:stepphoto:" + u.id) || "{}"); } catch (e) {}
  fsMod.setDoc(fsMod.doc(db, "bff_stepphoto", u.id), map).catch((e) => setStatus("error", e.message));
}
