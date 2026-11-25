import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MIN_ROW_H, timeoutFlowLayout } from './layout';
import { TimeoutFlowPropsSchema, TimeoutFlowSceneSchema } from './schema';
import { timeoutFlowCues, timeoutFlowFallback } from './timeline';

const fragmentPath = resolve(
  __dirname,
  '../../../content/junior/23112026/idempotency-double-charge/scenes/02-timeout-flow.json',
);
const scene = TimeoutFlowSceneSchema.parse(JSON.parse(readFileSync(fragmentPath, 'utf8')));

describe('timeoutFlowLayout', () => {
  it('fits the real props with roomy rows', () => {
    const l = timeoutFlowLayout(scene.props);
    expect(l.fits).toBe(true);
    expect(l.rowHeight).toBeGreaterThanOrEqual(MIN_ROW_H);
    expect(l.heroSize).toBeGreaterThanOrEqual(56);
  });
  it('rejects absurd text', () => {
    const long = 'x'.repeat(60);
    expect(timeoutFlowLayout({ ...scene.props, requestLabel: long }).fits).toBe(false);
    expect(timeoutFlowLayout({ ...scene.props, hero: long }).fits).toBe(false);
    expect(timeoutFlowLayout({ ...scene.props, chargeAgainLabel: long }).fits).toBe(false);
    expect(timeoutFlowLayout({ ...scene.props, timeoutLabel: long }).fits).toBe(false);
  });
});

describe('timeoutFlowCues', () => {
  it('falls back to an ordered timeline from the duration', () => {
    const fb = timeoutFlowFallback(870);
    expect([...fb].sort((a, b) => a - b)).toEqual(fb);
    expect(Math.max(...fb)).toBeLessThan(870);
    expect(timeoutFlowCues([], 870).request).toBe(fb[0]);
  });
  it('uses spoken frames in order and keeps them monotonic', () => {
    const c = timeoutFlowCues([10, 100, 90, 300, 400, 500, 700], 870);
    const list = [c.request, c.charge, c.lost, c.timeout, c.retry, c.chargeAgain, c.lesson];
    expect([...list].sort((a, b) => a - b)).toEqual(list);
    expect(c.request).toBe(10);
    expect(c.lesson).toBe(700);
  });
});

describe('schema and fragment', () => {
  it('applies defaults and rejects missing labels', () => {
    const p = TimeoutFlowPropsSchema.parse({ ...scene.props, clientLabel: undefined });
    expect(p.clientLabel).toBe('Client');
    expect(TimeoutFlowPropsSchema.safeParse({ hero: 'x' }).success).toBe(false);
    expect(TimeoutFlowPropsSchema.safeParse({ ...scene.props, extra: 1 }).success).toBe(false);
  });
  it('keeps the voice, every cue phrase occurs in it', () => {
    const norm = (s: string): string =>
      s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').toLowerCase();
    const voice = norm(scene.voice);
    const p = scene.props;
    for (const at of [
      p.requestAt,
      p.chargeAt,
      p.lostAt,
      p.timeoutAt,
      p.retryAt,
      p.chargeAgainAt,
      p.lessonAt,
    ]) {
      expect(at).toBeTruthy();
      expect(voice).toContain(norm(at ?? ''));
    }
    expect(scene.draft.durationSec).toBe(29);
    expect(scene.mood).toBe('neutral');
  });
});
