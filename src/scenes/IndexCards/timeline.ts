import { resolveCueFrames } from '../../lib/cues';

const FIRST_SHARE = 0.03;
const LAST_SHARE = 0.78;
/** Bars and code appear this share of the way through their card's span (fallback when not spoken). */
const BARS_SHARE = 0.25;
const CODE_SHARE = 0.5;

/** Fallback start frame of each card (used when its `at` phrase is not found). */
export const indexCardsTimeline = (durationInFrames: number, count: number): number[] => {
  const duration = Math.max(1, durationInFrames);
  const first = Math.round(duration * FIRST_SHARE);
  const last = Math.round(duration * LAST_SHARE);
  return Array.from({ length: Math.max(0, count) }, (_, i) =>
    count <= 1 ? first : Math.round(first + ((last - first) * i) / (count - 1)),
  );
};

/** Start frame of every card: spoken frames clamped to reveal in order, fallback otherwise. */
export const indexCardFrames = (
  spoken: readonly (number | undefined)[],
  durationInFrames: number,
): number[] =>
  resolveCueFrames(spoken, indexCardsTimeline(durationInFrames, spoken.length), durationInFrames);

/** Index of the card being spoken at `frame` (-1 before the first card starts). */
export const activeCardIndex = (frame: number, starts: readonly number[]): number => {
  let active = -1;
  starts.forEach((start, i) => {
    if (frame >= start) active = i;
  });
  return active;
};

/** Cards shown as compact chips (all earlier than the active one), in order. */
export const collapsedCards = (active: number): number[] =>
  Array.from({ length: Math.max(0, active) }, (_, i) => i);

/** Frames at which the bars and the code of a card appear, always inside [start, end). */
export const extraFrames = (
  start: number,
  end: number,
  spokenBars: number | undefined,
  spokenCode: number | undefined,
): { bars: number; code: number } => {
  const span = Math.max(1, end - start);
  const [bars = start, code = start] = resolveCueFrames(
    [spokenBars, spokenCode],
    [Math.round(start + span * BARS_SHARE), Math.round(start + span * CODE_SHARE)],
    end,
  );
  return { bars: Math.max(start, bars), code: Math.max(start, code) };
};
