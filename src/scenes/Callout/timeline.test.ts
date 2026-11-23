import { describe, expect, it } from 'vitest';
import { MIN_CUE_GAP } from '../../lib/cues';
import { calloutCueFrames, calloutTimeline, slamShake } from './timeline';

describe('calloutTimeline', () => {
  it('orders kicker, slam, explanation and finishes before 80%', () => {
    for (const d of [90, 210, 600]) {
      const t = calloutTimeline(d);
      expect(t.kickerStart).toBeLessThanOrEqual(t.statementStart);
      expect(t.statementStart).toBeLessThan(t.explanationStart);
      expect(t.explanationStart).toBeLessThan(d * 0.6);
      expect(t.statementStart + t.strikeDelay).toBeLessThan(d * 0.5);
    }
  });
  it('survives a degenerate duration', () => {
    expect(calloutTimeline(0).explanationStart).toBeGreaterThanOrEqual(0);
  });
});

describe('slamShake', () => {
  it('is zero before the slam and settles to exactly zero', () => {
    expect(slamShake(-3)).toBe(0);
    expect(slamShake(0)).toBe(0);
    expect(slamShake(60)).toBe(0);
  });
  it('moves right after the slam and decays', () => {
    const early = Math.max(...[1, 2, 3].map((f) => Math.abs(slamShake(f))));
    const late = Math.max(...[10, 11, 12].map((f) => Math.abs(slamShake(f))));
    expect(early).toBeGreaterThan(1);
    expect(late).toBeLessThan(early);
  });
});

describe('calloutCueFrames', () => {
  it('uses the fallbacks when nothing is spoken', () => {
    const t = calloutTimeline(300);
    expect(calloutCueFrames([undefined, undefined], 300, true)).toEqual({
      statement: t.statementStart,
      explanation: t.explanationStart,
    });
  });
  it('explanation never lands before or with the statement', () => {
    const c = calloutCueFrames([150, 60], 400, true);
    expect(c.explanation).toBeGreaterThanOrEqual(c.statement + MIN_CUE_GAP);
  });
  it('without an explanation only the statement is resolved', () => {
    expect(calloutCueFrames([42, 10], 300, false).statement).toBe(42);
  });
});
