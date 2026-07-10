/* Firebase Storage upload helper.
   Moves image binaries OUT of Firestore documents (which cap at 1MB/doc) and
   into Cloud Storage, so a stored image becomes a short https URL instead of a
   fat base64 data-URI. A returned URL is a valid <img src> exactly like the
   data-URI was, so NO display code needs to change.

   window.bffUploadImage(file, maxPx, quality, storagePath)
     → Promise<string>
        · online + Storage available : uploads a JPEG to `storagePath`, resolves
          the download URL (https://…).
        · offline / no Storage        : resolves the JPEG data-URI (current
          behaviour) so the app keeps working locally.
     Always JPEG (delegates compression to window.bffResizeImage).

   window.bffStorageAvailable() → bool
   window.bffDeleteStorage(url|path) → Promise (best-effort; ignores missing) */
(function () {
  function stg() {
    return (window.CLOUD && window.CLOUD.storage) ? window.CLOUD.storage : null;
  }
  function stMod() {
    return (window.CLOUD && window.CLOUD.stMod) ? window.CLOUD.stMod : null;
  }
  window.bffStorageAvailable = function () { return !!(stg() && stMod()); };

  // data-URI -> Blob (no network; synchronous decode)
  function dataUriToBlob(uri) {
    const comma = uri.indexOf(",");
    const meta = uri.slice(0, comma);
    const isB64 = /;base64/i.test(meta);
    const mime = (meta.match(/data:([^;]+)/) || [, "image/jpeg"])[1];
    const data = uri.slice(comma + 1);
    if (isB64) {
      const bin = atob(data);
      const len = bin.length;
      const arr = new Uint8Array(len);
      for (let i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
      return new Blob([arr], { type: mime });
    }
    return new Blob([decodeURIComponent(data)], { type: mime });
  }

  window.bffUploadImage = function (file, maxPx, quality, storagePath) {
    // Always compress to JPEG first (also enforces the JPEG-only rule).
    return window.bffResizeImage(file, maxPx, quality).then(function (dataUri) {
      if (!window.bffStorageAvailable() || !storagePath) return dataUri; // offline → inline
      try {
        const s = stg(), m = stMod();
        const ref = m.ref(s, storagePath);
        const blob = dataUriToBlob(dataUri);
        return m.uploadBytes(ref, blob, { contentType: "image/jpeg" })
          .then(function () { return m.getDownloadURL(ref); })
          .catch(function () { return dataUri; }); // upload failed → keep inline, app still works
      } catch (e) { return dataUri; }
    });
  };

  // Re-upload an existing data-URI (used by the migration tool).
  window.bffUploadDataUri = function (dataUri, storagePath) {
    if (typeof dataUri !== "string" || dataUri.slice(0, 5) !== "data:") return Promise.resolve(dataUri);
    if (!window.bffStorageAvailable() || !storagePath) return Promise.resolve(dataUri);
    try {
      const s = stg(), m = stMod();
      const ref = m.ref(s, storagePath);
      return m.uploadBytes(ref, dataUriToBlob(dataUri), { contentType: "image/jpeg" })
        .then(function () { return m.getDownloadURL(ref); })
        .catch(function () { return dataUri; });
    } catch (e) { return Promise.resolve(dataUri); }
  };

  window.bffDeleteStorage = function (urlOrPath) {
    if (!window.bffStorageAvailable() || !urlOrPath) return Promise.resolve();
    try {
      const s = stg(), m = stMod();
      // ref() accepts a gs:///https download URL or a path string
      const ref = /^https?:|^gs:/.test(urlOrPath) ? m.ref(s, m.ref(s, urlOrPath).fullPath) : m.ref(s, urlOrPath);
      return m.deleteObject(ref).catch(function () {});
    } catch (e) { return Promise.resolve(); }
  };
})();
