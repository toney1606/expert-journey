import type { CaptionWord } from './captions';

/** Lowercase, strip diacritics (đ -> d) and punctuation so spoken text matches authored text. */
export const normalizeToken = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/[^\p{L}\p{N}]+/gu, '');

const tokensOf = (phrase: string): string[] =>
  phrase
    .split(/\s+/)
    .map(normalizeToken)
    .filter((token) => token.length > 0);

/**
 * When is `phrase` spoken? Returns the start/end (seconds from the scene audio start) of the FIRST word
 * of the first run of consecutive words that match the phrase (accent- and case-insensitive).
 * `afterSec` skips matches that start before it (to pick a later occurrence).
 */
export const findPhraseTime = (
  words: readonly CaptionWord[],
  phrase: string,
  afterSec = 0,
): { start: number; end: number } | undefined => {
  const wanted = tokensOf(phrase);
  if (wanted.length === 0) return undefined;
  const sorted = [...words].sort((a, b) => a.start - b.start);
  const spoken = sorted.map((word) => normalizeToken(word.text));
  for (let i = 0; i + wanted.length <= sorted.length; i += 1) {
    const first = sorted[i];
    if (!first || first.start < afterSec) continue;
    if (wanted.every((token, offset) => spoken[i + offset] === token)) {
      return { start: first.start, end: first.end };
    }
  }
  return undefined;
};
