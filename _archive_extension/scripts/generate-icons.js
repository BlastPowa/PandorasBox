const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeBuffer = Buffer.from(type, "ascii");
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function makeIcon(size) {
  const from = { r: 0x00, g: 0xd4, b: 0xff };
  const to = { r: 0x7b, g: 0x2f, b: 0xbe };
  const rows = [];
  for (let y = 0; y < size; y += 1) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0;
    for (let x = 0; x < size; x += 1) {
      const t = (x + y) / (2 * (size - 1) || 1);
      const cx = x - (size - 1) / 2;
      const cy = y - (size - 1) / 2;
      const dist = Math.sqrt(cx * cx + cy * cy) / (size / 2);
      const inCircle = dist <= 1;
      const offset = 1 + x * 4;
      if (inCircle) {
        const barWidth = Math.max(1, Math.floor(size / 8));
        const gap = Math.max(1, Math.floor(size / 5));
        const centerX = Math.floor(size / 2);
        const isBar =
          Math.abs(x - (centerX - gap)) < barWidth ||
          Math.abs(x - centerX) < barWidth ||
          Math.abs(x - (centerX + gap)) < barWidth;
        const inner = dist < 0.72 && isBar && y > size * 0.28 && y < size * 0.72;
        if (inner) {
          row[offset] = 8;
          row[offset + 1] = 8;
          row[offset + 2] = 8;
          row[offset + 3] = 255;
        } else {
          row[offset] = lerp(from.r, to.r, t);
          row[offset + 1] = lerp(from.g, to.g, t);
          row[offset + 2] = lerp(from.b, to.b, t);
          row[offset + 3] = 255;
        }
      } else {
        row[offset + 3] = 0;
      }
    }
    rows.push(row);
  }
  const raw = Buffer.concat(rows);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, "..", "icons");
fs.mkdirSync(outDir, { recursive: true });
for (const size of [16, 32, 48, 128]) {
  const file = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(file, makeIcon(size));
  console.log(`wrote ${file}`);
}
