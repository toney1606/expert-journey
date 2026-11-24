/** Pure animation maths for RowStrip and the scenes that drive it (no React, no Remotion). */

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

export const easeInOutCubic = (t: number): number => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

/**
 * Staggered progress: item k of n starts a little after item k-1. `spread` (0..1) is the share of the
 * timeline used for the stagger; 0 means every item moves together. Returns 0..1.
 */
export const staggerProgress = (progress: number, k: number, n: number, spread = 0.5): number => {
  if (n <= 1 || spread <= 0) return clamp01(progress);
  const delay = (spread * k) / (n - 1);
  return clamp01((progress - delay) / (1 - spread));
};

export type CursorRun = {
  /** Frame at which the cursor starts moving. */
  start: number;
  /** Frames the walk takes. */
  runFrames: number;
  /** Start and end position (cell index, fractional while moving). */
  from: number;
  to: number;
};

/** Fractional cell index of the cursor at `frame` (clamped to from..to). */
export const cursorAt = (frame: number, run: CursorRun): number => {
  const t = clamp01((frame - run.start) / Math.max(1, run.runFrames));
  return run.from + (run.to - run.from) * t;
};

/** Length of a cursor walk: `share` of the scene, kept between `min` and `max` frames. */
export const cursorRunFrames = (
  durationInFrames: number,
  share: number,
  min = 45,
  max = 150,
): number => Math.max(min, Math.min(max, Math.round(durationInFrames * share)));

export type CellState = 'idle' | 'skipped' | 'collected';

/** State of cell `index` when the cursor (fractional index) is at `cursor`, having started at `readStart`. */
export const cellState = (
  index: number,
  pending: ReadonlySet<number>,
  readStart: number,
  cursor: number | null,
): CellState => {
  if (cursor === null || index < readStart || index > Math.floor(cursor)) return 'idle';
  return pending.has(index) ? 'collected' : 'skipped';
};

/** 0..1: share of the cells between `readStart` and `stop` the cursor has already passed. */
export const readFraction = (cursor: number | null, readStart: number, stop: number): number => {
  if (cursor === null) return 0;
  const cells = stop - readStart + 1;
  return clamp01((Math.floor(cursor) - readStart + 1) / Math.max(1, cells));
};

/** Counter value: `fraction` of the final number, as a whole number. */
export const counterValue = (finalValue: number, fraction: number): number =>
  Math.round(finalValue * clamp01(fraction));

/** Blink: 1 at the start of each period, dipping to `low` in the middle (triangle wave, 0 before `start`). */
export const blinkAmount = (frame: number, start: number, period: number, low = 0.2): number => {
  if (frame < start) return 0;
  const phase = ((frame - start) % Math.max(2, period)) / Math.max(2, period);
  const tri = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
  return 1 - (1 - low) * tri;
};

/** Horizontal shake offset in px: decaying sine over `frames`, 0 outside. */
export const shakeOffset = (
  frame: number,
  start: number,
  frames: number,
  amplitude: number,
): number => {
  const t = (frame - start) / Math.max(1, frames);
  if (t < 0 || t > 1) return 0;
  return Math.sin(t * Math.PI * 6) * amplitude * (1 - t);
};

/**
 * Opacity of each of the steps of a staged scene: step i is visible from boundaries[i-1] to boundaries[i],
 * cross-fading over `fade` frames starting at each boundary. The first step is visible from frame 0 and
 * the last stays visible to the end.
 */
export const stepOpacities = (
  frame: number,
  boundaries: readonly number[],
  fade: number,
): number[] => {
  const steps = boundaries.length + 1;
  return Array.from({ length: steps }, (_, i) => {
    const fadeIn = i === 0 ? 1 : clamp01((frame - (boundaries[i - 1] ?? 0)) / Math.max(1, fade));
    const fadeOut =
      i === steps - 1 ? 1 : 1 - clamp01((frame - (boundaries[i] ?? 0)) / Math.max(1, fade));
    return Math.min(fadeIn, fadeOut);
  });
};
