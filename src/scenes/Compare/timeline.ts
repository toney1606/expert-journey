/** Pure reveal timeline for the Compare scene. Frames are relative to the scene start. */

import { resolveCueFrames } from '../../lib/cues';

export type CompareTimeline = {
  title: number;
  left: number;
  vs: number;
  right: number;
  verdict: number;
};

/** Reveal (including the last spring settling) must be finished by this share of the scene. */
export const REVEAL_DONE_RATIO = 0.8;
export const SETTLE_FRAMES = 14;
export const MAX_STEP_FRAMES = 30;

/** Position of each item in step units; the verdict is last. */
const SLOTS = { title: 0, left: 2, vs: 4.5, right: 5.5, verdict: 9 } as const;

export const buildTimeline = (durationInFrames: number, hasVerdict: boolean): CompareTimeline => {
  const span = hasVerdict ? SLOTS.verdict : SLOTS.right;
  const budget = Math.max(0, durationInFrames * REVEAL_DONE_RATIO - SETTLE_FRAMES);
  const step = Math.min(MAX_STEP_FRAMES, budget / span);
  const at = (slot: number): number => Math.round(slot * step);
  return {
    title: at(SLOTS.title),
    left: at(SLOTS.left),
    vs: at(SLOTS.vs),
    right: at(SLOTS.right),
    verdict: at(SLOTS.verdict),
  };
};

/**
 * Reveal frames of the cued items in order left, right, verdict. `spoken` is [left, right, verdict] (undefined =
 * not found); they are clamped so the reveals never swap or land on one frame. The verdict is ignored without one.
 */
export const compareCueFrames = (
  spoken: readonly (number | undefined)[],
  durationInFrames: number,
  hasVerdict: boolean,
): { left: number; right: number; verdict: number } => {
  const fb = buildTimeline(durationInFrames, hasVerdict);
  const count = hasVerdict ? 3 : 2;
  const [left = fb.left, right = fb.right, verdict = fb.verdict] = resolveCueFrames(
    spoken.slice(0, count),
    [fb.left, fb.right, fb.verdict].slice(0, count),
    durationInFrames,
  );
  return { left, right, verdict };
};
