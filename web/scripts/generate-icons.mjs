import fs from "fs";
import path from "path";
import zlib from "zlib";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const tb = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([tb, data])));
  return Buffer.concat([len, tb, data, crc]);
};
const lerp = (a, b, t) => Math.round(a + (b - a) * t);

// Neutral PWA treatment: installed app icons are OS-cached, while the browser
// favicon and in-app mark follow the live palette.
const A = { r: 0x20, g: 0x20, b: 0x32 };
const B = { r: 0x0a, g: 0x0a, b: 0x0f };
const GOLD = { r: 0xf5, g: 0xa5, b: 0x24 };
const BG = { r: 0x0a, g: 0x0a, b: 0x0f };

function makeIcon(size, maskable) {
  const pad = maskable ? Math.round(size * 0.14) : 0;
  const rows = [];
  const cx = (size - 1) / 2;
  const glowY = size * 0.42;
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0;
    for (let x = 0; x < size; x++) {
      const o = 1 + x * 4;
      // background (rounded square for maskable, else full-bleed gradient)
      const t = (x + y) / (2 * (size - 1));
      let r = lerp(A.r, B.r, t), g = lerp(A.g, B.g, t), b = lerp(A.b, B.b, t), a = 255;

      if (maskable) {
        const inPad = x >= pad && x < size - pad && y >= pad && y < size - pad;
        if (!inPad) {
          r = BG.r; g = BG.g; b = BG.b; a = 255;
        }
      }

      // gold glow emanating from the "box" opening
      const dxg = (x - cx) / (size * 0.5);
      const dyg = (y - glowY) / (size * 0.35);
      const glow = Math.max(0, 1 - Math.sqrt(dxg * dxg + dyg * dyg));
      if (glow > 0) {
        const gg = Math.pow(glow, 1.6);
        r = lerp(r, GOLD.r, gg * 0.9);
        g = lerp(g, GOLD.g, gg * 0.9);
        b = lerp(b, GOLD.b, gg * 0.9);
      }

      // box silhouette (dark) in lower half
      const bx0 = size * 0.24, bx1 = size * 0.76;
      const by0 = size * 0.5, by1 = size * 0.78;
      if (x >= bx0 && x <= bx1 && y >= by0 && y <= by1) {
        // lid gap glow at top edge of box
        if (y < by0 + size * 0.05) {
          r = GOLD.r; g = GOLD.g; b = GOLD.b;
        } else {
          r = lerp(BG.r, 30, 0.4); g = lerp(BG.g, 30, 0.4); b = lerp(BG.b, 40, 0.4);
        }
      }

      // Crisp PB monogram, legible at launcher and favicon sizes.
      const px = x / size, py = y / size;
      const white = { r: 248, g: 250, b: 252 };
      const pStem = px >= 0.32 && px <= 0.37 && py >= 0.25 && py <= 0.67;
      const pTop = px >= 0.36 && px <= 0.50 && ((py >= 0.25 && py <= 0.30) || (py >= 0.43 && py <= 0.48));
      const pSide = px >= 0.47 && px <= 0.52 && py >= 0.29 && py <= 0.44;
      const bStem = px >= 0.52 && px <= 0.57 && py >= 0.25 && py <= 0.67;
      const bBars = px >= 0.56 && px <= 0.69 && ((py >= 0.25 && py <= 0.30) || (py >= 0.43 && py <= 0.48) || (py >= 0.62 && py <= 0.67));
      const bSide = px >= 0.66 && px <= 0.71 && ((py >= 0.29 && py <= 0.44) || (py >= 0.47 && py <= 0.63));
      if (pStem || pTop || pSide || bStem || bBars || bSide) { r = white.r; g = white.g; b = white.b; }

      row[o] = r; row[o + 1] = g; row[o + 2] = b; row[o + 3] = a;
    }
    rows.push(row);
  }
  const raw = Buffer.concat(rows);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

const outDir = path.join(__dirname, "..", "public", "icons");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "icon-192.png"), makeIcon(192, false));
fs.writeFileSync(path.join(outDir, "icon-512.png"), makeIcon(512, false));
fs.writeFileSync(path.join(outDir, "icon-maskable-512.png"), makeIcon(512, true));
fs.writeFileSync(path.join(__dirname, "..", "public", "favicon.png"), makeIcon(64, false));
console.log("Generated PBox PWA icons in public/icons/");
