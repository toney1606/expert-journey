import { resolveCueFrames } from '../../lib/cues';

export type UniqueKeyCues = {
  hero1: number;
  hero2: number;
  code: number;
  rowOk: number;
  rowDup: number;
  badge: number;
};

/** Fallback shares of the scene: hero 1, hero 2, typing, row 1, row 2, stamp. */
const SHARES = [0.15, 0.25, 0.38, 0.62, 0.74, 0.84] as const;
const TYPE_FRAMES_PER_CHAR = 0.8;
const MIN_TYPE_FRAMES = 20;
const TYPE_END_MARGIN = 6;

export const uniqueKeyFallback = (durationInFrames: number): number[] =>
  SHARES.map((s) => Math.round(Math.max(1, durationInFrames) * s));

/** Resolve spoken frames (undefined = not found) in reveal order against the fallback timeline. */
export const uniqueKeyCues = (
  spoken: readonly (number | undefined)[],
  durationInFrames: number,
): UniqueKeyCues => {
  const f = uniqueKeyFallback(durationInFrames);
  const o = resolveCueFrames(spoken, f, durationInFrames);
  return {
    hero1: o[0] ?? f[0] ?? 0,
    hero2: o[1] ?? f[1] ?? 0,
    code: o[2] ?? f[2] ?? 0,
    rowOk: o[3] ?? f[3] ?? 0,
    rowDup: o[4] ?? f[4] ?? 0,
    badge: o[5] ?? f[5] ?? 0,
  };
};

/** Frames the typing takes: proportional to the code length, but done before the first row arrives. */
export const typeFrames = (codeLength: number, codeStart: number, rowOkStart: number): number =>
  Math.max(
    MIN_TYPE_FRAMES,
    Math.min(
      Math.round(codeLength * TYPE_FRAMES_PER_CHAR),
      rowOkStart - codeStart - TYPE_END_MARGIN,
    ),
  );

/** Number of characters typed at `frame`. */
export const typedChars = (
  frame: number,
  codeStart: number,
  frames: number,
  length: number,
): number => Math.max(0, Math.min(length, Math.floor(((frame - codeStart) / frames) * length)));
