import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { idemKeyLayout } from './layout';
import { IdemKeyPropsSchema, IdemKeySceneSchema } from './schema';
import { idemKeyCues, idemKeyFallback } from './timeline';

const fragmentPath = resolve(
  __dirname,
  '../../../content/junior/23112026/idempotency-double-charge/scenes/03-idempotency-key.json',
);
const fragment = JSON.parse(readFileSync(fragmentPath, 'utf8')) as unknown;
const scene = IdemKeySceneSchema.parse(fragment);

describe('idemKeyLayout', () => {
  it('fits the real props with a huge hero', () => {
    const l = idemKeyLayout(scene.props);
    expect(l.fits).toBe(true);
    expect(l.heroSizes[0]).toBeGreaterThanOrEqual(90);
    expect(l.heroSizes[1]).toBeLessThanOrEqual(l.heroSizes[0] ?? 0);
  });
  it('rejects absurd text', () => {
    const long = 'x'.repeat(80);
    expect(idemKeyLayout({ ...scene.props, hero: [long] }).fits).toBe(false);
    expect(
      idemKeyLayout({ ...scene.props, lane1: { ...scene.props.lane1, outcome: long } }).fits,
    ).toBe(false);
    expect(idemKeyLayout({ ...scene.props, keyValue: long }).fits).toBe(false);
  });
});

describe('idemKeyCues', () => {
  it('derives ordered fallbacks from the duration', () => {
    const f = idemKeyFallback(600);
    expect([...f].sort((a, b) => a - b)).toEqual(f);
    const c = idemKeyCues([], 600);
    expect(c.back).toBeLessThan(600 - 10);
    expect(c.chip).toBe(f[2]);
  });
  it('keeps spoken cues monotonic and clamps the tail', () => {
    const c = idemKeyCues([0, 50, 40, 200, 300, 700, 710, 720, 730], 600);
    const seq = [c.hero, c.lanes, c.chip, c.send, c.retry, c.save, c.stamp, c.noCharge, c.back];
    expect([...seq].sort((a, b) => a - b)).toEqual(seq);
    expect(c.back).toBeLessThanOrEqual(590);
  });
});

describe('schema and fragment', () => {
  it('accepts the real fragment, keeps the voice, and cues occur in it', () => {
    expect(scene.type).toBe('idemkey');
    expect(scene.props.kicker).toEqual({ label: 'CÁCH SỬA', step: 3, total: 5 });
    const voice = scene.voice.toLowerCase();
    const p = scene.props;
    for (const at of [
      p.heroAt,
      p.lanesAt,
      p.chipAt,
      p.sendAt,
      p.retryAt,
      p.saveAt,
      p.stampAt,
      p.noChargeAt,
      p.returnAt,
    ]) {
      expect(voice).toContain((at ?? '').toLowerCase());
    }
  });
  it('rejects bad input', () => {
    expect(IdemKeyPropsSchema.safeParse({ ...scene.props, hero: [] }).success).toBe(false);
    expect(IdemKeyPropsSchema.safeParse({ ...scene.props, extra: 1 }).success).toBe(false);
    expect(IdemKeySceneSchema.safeParse({ ...scene, type: 'other' }).success).toBe(false);
  });
});
