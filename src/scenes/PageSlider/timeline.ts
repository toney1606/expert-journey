import { resolveCueFrames } from '../../lib/cues';

export type PageSliderTimeline = {
  /** Fallback frames: slider starts, question appears, pin line appears. */
  dragStart: number;
  questionStart: number;
  pinStart: number;
  /** Frames the drag takes (long enough to read the numbers). */
  dragFrames: number;
};

const DRAG_SHARE = 0.3;
const QUESTION_SHARE = 0.6;
const PIN_SHARE = 0.8;
const DRAG_LEN_SHARE = 0.1;
const MIN_DRAG_FRAMES = 20;
const MAX_DRAG_FRAMES = 45;

export const pageSliderTimeline = (durationInFrames: number): PageSliderTimeline => {
  const d = Math.max(1, durationInFrames);
  return {
    dragStart: Math.round(d * DRAG_SHARE),
    questionStart: Math.round(d * QUESTION_SHARE),
    pinStart: Math.round(d * PIN_SHARE),
    dragFrames: Math.max(
      MIN_DRAG_FRAMES,
      Math.min(MAX_DRAG_FRAMES, Math.round(d * DRAG_LEN_SHARE)),
    ),
  };
};

export type PageSliderCues = { dragStart: number; questionStart: number; pinStart: number };

/** Resolve spoken frames ([drag, question, pin], undefined = not found) against the fallback timeline. */
export const pageSliderCues = (
  spoken: readonly (number | undefined)[],
  durationInFrames: number,
): PageSliderCues => {
  const t = pageSliderTimeline(durationInFrames);
  const out = resolveCueFrames(
    spoken,
    [t.dragStart, t.questionStart, t.pinStart],
    durationInFrames,
  );
  return {
    dragStart: out[0] ?? t.dragStart,
    questionStart: out[1] ?? t.questionStart,
    pinStart: out[2] ?? t.pinStart,
  };
};
