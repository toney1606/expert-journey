import { resolveCueFrames } from '../../lib/cues';

export type RaceGapCues = {
  hero: number;
  code: number;
  gap: number;
  request1: number;
  request2: number;
  why: number;
  pin: number;
};

/** Fallback reveal points as shares of the scene, used when the narration phrase is not found. */
const SHARES = [0.03, 0.12, 0.34, 0.5, 0.56, 0.7, 0.82] as const;
export const TYPE_FRAMES = 42;
export const HERO_LINE_DELAY = 8;

export const raceGapFallback = (durationInFrames: number): number[] => {
  const d = Math.max(1, durationInFrames);
  return SHARES.map((s) => Math.round(d * s));
};

/** Resolve spoken frames ([hero, code, gap, request1, request2, why, pin]) against the fallback timeline. */
export const raceGapCues = (
  spoken: readonly (number | undefined)[],
  durationInFrames: number,
): RaceGapCues => {
  const fb = raceGapFallback(durationInFrames);
  const out = resolveCueFrames(spoken, fb, durationInFrames);
  const at = (i: number): number => out[i] ?? fb[i] ?? 0;
  return {
    hero: at(0),
    code: at(1),
    gap: at(2),
    request1: at(3),
    request2: at(4),
    why: at(5),
    pin: at(6),
  };
};

/** Number of code characters typed after `frame - codeStart` frames. */
export const typedChars = (code: string, frame: number, codeStart: number): number =>
  Math.max(0, Math.min(code.length, Math.floor(((frame - codeStart) / TYPE_FRAMES) * code.length)));

/** Typed part of the code plus blank lines so the card keeps its final height while typing. */
export const typedCode = (code: string, chars: number): string => {
  const shown = code.slice(0, chars);
  const missingLines = code.split('\n').length - shown.split('\n').length;
  return shown + '\n'.repeat(Math.max(0, missingLines));
};
