import { safeZone } from '../../design/tokens';

/** The strip is a schematic of the orders table: a few hundred cells stand for millions of rows. */
export const STRIP_COLS = 27;
export const STRIP_ROWS = 6;
/** The strip is a graphic band that bleeds over the side margins: the full 1080px video width. */
export const STRIP_WIDTH = 1080;
/** How far the band reaches left of the content box (the box starts at the safe-zone margin). */
export const STRIP_BLEED = safeZone.left;
/** The strip always shows at least this many orange cells, so a LIMIT 10 cursor can collect ten of them. */
export const STRIP_MIN_PENDING = 10;
/** Length of the glowing trail behind the cursor, in cells. */
export const TRAIL_CELLS = 24;
/** Fixed seed: every scene draws the SAME table (same orange cells), so viewers see one table change. */
export const STRIP_SEED = 20261123;
/** Gap between cells (px). */
export const CELL_GAP = 4;
/** Height of the row above the strip that carries the floating "bỏ" label. */
export const FLOAT_ROW_HEIGHT = 44;
/** Height of the row under the strip with the "CŨ" / "MỚI" labels. */
export const AXIS_ROW_HEIGHT = 44;
/** Top + bottom hairline of the band. */
export const STRIP_BORDER = 4;
export const AXIS_FONT = 36;

/** Where the contiguous cluster starts (fraction of the free range) once the composite index exists. */
export const REORGANISED_START = 0.45;

export type PendingState = 'spread' | 'clustered-old' | 'reorganised';

export type StripGeometry = {
  cols: number;
  rows: number;
  /** Number of cells = cols * rows. */
  total: number;
  width: number;
  /** Distance between two neighbouring cell origins. */
  pitch: number;
  /** Drawn size of one cell. */
  cell: number;
  /** Height of the cell grid only. */
  height: number;
};

export const stripGeometry = (
  width: number = STRIP_WIDTH,
  cols: number = STRIP_COLS,
  rows: number = STRIP_ROWS,
): StripGeometry => {
  const pitch = width / cols;
  return {
    cols,
    rows,
    total: cols * rows,
    width,
    pitch,
    cell: pitch - CELL_GAP,
    height: rows * pitch,
  };
};

/** Full height of the strip block: floating label row + grid + axis labels. */
export const stripBlockHeight = (g: StripGeometry): number =>
  FLOAT_ROW_HEIGHT + g.height + STRIP_BORDER + AXIS_ROW_HEIGHT;

/**
 * Cells are numbered in READ order: index 0 is the newest cell (top of the right-most column), the
 * cursor walks to higher indexes, i.e. right to left, one column (top to bottom) after the other.
 */
export const cellOrigin = (index: number, g: StripGeometry): { x: number; y: number } => {
  const col = g.cols - 1 - Math.floor(index / g.rows);
  const row = index % g.rows;
  return { x: col * g.pitch + CELL_GAP / 2, y: row * g.pitch + CELL_GAP / 2 };
};

/** Number of orange cells: `percent` % of the cells, at least 1. */
export const pendingCount = (total: number, percent: number): number =>
  Math.max(1, Math.min(total, Math.round((total * percent) / 100)));

/** Orange cells the strip draws: `percent` % of the cells, but never fewer than STRIP_MIN_PENDING. */
export const stripPendingCount = (total: number, percent: number): number =>
  Math.min(total, Math.max(STRIP_MIN_PENDING, pendingCount(total, percent)));

/** Small deterministic PRNG (mulberry32): same seed, same sequence, in every frame and every scene. */
export const seededRandom = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** `count` indexes evenly scattered over `total` cells: one per equal stratum, random inside it. */
export const spreadIndices = (
  total: number,
  count: number,
  seed: number = STRIP_SEED,
): number[] => {
  const random = seededRandom(seed);
  const n = Math.max(0, Math.min(count, total));
  return Array.from({ length: n }, (_, k) => {
    const lo = Math.floor((k * total) / n);
    const hi = Math.max(lo, Math.floor(((k + 1) * total) / n) - 1);
    return lo + Math.floor(random() * (hi - lo + 1));
  });
};

/** All pending cells slid to the old side (the highest indexes). */
export const oldSideIndices = (total: number, count: number): number[] =>
  Array.from({ length: Math.min(count, total) }, (_, k) => total - Math.min(count, total) + k);

/** One contiguous block of `count` cells somewhere in the middle (where the composite index groups them). */
export const clusterIndices = (
  total: number,
  count: number,
  startFraction: number = REORGANISED_START,
): number[] => {
  const n = Math.min(count, total);
  const start = Math.round((total - n) * Math.max(0, Math.min(1, startFraction)));
  return Array.from({ length: n }, (_, k) => start + k);
};

/** Pending cell indexes (sorted ascending) for a table state. */
export const pendingIndices = (
  state: PendingState,
  total: number,
  count: number,
  seed: number = STRIP_SEED,
): number[] => {
  if (state === 'clustered-old') return oldSideIndices(total, count);
  if (state === 'reorganised') return clusterIndices(total, count);
  return spreadIndices(total, count, seed);
};

/**
 * Index where the cursor stops: the `want`-th pending cell at or after `readStart`
 * (or the last cell when there are fewer pending cells than that).
 */
export const stopIndex = (
  pending: readonly number[],
  total: number,
  want: number,
  readStart = 0,
): number => {
  const ahead = pending.filter((i) => i >= readStart).sort((a, b) => a - b);
  const n = Math.min(Math.max(1, want), ahead.length);
  return ahead[n - 1] ?? Math.max(0, total - 1);
};

/** Number of wrapped lines for `chars` characters of `size` px text in `width` px (average glyph = `em` * size). */
export const wrapLines = (chars: number, width: number, size: number, em = 0.58): number =>
  Math.max(1, Math.ceil(((chars * size * em) / Math.max(1, width)) * 1.08));

/** CodeBlock chrome: vertical padding 2 * 20 + border 2 * 2, horizontal padding 2 * 24 + border 2 * 2. */
const CODE_PAD_Y = 44;
const CODE_PAD_X = 52;
export const MONO_EM = 0.6;
const CODE_LH = 1.45;

/** Estimated height of a CodeBlock whose long lines wrap (monospace: every glyph is 0.6 em wide). */
export const codeBlockHeight = (
  code: string,
  size: number,
  width: number,
  em: number = MONO_EM,
): number => {
  const inner = width - CODE_PAD_X;
  const lines = code
    .split('\n')
    .reduce((sum, line) => sum + wrapLines(line.length, inner, size, em), 0);
  return Math.ceil(lines * size * CODE_LH + CODE_PAD_Y);
};

/** Strip {accent|word} markup so length estimates see only visible text. */
export const plainText = (text: string): string => text.replace(/\{[^|}]*\|([^}]*)\}/g, '$1');

/** Largest monospace size (<= max) at which no line of `code` wraps; `min` when even that wraps. */
export const fitMonoSize = (
  code: string,
  width: number,
  max: number,
  min: number,
  em: number = MONO_EM,
): number => {
  const longest = Math.max(1, ...code.split('\n').map((line) => line.length));
  const size = Math.floor((width - CODE_PAD_X) / (longest * em * 1.08));
  return Math.max(min, Math.min(max, size));
};
