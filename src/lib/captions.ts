export type CaptionWord = { start: number; end: number; text: string };

export type CaptionPage = {
  /** Seconds from the start of the scene audio. */
  start: number;
  end: number;
  words: CaptionWord[];
};

export type CaptionOptions = {
  maxWords?: number;
  maxChars?: number;
  /** A silence longer than this between two words starts a new page. */
  gapSec?: number;
};

const SENTENCE_END = /[.!?…]["'”’)\]]*$/u;
/** Zero-duration words still need a visible slot. */
const MIN_WORD_SEC = 0.05;

/** Sort, drop empty text, clamp negatives, force end >= start + MIN and no overlap between words. */
export const normalizeWords = (words: readonly CaptionWord[]): CaptionWord[] => {
  const sorted = words
    .filter((word) => word.text.trim().length > 0)
    .map((word) => {
      const start = Math.max(0, word.start);
      return { start, end: Math.max(word.end, start + MIN_WORD_SEC), text: word.text.trim() };
    })
    .sort((a, b) => a.start - b.start);
  return sorted.map((word, i) => {
    const next = sorted[i + 1];
    return next && word.end > next.start
      ? { ...word, end: Math.max(word.start + MIN_WORD_SEC / 5, next.start) }
      : word;
  });
};

/**
 * Group words into display pages. A page breaks after sentence-ending punctuation, before a gap
 * longer than `gapSec`, and when adding a word would exceed `maxWords` or `maxChars`. A single
 * very long word still gets its own page.
 */
export const buildCaptionPages = (
  input: readonly CaptionWord[],
  { maxWords = 4, maxChars = 22, gapSec = 0.35 }: CaptionOptions = {},
): CaptionPage[] => {
  const words = normalizeWords(input);
  const pages: CaptionPage[] = [];
  let current: CaptionWord[] = [];
  let chars = 0;

  const flush = (): void => {
    const first = current[0];
    const last = current[current.length - 1];
    if (!first || !last) return;
    pages.push({ start: first.start, end: last.end, words: current });
    current = [];
    chars = 0;
  };

  for (const word of words) {
    const last = current[current.length - 1];
    const nextChars = chars + (current.length > 0 ? 1 : 0) + word.text.length;
    if (
      last &&
      (current.length >= maxWords ||
        nextChars > maxChars ||
        word.start - last.end > gapSec ||
        SENTENCE_END.test(last.text))
    ) {
      flush();
    }
    chars += (current.length > 0 ? 1 : 0) + word.text.length;
    current.push(word);
  }
  flush();
  return pages;
};

/** Page showing at `tSeconds`: the last page that has started (it stays up through gaps). */
export const pageAt = (
  pages: readonly CaptionPage[],
  tSeconds: number,
): CaptionPage | undefined => {
  let found: CaptionPage | undefined;
  for (const page of pages) {
    if (page.start <= tSeconds) found = page;
    else break;
  }
  return found;
};

/**
 * Index of the word being spoken at `tSeconds`: the last word that has started. Before the first
 * word it is 0, so the page never shows without an active word.
 */
export const activeWordIndex = (page: CaptionPage, tSeconds: number): number => {
  let index = 0;
  for (let i = 0; i < page.words.length; i += 1) {
    if ((page.words[i]?.start ?? Infinity) <= tSeconds) index = i;
    else break;
  }
  return index;
};
