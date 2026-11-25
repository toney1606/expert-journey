import { resolveCueFrames } from '../../lib/cues';

export type PaymentHookCues = {
  charge: number;
  chargeAgain: number;
  tap: number;
  logs: number[];
  question: number;
};

/** Fallback shares of the scene, in reveal order: charge, charge again, tap, 3 logs, question. */
const SHARES = [0.04, 0.16, 0.27, 0.42, 0.54, 0.66, 0.8] as const;

export const paymentHookFallback = (durationInFrames: number): number[] => {
  const d = Math.max(1, durationInFrames);
  return SHARES.map((s) => Math.round(d * s));
};

/** Resolve spoken frames ([charge, again, tap, log0, log1, log2, question]) against the fallback. */
export const paymentHookCues = (
  spoken: readonly (number | undefined)[],
  durationInFrames: number,
): PaymentHookCues => {
  const out = resolveCueFrames(spoken, paymentHookFallback(durationInFrames), durationInFrames);
  return {
    charge: out[0] ?? 0,
    chargeAgain: out[1] ?? 0,
    tap: out[2] ?? 0,
    logs: [out[3] ?? 0, out[4] ?? 0, out[5] ?? 0],
    question: out[6] ?? 0,
  };
};

export const SHAKE_FRAMES = 14;
const SHAKE_AMPLITUDE = 18;

/** Horizontal offset (px) of a shake beat `since` frames after it starts. Deterministic. */
export const shakeOffset = (since: number): number => {
  if (since < 0 || since >= SHAKE_FRAMES) return 0;
  return SHAKE_AMPLITUDE * Math.exp(-since / 4) * Math.sin(since * 1.9);
};

/** Characters of `text` typed `since` frames after the line starts (about 1.5 chars/frame). */
export const typedChars = (text: string, since: number, charsPerFrame = 1.5): string =>
  text.slice(0, Math.max(0, Math.min(text.length, Math.floor(since * charsPerFrame) + 1)));

/** Frame at which typing of `text` ends when it started at `start`. */
export const typingEnd = (text: string, start: number, charsPerFrame = 1.5): number =>
  start + Math.ceil(text.length / charsPerFrame);
