import type { CaptionWord } from './captions';
import { findPhraseTime } from './spoken';

/** Reveals closer together than this look like one blob, so later cues are pushed apart. */
export const MIN_CUE_GAP = 3;
/** The last reveal must start at least this many frames before the scene ends (spring settling). */
export const MIN_CUE_TAIL = 10;

/**
 * Frame (inside the scene) at which each phrase is spoken; `undefined` for a missing phrase or one that is
 * not found in the narration (or when there are no word timings).
 */
export const spokenFrames = (
  words: readonly CaptionWord[],
  phrases: readonly (string | undefined)[],
  fps: number,
): (number | undefined)[] => {
  // A phrase used by several cues of one scene is searched AFTER the previous cue with the same phrase.
  const lastHit = new Map<string, number>();
  return phrases.map((phrase) => {
    if (!phrase) return undefined;
    const key = phrase.trim().toLowerCase();
    const previous = lastHit.get(key);
    const hit = findPhraseTime(words, phrase, previous === undefined ? 0 : previous + 1e-6);
    if (hit) lastHit.set(key, hit.start);
    return hit ? Math.round(hit.start * fps) : undefined;
  });
};

/**
 * Merge spoken cue frames with the fallback timeline of a scene (items in reveal order).
 * - Nothing spoken: the fallback timeline is returned unchanged (today's behaviour).
 * - Otherwise each item uses its spoken frame or its fallback, then the list is clamped so reveals never go
 *   backwards, keep at least `minGap` frames between them, and the last one starts `tail` frames before the end.
 */
export const resolveCueFrames = (
  spoken: readonly (number | undefined)[],
  fallback: readonly number[],
  durationInFrames: number,
  minGap: number = MIN_CUE_GAP,
  tail: number = MIN_CUE_TAIL,
): number[] => {
  if (!fallback.some((_, i) => spoken[i] !== undefined)) return [...fallback];
  const out = fallback.map((fb, i) => spoken[i] ?? fb);
  for (let i = 1; i < out.length; i += 1) {
    out[i] = Math.max(out[i] ?? 0, (out[i - 1] ?? 0) + minGap);
  }
  const limit = Math.max(0, durationInFrames - tail);
  for (let i = out.length - 1; i >= 0; i -= 1) {
    const ceiling = i === out.length - 1 ? limit : (out[i + 1] ?? limit) - minGap;
    out[i] = Math.max(0, Math.min(out[i] ?? 0, ceiling));
  }
  for (let i = 1; i < out.length; i += 1) out[i] = Math.max(out[i] ?? 0, out[i - 1] ?? 0);
  return out;
};
