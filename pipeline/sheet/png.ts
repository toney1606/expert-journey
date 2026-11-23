import { crc32, deflateSync, inflateSync } from 'node:zlib';

/** Remotion's bundled ffmpeg has no `tile`/`drawtext`/`hstack`, so the sheet is composed here. */

const chunk = (type: string, data: Buffer): Buffer => {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), body.length + 4);
  return out;
};

/** Encode packed RGB24 pixels as an 8-bit truecolour PNG. */
export const encodePng = (rgb: Buffer, width: number, height: number): Buffer => {
  if (rgb.length !== width * height * 3)
    throw new Error('rgb buffer does not match width x height');
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

/** 3x5 pixel glyphs for time labels. */
const GLYPHS: Record<string, readonly string[]> = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '010', '010', '010'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
  ':': ['000', '010', '000', '010', '000'],
};

export type Canvas = { width: number; height: number; data: Buffer };

export const newCanvas = (width: number, height: number, bg: [number, number, number]): Canvas => {
  const data = Buffer.alloc(width * height * 3);
  for (let i = 0; i < width * height; i += 1) {
    data[i * 3] = bg[0];
    data[i * 3 + 1] = bg[1];
    data[i * 3 + 2] = bg[2];
  }
  return { width, height, data };
};

/** Copy a packed RGB tile onto the canvas at (x, y). */
export const blit = (
  canvas: Canvas,
  tile: Buffer,
  tileWidth: number,
  tileHeight: number,
  x: number,
  y: number,
): void => {
  for (let row = 0; row < tileHeight; row += 1) {
    tile.copy(
      canvas.data,
      ((y + row) * canvas.width + x) * 3,
      row * tileWidth * 3,
      (row + 1) * tileWidth * 3,
    );
  }
};

const fillRect = (
  canvas: Canvas,
  x: number,
  y: number,
  w: number,
  h: number,
  c: number[],
): void => {
  for (let yy = y; yy < Math.min(y + h, canvas.height); yy += 1) {
    for (let xx = x; xx < Math.min(x + w, canvas.width); xx += 1) {
      const at = (yy * canvas.width + xx) * 3;
      canvas.data[at] = c[0] ?? 0;
      canvas.data[at + 1] = c[1] ?? 0;
      canvas.data[at + 2] = c[2] ?? 0;
    }
  }
};

/** Draw `text` (digits and ':') in white on a black plate at (x, y); each glyph pixel is `px` square. */
export const drawLabel = (canvas: Canvas, text: string, x: number, y: number, px: number): void => {
  const advance = 4 * px;
  fillRect(canvas, x, y, text.length * advance + px, 7 * px, [0, 0, 0]);
  [...text].forEach((ch, index) => {
    const glyph = GLYPHS[ch];
    if (!glyph) return;
    glyph.forEach((line, gy) =>
      [...line].forEach((bit, gx) => {
        if (bit === '1') {
          fillRect(
            canvas,
            x + px + index * advance + gx * px,
            y + px + gy * px,
            px,
            px,
            [255, 255, 255],
          );
        }
      }),
    );
  });
};

/** Decode an 8-bit, non-interlaced RGB (colour type 2) PNG such as ffmpeg writes with `-pix_fmt rgb24`. */
export const decodePng = (png: Buffer): { width: number; height: number; rgb: Buffer } => {
  if (png.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let width = 0;
  let height = 0;
  const idat: Buffer[] = [];
  for (let pos = 8; pos < png.length;) {
    const length = png.readUInt32BE(pos);
    const type = png.subarray(pos + 4, pos + 8).toString('ascii');
    const data = png.subarray(pos + 8, pos + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 2 || data[12] !== 0) {
        throw new Error('only 8-bit non-interlaced RGB PNG is supported');
      }
    } else if (type === 'IDAT') {
      idat.push(data);
    }
    pos += length + 12;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * 3;
  const rgb = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)] ?? 0;
    for (let x = 0; x < stride; x += 1) {
      const cur = raw[y * (stride + 1) + 1 + x] ?? 0;
      const left = x >= 3 ? (rgb[y * stride + x - 3] ?? 0) : 0;
      const up = y > 0 ? (rgb[(y - 1) * stride + x] ?? 0) : 0;
      const upLeft = x >= 3 && y > 0 ? (rgb[(y - 1) * stride + x - 3] ?? 0) : 0;
      let add = 0;
      if (filter === 1) add = left;
      else if (filter === 2) add = up;
      else if (filter === 3) add = (left + up) >> 1;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        add = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      }
      rgb[y * stride + x] = (cur + add) & 255;
    }
  }
  return { width, height, rgb };
};
