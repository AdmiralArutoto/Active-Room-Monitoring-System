// Generates dependency-free placeholder map PNGs (site.png, 1st_floor.png,
// floor_n.png) so the dashboard renders out of the box. Replace the output with
// real maps anytime.
// Run: node generate-placeholders.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ── Minimal PNG encoder (RGB, no external deps) ──────────────────────────────
const CRC = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function encodePng(w, h, draw) {
  const px = Buffer.alloc(w * h * 3);
  const set = (x, y, r, g, b) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 3; px[i] = r; px[i + 1] = g; px[i + 2] = b;
  };
  draw(set, w, h);
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0; // filter: none
    px.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit, RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Drawing helpers ──────────────────────────────────────────────────────────
function mapImage(w, h, bg, grid, accent, blocks) {
  return encodePng(w, h, (set) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let c = bg;
      if (x % 64 === 0 || y % 64 === 0) c = grid;            // grid
      if (x < 3 || y < 3 || x >= w - 3 || y >= h - 3) c = accent; // border
      set(x, y, c[0], c[1], c[2]);
    }
    for (const [bx, by, bw, bh] of blocks) {
      for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) {
        const edge = x < bx + 2 || y < by + 2 || x >= bx + bw - 2 || y >= by + bh - 2;
        set(x, y, ...(edge ? accent : [255, 255, 255]));
      }
    }
  });
}

const out = (name, buf) => { fs.writeFileSync(path.join(__dirname, name), buf); console.log(`wrote ${name} (${buf.length} bytes)`); };

// Site: campus map placeholder with a few building blocks.
out('site.png', mapImage(1200, 800, [232, 237, 243], [214, 221, 230], [45, 143, 179],
  [[100, 90, 200, 150], [360, 90, 200, 150], [620, 90, 200, 150]]));

// First-floor plan placeholder (four room blocks, matching ROOMS_PER_FLOOR).
out('1st_floor.png', mapImage(1000, 700, [240, 243, 247], [220, 226, 233], [45, 143, 179],
  [[80, 70, 130, 110], [240, 70, 130, 110], [400, 70, 130, 110], [560, 70, 130, 110]]));

// Upper-floor plan placeholder (2nd floor and above) — tinted to distinguish it.
out('floor_n.png', mapImage(1000, 700, [240, 243, 247], [220, 226, 233], [56, 120, 160],
  [[80, 70, 130, 110], [240, 70, 130, 110], [400, 70, 130, 110], [560, 70, 130, 110]]));
