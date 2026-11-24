import { describe, expect, it } from 'vitest';
import { MIN_CUE_GAP } from '../../lib/cues';
import {
  COST_STEPS,
  HOP_HEIGHTS,
  HOP_XS,
  SEQ_PERIOD,
  costRoadsFrames,
  costRoadsTimeline,
  hopPosition,
  linePosition,
  runnerPeriod,
} from './timeline';

describe('costRoadsTimeline', () => {
  it('has one ordered integer frame per step, all before the end', () => {
    for (const d of [150, 600, 900]) {
      const t = costRoadsTimeline(d);
      expect(t).toHaveLength(COST_STEPS.length);
      expect(t).toEqual([...t].sort((a, b) => a - b));
      expect(Math.max(...t)).toBeLessThan(d);
      for (const f of t) expect(Number.isInteger(f)).toBe(true);
    }
  });
  it('survives a zero duration', () => {
    expect(costRoadsTimeline(0)).toHaveLength(COST_STEPS.length);
  });
});

describe('costRoadsFrames', () => {
  it('falls back when nothing is spoken', () => {
    expect(costRoadsFrames([], 600)).toEqual(costRoadsTimeline(600));
  });
  it('keeps order with a minimum gap and honours spoken frames', () => {
    const f = costRoadsFrames([20, 20, 20, undefined, 400, 100], 600);
    expect(f[0]).toBe(20);
    for (let i = 1; i < f.length; i += 1)
      expect(f[i]).toBeGreaterThanOrEqual((f[i - 1] ?? 0) + MIN_CUE_GAP);
  });
});

describe('runners', () => {
  it('the random road is as many times slower as its cost ratio', () => {
    expect(runnerPeriod(1, 1)).toBe(SEQ_PERIOD);
    expect(runnerPeriod(4, 1)).toBe(SEQ_PERIOD * 4);
    expect(runnerPeriod(1000, 1)).toBeLessThanOrEqual(144);
  });
  it('hops land on the points and arc above the baseline', () => {
    expect(hopPosition(0, 600, 56).x).toBeCloseTo((HOP_XS[0] ?? 0) * 600);
    expect(hopPosition(0, 600, 56).y).toBeCloseTo(56);
    const mid = hopPosition(0.5 / (HOP_XS.length - 1), 600, 56);
    expect(mid.y).toBeCloseTo(56 - (HOP_HEIGHTS[0] ?? 0));
    for (let t = 0; t < 1; t += 0.01) {
      const q = hopPosition(t, 600, 56);
      expect(q.y).toBeLessThanOrEqual(56);
      expect(q.x).toBeGreaterThanOrEqual(0);
      expect(q.x).toBeLessThanOrEqual(600);
    }
  });
  it('the straight runner stays on the baseline', () => {
    expect(linePosition(0.5, 600, 56)).toEqual({ x: 300, y: 56 });
    expect(linePosition(2, 600, 56).x).toBeLessThanOrEqual(600);
  });
});
