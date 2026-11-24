import { cursorRunFrames } from '../../components/RowStrip/motion';
import { resolveCueFrames } from '../../lib/cues';

/** Frames the orange cells take to gather into one cluster. */
export const FIX_MORPH_FRAMES = 40;
/** Pause between the gathering ending and the cursor starting. */
export const FIX_PAUSE = 8;
/** Cross-fade between two steps. */
export const FIX_FADE = 10;
/** Frames after the ANALYZE cue at which the button is pressed. */
export const PRESS_DELAY = 14;
export const SHAKE_FRAMES = 24;
export const BLINK_PERIOD = 20;
export const FIX_HOLD = 30;

export type RowFixCues = {
  rows: number;
  analyze: number;
  stamp: number;
  strip: number;
  fixCode: number;
  morph: number;
  cursor: number;
  result: number;
};

export const rowFixFallback = (durationInFrames: number): number[] => {
  const d = Math.max(1, durationInFrames);
  return [0.12, 0.3, 0.42, 0.55, 0.62, 0.7, 0.78, 0.88].map((share) => Math.round(d * share));
};

/** Cue frames in reveal order; the cursor never starts before the gathering has finished. */
export const rowFixFrames = (
  spoken: readonly (number | undefined)[],
  durationInFrames: number,
): RowFixCues => {
  const [
    rows = 0,
    analyze = 0,
    stamp = 0,
    strip = 0,
    fixCode = 0,
    morph = 0,
    cursor = 0,
    result = 0,
  ] = resolveCueFrames(spoken, rowFixFallback(durationInFrames), durationInFrames);
  const cursorStart = Math.max(cursor, morph + FIX_MORPH_FRAMES + FIX_PAUSE);
  return {
    rows,
    analyze,
    stamp,
    strip,
    fixCode,
    morph,
    cursor: cursorStart,
    result: Math.max(result, cursorStart),
  };
};

/** The cursor only walks `limit` cells inside the cluster: a short run (~4% of the scene). */
export const rowFixRunFrames = (durationInFrames: number, cursorStart: number): number =>
  Math.max(
    12,
    Math.min(
      cursorRunFrames(durationInFrames, 0.04, 24, 45),
      durationInFrames - FIX_HOLD - cursorStart,
    ),
  );

/** Boundaries between the three steps (where the cross-fades start). */
export const rowFixBoundaries = (cues: RowFixCues): [number, number] => [cues.analyze, cues.strip];
