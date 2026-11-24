import { describe, expect, it } from 'vitest';
import { MIN_CUE_GAP } from '../../lib/cues';
import { PAGE_TREE_STEPS, pageTreeFrames, pageTreeTimeline } from './timeline';

describe('pageTreeTimeline', () => {
  it('orders the steps and leaves room for the path (3 steps) before the end', () => {
    for (const d of [120, 540, 900]) {
      const t = pageTreeTimeline(d);
      expect(t.starts).toHaveLength(PAGE_TREE_STEPS.length);
      expect(t.starts).toEqual([...t.starts].sort((a, b) => a - b));
      const last = t.starts[t.starts.length - 1] ?? 0;
      expect(last + 3 * t.pathStep).toBeLessThan(d);
    }
  });
  it('handles degenerate durations with integer frames', () => {
    const t = pageTreeTimeline(0);
    for (const f of [...t.starts, t.countFrames, t.pathStep])
      expect(Number.isInteger(f)).toBe(true);
    expect(t.countFrames).toBeGreaterThanOrEqual(1);
  });
});

describe('pageTreeFrames', () => {
  it('falls back to the timeline when nothing is spoken', () => {
    expect(pageTreeFrames([], 540)).toEqual(pageTreeTimeline(540).starts);
  });
  it('uses spoken frames and keeps reveals in order with a gap', () => {
    const f = pageTreeFrames([10, 60, 60, undefined, 300, 200], 540);
    for (let i = 1; i < f.length; i += 1)
      expect(f[i]).toBeGreaterThanOrEqual((f[i - 1] ?? 0) + MIN_CUE_GAP);
    expect(f[0]).toBe(10);
  });
});
