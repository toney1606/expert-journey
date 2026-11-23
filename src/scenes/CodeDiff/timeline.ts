import { resolveCueFrames } from '../../lib/cues';

/** Phase boundaries as fractions of the scene length. */
export const BEFORE_END = 0.35;
export const MORPH_END = 0.6;
export const BADGE_START = 0.78;

export type CodeTimeline = {
  /** Frame at which the before -> after morph starts. */
  morphStart: number;
  /** Frame at which the morph is finished (the "after" code is shown). */
  morphEnd: number;
  /** Frame at which the "tested" badge enters. */
  badgeStart: number;
};

/** The morph never gets shorter than this, even when the badge cue follows it closely. */
const MIN_MORPH_FRAMES = 12;

/**
 * Timeline from the scene length, optionally moved by narration cues (frames at which `morphAt` / `testedAt`
 * are spoken). Without cues it is exactly the proportional timeline. A cued morph keeps its automatic length
 * (shortened when the badge cue comes soon after), and the badge never appears before the morph starts.
 */
export const codeTimeline = (
  durationInFrames: number,
  morphCue?: number,
  testedCue?: number,
): CodeTimeline => {
  const morphStart = durationInFrames * BEFORE_END;
  const morphLen = durationInFrames * (MORPH_END - BEFORE_END);
  const badgeStart = durationInFrames * BADGE_START;
  if (morphCue === undefined && testedCue === undefined) {
    return { morphStart, morphEnd: morphStart + morphLen, badgeStart };
  }
  const [start = morphStart, badge = badgeStart] = resolveCueFrames(
    [morphCue, testedCue],
    [morphStart, badgeStart],
    durationInFrames,
    MIN_MORPH_FRAMES,
  );
  const len = Math.max(MIN_MORPH_FRAMES, Math.min(morphLen, badge - start - 2));
  return { morphStart: start, morphEnd: start + len, badgeStart: badge };
};
