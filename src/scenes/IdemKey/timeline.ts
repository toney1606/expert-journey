import { resolveCueFrames } from '../../lib/cues';

export type IdemKeyCues = {
  hero: number;
  lanes: number;
  chip: number;
  send: number;
  retry: number;
  save: number;
  stamp: number;
  noCharge: number;
  back: number;
};

/** Reveal order; share of the scene at which each fallback cue lands. */
const SHARES = [0, 0.1, 0.22, 0.36, 0.5, 0.62, 0.72, 0.8, 0.86] as const;
/** Frames a packet needs to cross from client to server. */
export const TRAVEL_FRAMES = 24;
/** Frames the second hero line trails the first. */
export const HERO_LINE_DELAY = 8;

export const idemKeyFallback = (durationInFrames: number): number[] =>
  SHARES.map((s) => Math.round(Math.max(1, durationInFrames) * s));

/** Resolve spoken frames (order of `SHARES`, undefined = not found) against the fallback timeline. */
export const idemKeyCues = (
  spoken: readonly (number | undefined)[],
  durationInFrames: number,
): IdemKeyCues => {
  const f = resolveCueFrames(spoken, idemKeyFallback(durationInFrames), durationInFrames);
  const at = (i: number): number => f[i] ?? 0;
  return {
    hero: at(0),
    lanes: at(1),
    chip: at(2),
    send: at(3),
    retry: at(4),
    save: at(5),
    stamp: at(6),
    noCharge: at(7),
    back: at(8),
  };
};

/** Deterministic spark directions (angle in radians, length factor) fanned around the new key chip. */
export const SPARKS: readonly { angle: number; reach: number }[] = Array.from(
  { length: 10 },
  (_, i) => ({ angle: (i / 10) * Math.PI * 2 + 0.3, reach: i % 2 === 0 ? 1 : 0.7 }),
);
