import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { spokenFrames } from '../../lib/cues';
import { MIN_CODE, raceGapLayout } from './layout';
import { RaceGapPropsSchema, RaceGapSceneSchema } from './schema';
import { raceGapCues, raceGapFallback, typedChars, typedCode } from './timeline';

const fragmentPath = resolve(
  __dirname,
  '../../../content/junior/23112026/idempotency-double-charge/scenes/05-select-then-insert.json',
);
const fragment: unknown = JSON.parse(readFileSync(fragmentPath, 'utf8'));
const scene = RaceGapSceneSchema.parse(fragment);
const base = RaceGapPropsSchema.parse(scene.props);

describe('raceGapLayout', () => {
  it('fits the real scene with big hero and >= 40px code', () => {
    const l = raceGapLayout(base);
    expect(l.fits).toBe(true);
    expect(l.heroSizes[0]).toBeGreaterThanOrEqual(64);
    expect(l.codeSize).toBeGreaterThanOrEqual(MIN_CODE);
    expect(l.height).toBeLessThanOrEqual(1130);
  });
  it('rejects absurd text', () => {
    expect(raceGapLayout({ ...base, heroTop: 'x'.repeat(40) }).fits).toBe(false);
    expect(raceGapLayout({ ...base, request1Label: 'y'.repeat(40) }).fits).toBe(false);
    expect(raceGapLayout({ ...base, code: `${base.code}\n`.repeat(8) }).fits).toBe(false);
  });
});

describe('timeline', () => {
  it('has ordered fallbacks inside the scene', () => {
    const fb = raceGapFallback(500);
    expect([...fb].sort((a, b) => a - b)).toEqual(fb);
    expect(fb[fb.length - 1]).toBeLessThan(500);
    const c = raceGapCues([], 500);
    expect(c.hero).toBeLessThan(c.code);
    expect(c.request1).toBeLessThan(c.request2);
    expect(c.pin).toBeLessThan(500);
  });
  it('keeps cue order with spoken frames', () => {
    const c = raceGapCues([5, 20, 100, 200, 230, 300, 400], 500);
    expect(c).toEqual({
      hero: 5,
      code: 20,
      gap: 100,
      request1: 200,
      request2: 230,
      why: 300,
      pin: 400,
    });
  });
  it('types code and keeps the card height', () => {
    expect(typedChars(base.code, 0, 10)).toBe(0);
    expect(typedChars(base.code, 1000, 10)).toBe(base.code.length);
    const half = typedCode(base.code, 10);
    expect(half.split('\n').length).toBe(base.code.split('\n').length);
    expect(typedCode(base.code, base.code.length)).toBe(base.code);
  });
  it('every at phrase occurs in the voice', () => {
    const norm = (s: string): string =>
      s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase();
    const voice = norm(scene.voice);
    for (const p of [
      base.heroAt,
      base.codeAt,
      base.gapAt,
      base.request1At,
      base.request2At,
      base.whyAt,
      base.pinAt,
    ]) {
      expect(voice).toContain(norm(p ?? ''));
    }
    expect(spokenFrames([], [base.heroAt], 30)).toEqual([undefined]);
  });
});

describe('schema', () => {
  it('keeps the exact code line breaks', () => {
    expect(base.code.split('\n')).toHaveLength(5);
  });
  it('rejects bad input', () => {
    expect(RaceGapPropsSchema.safeParse({ ...base, extra: 1 }).success).toBe(false);
    expect(RaceGapPropsSchema.safeParse({ ...base, code: '' }).success).toBe(false);
    expect(RaceGapSceneSchema.safeParse({ ...scene, type: 'hook' }).success).toBe(false);
  });
});
