import { describe, expect, it } from 'vitest';
import { REVEAL_DONE_RATIO, SETTLE_FRAMES, buildTimeline, compareCueFrames } from './timeline';

describe('buildTimeline', () => {
  it('orders title < left < vs < right < verdict', () => {
    const t = buildTimeline(240, true);
    expect(t.title).toBeLessThan(t.left);
    expect(t.left).toBeLessThan(t.vs);
    expect(t.vs).toBeLessThan(t.right);
    expect(t.right).toBeLessThan(t.verdict);
  });
  it.each([120, 240, 600])('is settled by 80%% of a %i-frame scene', (d) => {
    const t = buildTimeline(d, true);
    expect(t.verdict + SETTLE_FRAMES).toBeLessThanOrEqual(Math.ceil(d * REVEAL_DONE_RATIO) + 1);
  });
  it('does not drag on long scenes and handles tiny ones', () => {
    expect(buildTimeline(3000, true).verdict).toBeLessThan(300);
    expect(buildTimeline(5, false).right).toBeGreaterThanOrEqual(0);
  });
});

describe('compareCueFrames', () => {
  it('equals the fallback timeline when nothing is spoken', () => {
    const fb = buildTimeline(300, true);
    expect(compareCueFrames([undefined, undefined, undefined], 300, true)).toEqual({
      left: fb.left,
      right: fb.right,
      verdict: fb.verdict,
    });
  });
  it('reveals left, right, verdict in order even if spoken right-first or verdict-first', () => {
    const c = compareCueFrames([200, 100, 50], 400, true);
    expect(c.right).toBeGreaterThan(c.left);
    expect(c.verdict).toBeGreaterThan(c.right);
  });
  it('ignores a verdict cue when there is no verdict', () => {
    const c = compareCueFrames([50, 80, 10], 300, false);
    expect(c.verdict).toBe(buildTimeline(300, false).verdict);
    expect(c.right).toBe(80);
  });
});
