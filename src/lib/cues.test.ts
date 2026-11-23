import { describe, expect, it } from 'vitest';
import { MIN_CUE_GAP, resolveCueFrames, spokenFrames } from './cues';

describe('resolveCueFrames', () => {
  it('returns the fallback unchanged when nothing is spoken', () => {
    expect(resolveCueFrames([undefined, undefined], [0, 22.5], 300)).toEqual([0, 22.5]);
    expect(resolveCueFrames([], [5, 9], 300)).toEqual([5, 9]);
  });

  it('uses spoken frames and keeps fallback for the rest', () => {
    expect(resolveCueFrames([undefined, 100, undefined], [0, 40, 130], 400)).toEqual([0, 100, 130]);
  });

  it('never goes backwards: a fallback before a spoken item is pushed after it', () => {
    const out = resolveCueFrames([100, undefined], [0, 40], 400);
    expect(out).toEqual([100, 100 + MIN_CUE_GAP]);
  });

  it('keeps a minimum gap between cues spoken at the same time', () => {
    expect(resolveCueFrames([50, 50, 50], [0, 10, 20], 400)).toEqual([
      50,
      50 + MIN_CUE_GAP,
      50 + 2 * MIN_CUE_GAP,
    ]);
  });

  it('keeps out-of-order spoken phrases in order', () => {
    const out = resolveCueFrames([200, 100], [0, 50], 400);
    expect(out[1]).toBeGreaterThan(out[0] ?? 0);
  });

  it('pulls late cues back so the last one starts before the end (and keeps order)', () => {
    const out = resolveCueFrames([395, 398, 399], [0, 1, 2], 400);
    expect(out[2]).toBeLessThanOrEqual(390);
    expect(out[1]).toBeLessThan(out[2] ?? 0);
    expect(out[0]).toBeLessThan(out[1] ?? 0);
  });

  it('stays non-decreasing and non-negative on tiny scenes', () => {
    const out = resolveCueFrames([2, 1, 0], [0, 0, 0], 5);
    for (let i = 1; i < out.length; i += 1) expect(out[i]).toBeGreaterThanOrEqual(out[i - 1] ?? 0);
    expect(Math.min(...out)).toBeGreaterThanOrEqual(0);
  });
});

describe('spokenFrames', () => {
  const words = [
    { text: 'Hello', start: 0.1, end: 0.4 },
    { text: 'index', start: 1, end: 1.3 },
    { text: 'nhanh', start: 1.4, end: 1.8 },
  ];
  it('maps phrases to frames, undefined when absent or not found', () => {
    expect(spokenFrames(words, ['Index nhanh', undefined, 'nothing here', 'hello'], 30)).toEqual([
      30,
      undefined,
      undefined,
      3,
    ]);
  });
  it('is all undefined without words', () => {
    expect(spokenFrames([], ['a'], 30)).toEqual([undefined]);
  });

  it('a repeated phrase matches its next occurrence, not the first again', () => {
    const rep = [
      { text: 'index', start: 1, end: 1.3 },
      { text: 'nhanh', start: 2, end: 2.3 },
      { text: 'index', start: 5, end: 5.3 },
    ];
    expect(spokenFrames(rep, ['index', 'index'], 30)).toEqual([30, 150]);
    // distinct phrases are untouched, even when spoken out of cue order
    expect(spokenFrames(rep, ['nhanh', 'index'], 30)).toEqual([60, 30]);
  });
});
