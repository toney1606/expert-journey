import { describe, expect, it } from 'vitest';
import {
  FIX_MORPH_FRAMES,
  FIX_PAUSE,
  rowFixBoundaries,
  rowFixFallback,
  rowFixFrames,
  rowFixRunFrames,
} from './timeline';

describe('rowFix timeline', () => {
  it('derives an ordered fallback from the duration', () => {
    for (const d of [400, 1200, 2000]) {
      const f = rowFixFallback(d);
      expect(f).toHaveLength(8);
      expect(f).toEqual([...f].sort((a, b) => a - b));
      expect(f[7]).toBeLessThan(d);
    }
  });
  it('uses spoken frames, with steps in order', () => {
    const c = rowFixFrames([150, 400, 500, 650, 750, 830, 930, 1050], 1200);
    expect(c.analyze).toBe(400);
    const [a, b] = rowFixBoundaries(c);
    expect(a).toBe(c.analyze);
    expect(b).toBe(c.strip);
    expect(b).toBeGreaterThan(a);
  });
  it('the cursor waits for the cluster and the result waits for the cursor', () => {
    const c = rowFixFrames([150, 400, 500, 650, 750, 830, 840, 845], 1200);
    expect(c.cursor).toBeGreaterThanOrEqual(c.morph + FIX_MORPH_FRAMES + FIX_PAUSE);
    expect(c.result).toBeGreaterThanOrEqual(c.cursor);
  });
  it('the jump into the cluster is a short run', () => {
    expect(rowFixRunFrames(1200, 900)).toBeLessThanOrEqual(45);
    expect(rowFixRunFrames(1200, 900)).toBeGreaterThanOrEqual(24);
  });
});
