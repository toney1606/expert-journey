import { resolveCueFrames } from '../../lib/cues';

/** Reveal order of the scene. */
export const COST_STEPS = [
  'roads',
  'random',
  'seq',
  'engine',
  'mult',
  'rows',
  'price',
  'cost',
  'guess',
  'stats',
] as const;
export type CostStep = (typeof COST_STEPS)[number];

/** Fallback share of the scene at which each step starts (same order as COST_STEPS). */
const SHARES = [0.04, 0.12, 0.2, 0.28, 0.34, 0.45, 0.54, 0.62, 0.74, 0.86] as const;

export const costRoadsTimeline = (durationInFrames: number): number[] => {
  const d = Math.max(1, durationInFrames);
  return SHARES.map((s) => Math.round(d * s));
};

/** Start frame of every step: spoken frames (undefined = not found) clamped to reveal in order, fallback otherwise. */
export const costRoadsFrames = (
  spoken: readonly (number | undefined)[],
  durationInFrames: number,
): number[] => resolveCueFrames(spoken, costRoadsTimeline(durationInFrames), durationInFrames);

/** Frames the sequential runner needs for one pass of the road. */
export const SEQ_PERIOD = 24;
const MAX_PERIOD = 144;

/** Frames the random runner needs for one pass: proportional to its relative cost (4x slower than sequential). */
export const runnerPeriod = (cost: number, seqCost: number): number =>
  Math.max(
    SEQ_PERIOD,
    Math.min(MAX_PERIOD, Math.round((SEQ_PERIOD * cost) / Math.max(1e-6, seqCost))),
  );

/** Landing points (share of the road width) and arc heights (px) of the erratic random-jump road. */
export const HOP_XS = [0.03, 0.17, 0.3, 0.47, 0.62, 0.8, 0.97] as const;
export const HOP_HEIGHTS = [26, 44, 18, 48, 22, 40] as const;

/** Position of a runner hopping along the landing points; t in [0, 1). Parabolic arcs of height `heights[i]`. */
export const hopPosition = (
  t: number,
  width: number,
  baseline: number,
  xs: readonly number[] = HOP_XS,
  heights: readonly number[] = HOP_HEIGHTS,
): { x: number; y: number } => {
  const hops = xs.length - 1;
  const clamped = Math.min(0.999999, Math.max(0, t));
  const scaled = clamped * hops;
  const i = Math.floor(scaled);
  const u = scaled - i;
  const x0 = (xs[i] ?? 0) * width;
  const x1 = (xs[i + 1] ?? 1) * width;
  const h = heights[i] ?? 0;
  return { x: x0 + (x1 - x0) * u, y: baseline - 4 * h * u * (1 - u) };
};

/** Position of the sequential runner (straight line); t in [0, 1). */
export const linePosition = (
  t: number,
  width: number,
  baseline: number,
): { x: number; y: number } => ({ x: Math.min(0.999999, Math.max(0, t)) * width, y: baseline });
