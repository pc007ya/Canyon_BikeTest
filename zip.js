/* Minimal store-only (no compression) ZIP writer + data-URI helpers.
   PNG/JPEG are already compressed, so store mode keeps files intact and small enough.
   window.makeZip([{name, data:Uint8Array}]) -> Blob
   window.dataUriToBytes("data:image/png;base64,..") -> {bytes, ext} | null */
(function () {
  const crcTable = (function () {
    let c, t = [];
    for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  const u16 = (n) => new Uint8Array([n & 255, (n >> 8) & 255]);
  const u32 = (n) => new Uint8Array([n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >> 24) & 255]);
  function concat(arrs) { let len = 0; arrs.forEach((a) => len += a.length); const out = new Uint8Array(len); let o = 0; arrs.forEach((a) => { out.set(a, o); o += a.length; }); return out; }

  window.makeZip = function (files) {
    const enc = new TextEncoder();
    const locals = [], central = [];
    let offset = 0;
    files.forEach((f) => {
      const nameBytes = enc.encode(f.name);
      const crc = crc32(f.data);
      const size = f.data.length;
      const local = concat([u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(size), u32(size), u16(nameBytes.length), u16(0), nameBytes, f.data]);
      locals.push(local);
      const cen = concat([u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(size), u32(size), u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), nameBytes]);
      central.push(cen);
      offset += local.length;
    });
    const centralStart = offset;
    let centralSize = 0; central.forEach((c) => centralSize += c.length);
    const end = concat([u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(centralSize), u32(centralStart), u16(0)]);
    return new Blob([concat([...locals, ...central, end])], { type: "application/zip" });
  };

  window.dataUriToBytes = function (uri) {
    if (typeof uri !== "string" || uri.slice(0, 5) !== "data:") return null;
    const i = uri.indexOf(",");
    if (i < 0) return null;
    const meta = uri.slice(5, i);
    let bin;
    try { bin = atob(uri.slice(i + 1)); } catch (e) { return null; }
    const arr = new Uint8Array(bin.length);
    for (let j = 0; j < bin.length; j++) arr[j] = bin.charCodeAt(j);
    const mime = meta.split(";")[0];
    const ext = mime.indexOf("png") >= 0 ? "png" : (mime.indexOf("jpeg") >= 0 || mime.indexOf("jpg") >= 0) ? "jpg" : mime.indexOf("webp") >= 0 ? "webp" : mime.indexOf("gif") >= 0 ? "gif" : "img";
    return { bytes: arr, ext };
  };
})();
