import { describe, expect, it } from 'vitest';
import type { CaptionPage } from './captions';
import { activeWordIndex, buildCaptionPages, normalizeWords, pageAt } from './captions';

const w = (start: number, end: number, text: string) => ({ start, end, text });

describe('buildCaptionPages', () => {
  it('returns no pages for empty input', () => {
    expect(buildCaptionPages([])).toEqual([]);
    expect(buildCaptionPages([w(0, 1, '  ')])).toEqual([]);
  });

  it('limits words per page', () => {
    const words = Array.from({ length: 9 }, (_, i) => w(i * 0.3, i * 0.3 + 0.25, 'ab'));
    const pages = buildCaptionPages(words);
    expect(pages.map((p) => p.words.length)).toEqual([4, 4, 1]);
    expect(pages[0]?.start).toBe(0);
    expect(pages[0]?.end).toBeCloseTo(0.3 * 3 + 0.25, 9);
  });

  it('limits characters per page', () => {
    const words = [w(0, 0.3, 'database'), w(0.3, 0.6, 'indexing'), w(0.6, 0.9, 'strategy')];
    expect(buildCaptionPages(words).map((p) => p.words.length)).toEqual([2, 1]);
  });

  it('breaks after sentence-ending punctuation and at gaps', () => {
    const words = [
      w(0, 0.3, 'Sao?'),
      w(0.3, 0.6, 'Vì'),
      w(0.6, 0.9, 'index'),
      w(1.5, 1.8, 'nhanh'),
    ];
    expect(buildCaptionPages(words).map((p) => p.words.map((x) => x.text))).toEqual([
      ['Sao?'],
      ['Vì', 'index'],
      ['nhanh'],
    ]);
  });

  it('keeps a very long single word on its own page', () => {
    const long = 'x'.repeat(40);
    const pages = buildCaptionPages([w(0, 1, 'a'), w(1, 2, long), w(2, 3, 'b')]);
    expect(pages.map((p) => p.words.map((x) => x.text))).toEqual([['a'], [long], ['b']]);
  });

  it('handles unsorted, overlapping and zero-duration words', () => {
    const pages = buildCaptionPages([w(1, 1, 'hai'), w(0, 1.5, 'một'), w(-1, -1, 'ba')]);
    const all = pages.flatMap((p) => p.words);
    expect(all.map((x) => x.text)).toEqual(['một', 'ba', 'hai']);
    for (const word of all) expect(word.end).toBeGreaterThan(word.start);
    for (let i = 1; i < all.length; i += 1)
      expect(all[i]?.start ?? 0).toBeGreaterThanOrEqual(all[i - 1]?.start ?? 0);
    expect(all[1]?.end ?? 0).toBeLessThanOrEqual(all[2]?.start ?? 0);
  });
});

describe('normalizeWords', () => {
  it('does not mutate input', () => {
    const input = [w(1, 1, 'a')];
    normalizeWords(input);
    expect(input[0]).toEqual(w(1, 1, 'a'));
  });
});

describe('activeWordIndex / pageAt', () => {
  const pages = buildCaptionPages([w(0.5, 0.8, 'a'), w(0.8, 1.2, 'b'), w(3, 3.4, 'c')]);
  const first = pages[0] as CaptionPage;

  it('tracks the last started word and clamps before the first', () => {
    expect(activeWordIndex(first, 0)).toBe(0);
    expect(activeWordIndex(first, 0.79)).toBe(0);
    expect(activeWordIndex(first, 0.8)).toBe(1);
    expect(activeWordIndex(first, 99)).toBe(1);
  });

  it('keeps the previous page through gaps and shows nothing before the first', () => {
    expect(pageAt(pages, 0.1)).toBeUndefined();
    expect(pageAt(pages, 2)).toBe(pages[0]);
    expect(pageAt(pages, 3)).toBe(pages[1]);
  });
});
