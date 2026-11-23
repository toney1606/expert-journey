import { resolveCueFrames } from '../../lib/cues';

export type CalloutTimeline = {
  /** Kicker chip pops at this frame. */
  kickerStart: number;
  /** Statement slams in (fallback when `statementAt` is not found). */
  statementStart: number;
  /** Explanation fades in (fallback when `explanationAt` is not found). */
  explanationStart: number;
  /** Frames after the slam at which the myth strike-through starts drawing. */
  strikeDelay: number;
};

const SLAM_SHARE = 0.06;
const EXPLANATION_SHARE = 0.4;
const KICKER_LEAD = 4;

/** Reveal schedule derived from the scene length; everything has settled by ~80%. */
export const calloutTimeline = (durationInFrames: number): CalloutTimeline => {
  const duration = Math.max(1, durationInFrames);
  const statementStart = Math.round(duration * SLAM_SHARE);
  return {
    kickerStart: Math.max(0, statementStart - KICKER_LEAD),
    statementStart,
    explanationStart: Math.round(duration * EXPLANATION_SHARE),
    strikeDelay: Math.min(24, Math.round(duration * 0.12)),
  };
};

/** Horizontal shake in px, `frame` frames after the slam: a decaying oscillation that settles to 0. */
export const slamShake = (frame: number, amplitude = 9): number => {
  if (frame <= 0) return 0;
  const decay = Math.exp(-frame / 4);
  const value = Math.sin(frame * 2.2) * amplitude * decay;
  return Math.abs(value) < 0.05 ? 0 : value;
};

/** Slam and explanation frames, clamped so the explanation always comes after the statement. */
export const calloutCueFrames = (
  spoken: readonly (number | undefined)[],
  durationInFrames: number,
  hasExplanation: boolean,
): { statement: number; explanation: number } => {
  const t = calloutTimeline(durationInFrames);
  const [statement = t.statementStart, explanation = t.explanationStart] = resolveCueFrames(
    spoken.slice(0, hasExplanation ? 2 : 1),
    [t.statementStart, t.explanationStart].slice(0, hasExplanation ? 2 : 1),
    durationInFrames,
  );
  return { statement, explanation };
};
