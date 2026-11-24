import { cursorRunFrames } from '../../components/RowStrip/motion';
import { resolveCueFrames } from '../../lib/cues';

/** Frames the orange cells take to slide to the old side. */
export const TWIST_MORPH_FRAMES = 40;
/** Pause between the slide ending and the cursor starting (so the new position is seen). */
export const TWIST_PAUSE = 8;
export const TWIST_HOLD = 30;

export type RowTwistCues = {
  toggle: number;
  slide: number;
  stat: number;
  belief: number;
  cursor: number;
  assumption: number;
  strike: number;
};

export const rowTwistFallback = (durationInFrames: number): number[] => {
  const d = Math.max(1, durationInFrames);
  return [0.06, 0.12, 0.3, 0.42, 0.54, 0.78, 0.88].map((share) => Math.round(d * share));
};

/** Cue frames in reveal order; the cursor never starts before the slide has finished. */
export const rowTwistFrames = (
  spoken: readonly (number | undefined)[],
  durationInFrames: number,
): RowTwistCues => {
  const [toggle = 0, slide = 0, stat = 0, belief = 0, cursor = 0, assumption = 0, strike = 0] =
    resolveCueFrames(spoken, rowTwistFallback(durationInFrames), durationInFrames);
  return {
    toggle,
    slide,
    stat,
    belief,
    cursor: Math.max(cursor, slide + TWIST_MORPH_FRAMES + TWIST_PAUSE),
    assumption,
    strike,
  };
};

/** Cursor walk length: ~14% of the scene, ends TWIST_HOLD frames before the scene does. */
export const rowTwistRunFrames = (durationInFrames: number, cursorStart: number): number =>
  Math.max(
    12,
    Math.min(
      cursorRunFrames(durationInFrames, 0.14, 60, 120),
      durationInFrames - TWIST_HOLD - cursorStart,
    ),
  );
