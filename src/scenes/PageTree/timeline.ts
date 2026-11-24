import { resolveCueFrames } from '../../lib/cues';

/** Reveal order of the scene. */
export const PAGE_TREE_STEPS = [
  'page',
  'fanout',
  'levels',
  'total',
  'population',
  'reads',
] as const;
export type PageTreeStep = (typeof PAGE_TREE_STEPS)[number];

/** Fallback share of the scene at which each step starts (same order as PAGE_TREE_STEPS). */
const SHARES = [0.05, 0.2, 0.32, 0.46, 0.62, 0.76] as const;
const MAX_COUNT_FRAMES = 45;

export type PageTreeTimeline = {
  /** Fallback start frame per step. */
  starts: number[];
  /** Frames the big counter needs to land. */
  countFrames: number;
  /** Frames between the path lighting root, level 2 and the leaf (long enough to read 1, 2, 3). */
  pathStep: number;
};

export const pageTreeTimeline = (durationInFrames: number): PageTreeTimeline => {
  const d = Math.max(1, durationInFrames);
  return {
    starts: SHARES.map((s) => Math.round(d * s)),
    countFrames: Math.max(1, Math.min(MAX_COUNT_FRAMES, Math.round(d * 0.1))),
    pathStep: Math.max(4, Math.min(18, Math.round(d * 0.03))),
  };
};

/** Start frame of every step: spoken frames (undefined = not found) clamped to reveal in order, fallback otherwise. */
export const pageTreeFrames = (
  spoken: readonly (number | undefined)[],
  durationInFrames: number,
): number[] =>
  resolveCueFrames(spoken, pageTreeTimeline(durationInFrames).starts, durationInFrames);
