import { describe, expect, it } from 'vitest';
import { endCardTimeline } from './timeline';

describe('endCardTimeline', () => {
  it('orders all items and starts the last by 62%', () => {
    const t = endCardTimeline(300, { subline: true, cta: true, loopLine: true, brand: true });
    const seq = [t.headlineStart, t.sublineStart, t.ctaStart, t.loopStart, t.brandStart];
    expect(seq.every((v) => v !== null)).toBe(true);
    const nums = seq as number[];
    expect([...nums].sort((a, b) => a - b)).toEqual(nums);
    expect(nums[4]).toBeLessThanOrEqual(Math.round(300 * 0.62));
  });
  it('skips missing items', () => {
    const t = endCardTimeline(300, { subline: false, cta: true, loopLine: false, brand: false });
    expect(t.sublineStart).toBeNull();
    expect(t.loopStart).toBeNull();
    expect(t.brandStart).toBeNull();
    expect(t.ctaStart).toBeGreaterThan(t.headlineStart);
  });
  it('headline only starts early', () => {
    const t = endCardTimeline(300, { subline: false, cta: false, loopLine: false, brand: false });
    expect(t.headlineStart).toBeLessThan(30);
  });
});
