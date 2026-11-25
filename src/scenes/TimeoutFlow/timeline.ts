import { resolveCueFrames } from '../../lib/cues';

export type TimeoutFlowCues = {
  request: number;
  charge: number;
  lost: number;
  timeout: number;
  retry: number;
  chargeAgain: number;
  lesson: number;
};

/** Fallback shares of the scene (request, charge, lost, timeout, retry, chargeAgain, lesson). */
const SHARES = [0.04, 0.14, 0.27, 0.4, 0.55, 0.68, 0.88] as const;

export const timeoutFlowFallback = (durationInFrames: number): number[] => {
  const d = Math.max(1, durationInFrames);
  return SHARES.map((s) => Math.round(d * s));
};

/** Spoken frames in step order -> monotonic cue frames (fallback derived from the duration). */
export const timeoutFlowCues = (
  spoken: readonly (number | undefined)[],
  durationInFrames: number,
): TimeoutFlowCues => {
  const fb = timeoutFlowFallback(durationInFrames);
  const o = resolveCueFrames(spoken, fb, durationInFrames);
  const at = (i: number): number => o[i] ?? fb[i] ?? 0;
  return {
    request: at(0),
    charge: at(1),
    lost: at(2),
    timeout: at(3),
    retry: at(4),
    chargeAgain: at(5),
    lesson: at(6),
  };
};
