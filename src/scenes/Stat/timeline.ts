import { resolveCueFrames } from '../../lib/cues';

export type StatTimeline = {
  /** Fallback start frame of each row (used when its `at` phrase is not found). */
  rowStarts: number[];
  /** Frames a counter needs to tick up and land. */
  countFrames: number;
};

const FIRST_SHARE = 0.1;
const LAST_SHARE = 0.55;
/** Counter length: 20% of the scene, at most 1.8 s at 30 fps, so the last one lands by ~75-80%. */
const COUNT_SHARE = 0.2;
const MAX_COUNT_FRAMES = 54;

export const statTimeline = (durationInFrames: number, rowCount: number): StatTimeline => {
  const duration = Math.max(1, durationInFrames);
  const first = Math.round(duration * FIRST_SHARE);
  const last = Math.round(duration * LAST_SHARE);
  const rowStarts = Array.from({ length: Math.max(0, rowCount) }, (_, i) =>
    rowCount <= 1 ? first : Math.round(first + ((last - first) * i) / (rowCount - 1)),
  );
  return {
    rowStarts,
    countFrames: Math.max(1, Math.min(MAX_COUNT_FRAMES, Math.round(duration * COUNT_SHARE))),
  };
};

/** Start frame of every row: spoken frames (undefined = not found) clamped to reveal in order, fallback otherwise. */
export const statRowFrames = (
  spoken: readonly (number | undefined)[],
  durationInFrames: number,
): number[] =>
  resolveCueFrames(
    spoken,
    statTimeline(durationInFrames, spoken.length).rowStarts,
    durationInFrames,
  );
