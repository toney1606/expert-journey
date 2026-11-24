export type SpokenWord = { start: number; end: number };

/**
 * How open the mascot's mouth is (0 closed .. 1 wide) at `t` seconds into the scene audio: it flaps while a
 * word is being said and closes in the gaps. Pure and deterministic (driven by `t` only).
 */
export const mouthOpenAt = (words: readonly SpokenWord[], t: number): number => {
  const word = words.find((w) => t >= w.start && t <= w.end + 0.04);
  if (!word) return 0;
  const phase = (t - word.start) * 14;
  return 0.35 + 0.65 * Math.abs(Math.sin(phase));
};
