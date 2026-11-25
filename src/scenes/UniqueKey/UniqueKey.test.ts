import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizeToken } from '../../lib/spoken';

const normalize = (t: string): string =>
  t.split(/\s+/).map(normalizeToken).filter(Boolean).join(' ');
import { LOCK_PATHS } from './Lock';
import { MIN_CODE, uniqueKeyLayout } from './layout';
import { UniqueKeyPropsSchema, UniqueKeySceneSchema } from './schema';
import { typeFrames, typedChars, uniqueKeyCues, uniqueKeyFallback } from './timeline';

const base = UniqueKeyPropsSchema.parse({
  code: 'ALTER TABLE payments\nADD CONSTRAINT\n  uq_payments_idem_key\nUNIQUE (idempotency_key);',
  hero: ['Chốt chặn {wrong|cuối}:', '{accent|database}'],
  rowOk: 'a1b2-c3d4 · 500.000đ',
  rowDup: 'a1b2-c3d4 · 500.000đ',
});

describe('uniqueKeyLayout', () => {
  it('fits with big hero, code and rows', () => {
    const l = uniqueKeyLayout(base);
    expect(l.fits).toBe(true);
    expect(l.heroSizes[0]).toBeGreaterThanOrEqual(80);
    expect(l.codeSize).toBeGreaterThanOrEqual(MIN_CODE);
    expect(l.rowSize).toBeGreaterThanOrEqual(44);
    expect(l.uniqueLine).toBe(3);
  });
  it('rejects absurd text', () => {
    expect(uniqueKeyLayout({ ...base, hero: ['x'.repeat(40), 'y'] }).fits).toBe(false);
    expect(uniqueKeyLayout({ ...base, code: `${base.code}\n`.repeat(6) }).fits).toBe(false);
    expect(uniqueKeyLayout({ ...base, rowDup: 'z'.repeat(40) }).fits).toBe(false);
    expect(uniqueKeyLayout({ ...base, code: 'A'.repeat(60) }).fits).toBe(false);
  });
  it('has a lock drawing', () => {
    expect(LOCK_PATHS.length).toBeGreaterThan(0);
  });
});

describe('uniqueKeyTimeline', () => {
  it('derives ordered fallbacks and keeps the tail free', () => {
    const f = uniqueKeyFallback(360);
    expect([...f].sort((a, b) => a - b)).toEqual(f);
    expect(uniqueKeyCues([], 360).badge).toBe(f[5]);
    expect(f[5]).toBeLessThan(360 - 10);
  });
  it('uses spoken frames and keeps them monotonic', () => {
    const c = uniqueKeyCues([20, 90, 130, 200, 260, 300], 360);
    expect(c).toEqual({ hero1: 20, hero2: 90, code: 130, rowOk: 200, rowDup: 260, badge: 300 });
    const late = uniqueKeyCues([20, 90, 130, 200, 260, 355], 360);
    expect(late.badge).toBeLessThanOrEqual(350);
  });
  it('types in order and finishes before the first row', () => {
    const frames = typeFrames(75, 130, 200);
    expect(130 + frames).toBeLessThanOrEqual(200);
    expect(typedChars(120, 130, frames, 75)).toBe(0);
    expect(typedChars(130 + frames, 130, frames, 75)).toBe(75);
    expect(typedChars(130 + frames / 2, 130, frames, 75)).toBeGreaterThan(0);
  });
});

describe('fragment 04-unique-constraint.json', () => {
  const dir = resolve(__dirname, '../../../content/junior/23112026/idempotency-double-charge');
  const scene = UniqueKeySceneSchema.parse(
    JSON.parse(readFileSync(resolve(dir, 'scenes/04-unique-constraint.json'), 'utf8')),
  );
  it('fits and keeps every cue phrase inside the voice', () => {
    expect(uniqueKeyLayout(scene.props).fits).toBe(true);
    const voice = normalize(scene.voice);
    const cues = [
      ...(scene.props.heroAt ?? []),
      scene.props.codeAt,
      scene.props.rowOkAt,
      scene.props.rowDupAt,
      scene.props.badgeAt,
    ];
    for (const c of cues) expect(` ${voice} `).toContain(` ${normalize(c ?? '')} `);
    expect(scene.props.kicker).toEqual({ label: 'CHỐT CHẶN', step: 4, total: 5 });
  });
  it('rejects bad input', () => {
    expect(UniqueKeyPropsSchema.safeParse({ ...base, hero: [] }).success).toBe(false);
    expect(UniqueKeyPropsSchema.safeParse({ ...base, extra: 1 }).success).toBe(false);
  });
});
