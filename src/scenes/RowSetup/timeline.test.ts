import { describe, expect, it } from 'vitest';
import { rowSetupFallback, rowSetupFrames, rowSetupRunFrames, SETUP_HOLD } from './timeline';

describe('rowSetup timeline', () => {
  it('derives the fallback from the duration, in reveal order', () => {
    for (const d of [200, 510, 900]) {
      const f = rowSetupFallback(d);
      expect(f).toEqual([...f].sort((a, b) => a - b));
      expect(f[3]).toBeLessThan(d);
    }
  });
  it('uses spoken frames and falls back per cue', () => {
    expect(rowSetupFrames([], 510)).toEqual({ table: 10, code: 61, pending: 153, cursor: 255 });
    const c = rowSetupFrames([undefined, 40, undefined, 300], 510);
    expect(c.code).toBe(40);
    expect(c.cursor).toBe(300);
    expect(c.pending).toBeGreaterThan(c.code);
  });
  it('lets the cursor finish before the hold at the end', () => {
    for (const [d, start] of [
      [510, 255],
      [510, 450],
    ] as const) {
      const run = rowSetupRunFrames(d, start);
      expect(run).toBeGreaterThanOrEqual(12);
      if (start + run > d - SETUP_HOLD) expect(run).toBe(12);
    }
  });
});
