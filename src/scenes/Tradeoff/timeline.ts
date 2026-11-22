/** Pure reveal timeline for the Tradeoff scene. Frames are relative to the scene start. */

export type CardTimeline = {
  /** Frame at which the card (and its name) starts appearing. */
  start: number;
  /** Start frame of each row, pros first, then cons. */
  rows: number[];
};

export type TradeoffTimeline = {
  title: number;
  cards: CardTimeline[];
};

/** Reveal (including the last spring settling) must be finished by this share of the scene. */
export const REVEAL_DONE_RATIO = 0.8;
/** Frames the last spring needs to be visually settled. */
export const SETTLE_FRAMES = 14;
/** Never space items further apart than this, so short content does not drag. */
export const MAX_STEP_FRAMES = 22;

const TITLE_WEIGHT = 2;
const CARD_WEIGHT = 2;
const ROW_WEIGHT = 1;

/**
 * @param durationInFrames length of the scene
 * @param rowCounts number of rows (pros + cons) of each option, in order
 */
export const buildTimeline = (
  durationInFrames: number,
  rowCounts: readonly number[],
): TradeoffTimeline => {
  const totalWeight =
    TITLE_WEIGHT + rowCounts.reduce((sum, rows) => sum + CARD_WEIGHT + rows * ROW_WEIGHT, 0);
  // Start of the last item is at (totalWeight - lastWeight) * step.
  const lastWeight = rowCounts.length > 0 ? ROW_WEIGHT : TITLE_WEIGHT;
  const spanWeight = Math.max(1, totalWeight - lastWeight);
  const budget = Math.max(0, durationInFrames * REVEAL_DONE_RATIO - SETTLE_FRAMES);
  const step = Math.min(MAX_STEP_FRAMES, budget / spanWeight);

  let cursor = 0;
  const take = (weight: number): number => {
    const frame = Math.round(cursor * step);
    cursor += weight;
    return frame;
  };

  const title = take(TITLE_WEIGHT);
  const cards = rowCounts.map((rows): CardTimeline => {
    const start = take(CARD_WEIGHT);
    const rowStarts = Array.from({ length: rows }, () => take(ROW_WEIGHT));
    return { start, rows: rowStarts };
  });
  return { title, cards };
};
