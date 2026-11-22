export type SummaryTimeline = {
  /** Frame at which the "Takeaway" chip enters. */
  labelStart: number;
  /** Start frame of each point, in order. */
  pointStarts: number[];
  /** Start frame of the loop line, or null when there is none. */
  loopStart: number | null;
};

/** First item starts at this share of the scene, the last item at LAST_SHARE (spring settles by ~80%). */
const FIRST_SHARE = 0.08;
const LAST_SHARE = 0.62;

/** Evenly spaced reveal schedule derived from the scene length (which comes from audio). */
export const summaryTimeline = (
  durationInFrames: number,
  pointCount: number,
  hasLoopLine: boolean,
): SummaryTimeline => {
  const duration = Math.max(1, durationInFrames);
  const slots = Math.max(0, pointCount) + (hasLoopLine ? 1 : 0);
  const first = Math.round(duration * FIRST_SHARE);
  const last = Math.round(duration * LAST_SHARE);
  const startOf = (slot: number): number =>
    slots <= 1 ? first : Math.round(first + ((last - first) * slot) / (slots - 1));

  const pointStarts = Array.from({ length: Math.max(0, pointCount) }, (_, i) => startOf(i));
  return {
    labelStart: 0,
    pointStarts,
    loopStart: hasLoopLine ? startOf(Math.max(0, pointCount)) : null,
  };
};
