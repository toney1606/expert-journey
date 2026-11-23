import { describe, expect, it } from 'vitest';
import { MIN_CUE_GAP } from '../../lib/cues';
import { statRowFrames, statTimeline } from './timeline';

describe('statTimeline', () => {
  it('starts rows in order and lands every counter by 80%', () => {
    for (const d of [90, 240, 600]) {
      const t = statTimeline(d, 4);
      expect(t.rowStarts).toEqual([...t.rowStarts].sort((a, b) => a - b));
      expect(Math.max(...t.rowStarts) + t.countFrames).toBeLessThanOrEqual(Math.round(d * 0.8));
    }
  });
  it('handles one row and degenerate input', () => {
    expect(statTimeline(200, 1).rowStarts).toHaveLength(1);
    const t = statTimeline(0, 3);
    for (const f of [...t.rowStarts, t.countFrames]) expect(Number.isInteger(f)).toBe(true);
    expect(t.countFrames).toBeGreaterThanOrEqual(1);
  });
});

describe('statRowFrames', () => {
  it('keeps the fallback rows when nothing is spoken', () => {
    expect(statRowFrames([undefined, undefined], 300)).toEqual(statTimeline(300, 2).rowStarts);
  });
  it('keeps rows in order when the narrator says the second one first', () => {
    const [a, b] = statRowFrames([200, 100], 400);
    expect(b).toBeGreaterThanOrEqual((a ?? 0) + MIN_CUE_GAP);
  });
  it('never puts two rows on the same frame', () => {
    const rows = statRowFrames([90, 90, 90], 400);
    expect(rows[1]).toBeGreaterThan(rows[0] ?? 0);
    expect(rows[2]).toBeGreaterThan(rows[1] ?? 0);
  });
});
