import { describe, expect, it } from 'vitest';
import { summaryTimeline } from './timeline';

describe('summaryTimeline', () => {
  it('reveals in order, all started by 65% of the scene', () => {
    const d = 180;
    const t = summaryTimeline(d, 3, true);
    expect(t.pointStarts).toHaveLength(3);
    const all = [...t.pointStarts, t.loopStart ?? -1];
    expect(all).toEqual([...all].sort((a, b) => a - b));
    expect(Math.max(...all)).toBeLessThanOrEqual(Math.round(d * 0.65));
    expect(t.pointStarts[0]).toBeGreaterThan(0);
  });

  it('has no loop start without a loop line', () => {
    expect(summaryTimeline(150, 2, false).loopStart).toBeNull();
  });

  it('handles a single point and scales with duration', () => {
    const short = summaryTimeline(100, 1, false);
    const long = summaryTimeline(400, 1, false);
    expect(short.pointStarts).toHaveLength(1);
    expect(long.pointStarts[0]).toBeGreaterThan(short.pointStarts[0] ?? 0);
  });

  it('gives integer frames and survives degenerate input', () => {
    const t = summaryTimeline(0, 6, true);
    for (const f of [...t.pointStarts, t.loopStart ?? 0]) expect(Number.isInteger(f)).toBe(true);
  });
});
