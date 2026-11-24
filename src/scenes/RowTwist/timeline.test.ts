import { describe, expect, it } from 'vitest';
import { MIN_CUE_GAP } from '../../lib/cues';
import {
  TWIST_MORPH_FRAMES,
  TWIST_PAUSE,
  rowTwistFallback,
  rowTwistFrames,
  rowTwistRunFrames,
} from './timeline';

describe('rowTwist timeline', () => {
  it('derives an ordered fallback from the duration', () => {
    for (const d of [300, 780, 1200]) {
      const f = rowTwistFallback(d);
      expect(f).toHaveLength(7);
      expect(f).toEqual([...f].sort((a, b) => a - b));
      expect(f[6]).toBeLessThan(d);
    }
  });
  it('keeps cues ordered when spoken frames are given', () => {
    const c = rowTwistFrames([30, 100, 300, 400, 500, 650, 700], 780);
    const list = [c.toggle, c.slide, c.stat, c.belief, c.cursor, c.assumption, c.strike];
    for (let i = 1; i < list.length; i += 1) {
      expect(list[i]! - list[i - 1]!).toBeGreaterThanOrEqual(MIN_CUE_GAP);
    }
  });
  it('never starts the cursor before the slide has finished', () => {
    const c = rowTwistFrames([30, 100, 300, 400, 110, 650, 700], 780);
    expect(c.cursor).toBeGreaterThanOrEqual(c.slide + TWIST_MORPH_FRAMES + TWIST_PAUSE);
  });
  it('run length is bounded', () => {
    expect(rowTwistRunFrames(780, 400)).toBeGreaterThanOrEqual(60);
    expect(rowTwistRunFrames(780, 400)).toBeLessThanOrEqual(120);
  });
});
