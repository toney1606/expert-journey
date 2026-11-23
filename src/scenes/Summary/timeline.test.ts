import { describe, expect, it } from 'vitest';
import { applySummaryCues, summaryTimeline } from './timeline';

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

describe('applySummaryCues', () => {
  const fallback = summaryTimeline(300, 3, true);

  it('is a no-op without cues', () => {
    expect(applySummaryCues(fallback, [], undefined, 300)).toEqual(fallback);
  });

  it('moves points and the loop line to their spoken frames', () => {
    const t = applySummaryCues(fallback, [40, undefined, 150], 220, 300);
    expect(t.pointStarts[0]).toBe(40);
    expect(t.pointStarts[2]).toBe(150);
    expect(t.loopStart).toBe(220);
    expect(t.labelStart).toBe(0);
  });

  it('keeps order when a cue contradicts the fallback', () => {
    const t = applySummaryCues(fallback, [200, undefined, undefined], undefined, 300);
    const all = [...t.pointStarts, t.loopStart ?? 0];
    for (let i = 1; i < all.length; i += 1) expect(all[i]).toBeGreaterThan(all[i - 1] ?? 0);
  });

  it('works without a loop line', () => {
    const t = applySummaryCues(summaryTimeline(300, 2, false), [30, 90], 100, 300);
    expect(t.loopStart).toBeNull();
    expect(t.pointStarts).toEqual([30, 90]);
  });
});
