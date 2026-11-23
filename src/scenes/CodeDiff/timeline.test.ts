import { describe, expect, it } from 'vitest';
import { BADGE_START, BEFORE_END, MORPH_END, codeTimeline } from './timeline';

describe('codeTimeline', () => {
  it('is the proportional timeline without cues', () => {
    expect(codeTimeline(300)).toEqual({
      morphStart: 300 * BEFORE_END,
      morphEnd: 300 * MORPH_END,
      badgeStart: 300 * BADGE_START,
    });
  });

  it('starts the morph at the cue and keeps its length', () => {
    const t = codeTimeline(300, 60);
    expect(t.morphStart).toBe(60);
    expect(t.morphEnd - t.morphStart).toBeCloseTo(300 * (MORPH_END - BEFORE_END));
    expect(t.badgeStart).toBe(300 * BADGE_START);
  });

  it('moves only the badge for a tested cue', () => {
    const t = codeTimeline(300, undefined, 250);
    expect(t.badgeStart).toBe(250);
    expect(t.morphStart).toBe(300 * BEFORE_END);
  });

  it('keeps morph before badge when cues are close or reversed', () => {
    const t = codeTimeline(300, 200, 100);
    expect(t.badgeStart).toBeGreaterThan(t.morphStart);
    expect(t.morphEnd).toBeGreaterThan(t.morphStart);
  });

  it('shortens the morph when the badge cue follows soon', () => {
    const t = codeTimeline(300, 100, 130);
    expect(t.morphEnd).toBeLessThan(130);
    expect(t.morphEnd).toBeGreaterThan(100);
  });
});
