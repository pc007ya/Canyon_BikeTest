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

    const app = appMod.initializeApp(cfg);
    const auth = authMod.getAuth(app);
    const db = fsMod.getFirestore(app);
    _api = { app, auth, db, authMod, fsMod };

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
let _unsubData = null, _unsubStock = null, _unsubReport = null, _writeTimer = null;
/* Guard against a real race: our own debounced write (800ms) can be beaten by
   a late/out-of-order remote snapshot carrying OLDER data, which would
   silently revert an edit the admin just made (e.g. a version/name change)
   before the local write even goes out. Every push is stamped with a
   monotonic `_rev`; incoming snapshots older than the last rev WE know about
   are ignored instead of blindly overwriting local state. */
let _lastRev = 0;
function startSync() {
  const { db, fsMod } = _api;
  const dataRef = fsMod.doc(db, "bff", "data");

  // 1) initial pull (or seed if cloud empty — admin only, vendors can't write master data)
  fsMod.getDoc(dataRef).then((snap) => {
    if (snap.exists()) {
      const d = snap.data();
      if ((d._rev || 0) >= _lastRev) { _lastRev = d._rev || _lastRev; window.STORE.hydrate(d); }
    } else {
      const u = window.AUTH && window.AUTH.get && window.AUTH.get();
      if (u && u.role === "admin") {
        const seed = window.STORE.snapshotData();
        seed._rev = ++_lastRev;
        fsMod.setDoc(dataRef, seed);
      }
    }
  }).catch((e) => setStatus("error", e.message));

  // 2) subscribe to remote data changes
  _unsubData = fsMod.onSnapshot(dataRef, (snap) => {
    if (!snap.exists()) return;
    if (snap.metadata.hasPendingWrites) return; // ignore our own optimistic write
    const d = snap.data();
    if ((d._rev || 0) < _lastRev) return; // stale/out-of-order — do not clobber a newer local edit
    _lastRev = d._rev || _lastRev;
    window.STORE.hydrate(d);
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
        try { localStorage.setItem("bff:report:" + ch.doc.id, JSON.stringify(ch.doc.data())); } catch (e) {}
      });
      window.dispatchEvent(new CustomEvent("bff:reportchange"));
    }, (e) => setStatus("error", e.message));
  } else if (me) {
    _unsubReport = fsMod.onSnapshot(fsMod.doc(db, "bff_report", me.id), (snap) => {
      if (snap.metadata.hasPendingWrites) return;
      if (snap.exists()) { try { localStorage.setItem("bff:report:" + me.id, JSON.stringify(snap.data())); } catch (e) {} }
      window.dispatchEvent(new CustomEvent("bff:reportchange"));
    }, (e) => setStatus("error", e.message));
  }

  // 4) push local data changes (debounced)
  window.addEventListener("bff:datachange", onLocalData);
  // 5) push local stock changes for the active vendor
  window.addEventListener("bff:stockchange", onLocalStock);
  // 6) push local report changes for the active vendor
  window.addEventListener("bff:reportchange", onLocalReport);
}
function stopSync() {
  if (_unsubData) { _unsubData(); _unsubData = null; }
  if (_unsubStock) { _unsubStock(); _unsubStock = null; }
  if (_unsubReport) { _unsubReport(); _unsubReport = null; }
  window.removeEventListener("bff:datachange", onLocalData);
  window.removeEventListener("bff:stockchange", onLocalStock);
  window.removeEventListener("bff:reportchange", onLocalReport);
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
    // Firestore caps any one document at 1,048,576 bytes. Guard proactively so
    // the admin gets an actionable hint instead of a raw rejected write.
    let size = 0;
    try { size = new Blob([JSON.stringify(data)]).size; } catch (e) { try { size = JSON.stringify(data).length; } catch (e2) {} }
    if (size > 1000000) {
      setStatus("error", "資料超過雲端單檔上限 1MB（目前約 " + (size / 1048576).toFixed(2) + "MB）。請到「管理 → 備份」按『壓縮現有圖片』後再試。 / Data exceeds the 1MB cloud limit — use Manage → Backup → “Compress existing images”.");
      return;
    }
    fsMod.setDoc(fsMod.doc(db, "bff", "data"), data).catch((e) => setStatus("error", e.message));
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
  try { map = JSON.parse(localStorage.getItem("bff:report:" + u.id) || "{}"); } catch (e) {}
  fsMod.setDoc(fsMod.doc(db, "bff_report", u.id), map).catch((e) => setStatus("error", e.message));
}
