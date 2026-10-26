const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function crc(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function png(w, h, r, g, b) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const i = y * (w * 3 + 1) + 1 + x * 3;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }
  const comp = zlib.deflateSync(raw);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', comp), chunk('IEND', Buffer.alloc(0))]);
}

const root = path.join(__dirname, '..');
const files = [
  ['assets/icon.png', 1024, 1024],
  ['assets/adaptive-icon.png', 1024, 1024],
  ['assets/splash.png', 1284, 2778],
  ['assets/notification-icon.png', 96, 96],
];

fs.mkdirSync(path.join(root, 'assets', 'sounds'), { recursive: true });
for (const [rel, w, h] of files) {
  const out = path.join(root, rel);
  fs.writeFileSync(out, png(w, h, 13, 59, 46));
  console.log('wrote', rel);
}
