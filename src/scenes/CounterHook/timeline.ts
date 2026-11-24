import { resolveCueFrames } from '../../lib/cues';

export type CounterHookTimeline = {
  /** Fallback frames, in reveal order: counter start, each line, punchline. */
  countStart: number;
  lineStarts: number[];
  finalStart: number;
  /** Frames the counter needs to tick from fast to slow. */
  countFrames: number;
};

const COUNT_SHARE = 0.12;
const FIRST_LINE_SHARE = 0.4;
const LAST_LINE_SHARE = 0.65;
const FINAL_SHARE = 0.82;
const COUNT_LEN_SHARE = 0.06;
const MIN_COUNT_FRAMES = 12;
const MAX_COUNT_FRAMES = 24;

export const counterHookTimeline = (
  durationInFrames: number,
  lineCount: number,
): CounterHookTimeline => {
  const d = Math.max(1, durationInFrames);
  const first = Math.round(d * FIRST_LINE_SHARE);
  const last = Math.round(d * LAST_LINE_SHARE);
  return {
    countStart: Math.round(d * COUNT_SHARE),
    lineStarts: Array.from({ length: Math.max(0, lineCount) }, (_, i) =>
      lineCount <= 1 ? first : Math.round(first + ((last - first) * i) / (lineCount - 1)),
    ),
    finalStart: Math.round(d * FINAL_SHARE),
    countFrames: Math.max(
      MIN_COUNT_FRAMES,
      Math.min(MAX_COUNT_FRAMES, Math.round(d * COUNT_LEN_SHARE)),
    ),
  };
};

export type CounterHookCues = { countStart: number; lineStarts: number[]; finalStart: number };

/** Resolve spoken frames ([count, ...lines, final], undefined = not found) against the fallback timeline. */
export const counterHookCues = (
  spoken: readonly (number | undefined)[],
  durationInFrames: number,
  lineCount: number,
): CounterHookCues => {
  const t = counterHookTimeline(durationInFrames, lineCount);
  const out = resolveCueFrames(
    spoken,
    [t.countStart, ...t.lineStarts, t.finalStart],
    durationInFrames,
  );
  return {
    countStart: out[0] ?? t.countStart,
    lineStarts: out.slice(1, 1 + lineCount),
    finalStart: out[1 + lineCount] ?? t.finalStart,
  };
};

export const SHAKE_FRAMES = 14;
const SHAKE_AMPLITUDE = 16;

/** Horizontal offset (px) of the single shake beat, `since` frames after the punchline appears. Deterministic. */
export const shakeOffset = (since: number): number => {
  if (since < 0 || since >= SHAKE_FRAMES) return 0;
  return SHAKE_AMPLITUDE * Math.exp(-since / 4) * Math.sin(since * 1.9);
};
