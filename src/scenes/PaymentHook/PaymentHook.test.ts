import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MIN_TEXT } from '../../components/ui/ui';
import { paymentHookLayout } from './layout';
import { PaymentHookPropsSchema, PaymentHookSceneSchema } from './schema';
import {
  SHAKE_FRAMES,
  paymentHookCues,
  paymentHookFallback,
  shakeOffset,
  typedChars,
  typingEnd,
} from './timeline';

const fragmentPath = resolve(
  __dirname,
  '../../../content/junior/23112026/idempotency-double-charge/scenes/01-double-charge.json',
);
const raw: unknown = JSON.parse(readFileSync(fragmentPath, 'utf8'));
const scene = PaymentHookSceneSchema.parse(raw);

describe('paymentHookLayout', () => {
  it('fits the real props with big sizes', () => {
    const l = paymentHookLayout(scene.props);
    expect(l.fits).toBe(true);
    expect(l.logSize).toBeGreaterThanOrEqual(48);
    expect(l.logSize).toBeGreaterThanOrEqual(MIN_TEXT);
    expect(l.chargedSize).toBeGreaterThanOrEqual(80);
    expect(l.tappedSize).toBeGreaterThanOrEqual(80);
    expect(l.questionSize).toBeGreaterThanOrEqual(100);
  });
  it('rejects absurdly long text', () => {
    const p = scene.props;
    expect(paymentHookLayout({ ...p, chargedLine: 'x'.repeat(40) }).fits).toBe(false);
    expect(paymentHookLayout({ ...p, moneyLabel: '9'.repeat(30) }).fits).toBe(false);
    const logs = [{ text: 'x'.repeat(60) }, ...p.logs.slice(1)];
    expect(paymentHookLayout({ ...p, logs }).fits).toBe(false);
    expect(paymentHookLayout({ ...p, question: 'y'.repeat(60) }).fits).toBe(false);
  });
});

describe('paymentHookCues', () => {
  it('has an ordered fallback inside the scene', () => {
    const f = paymentHookFallback(333);
    expect(f).toEqual([...f].sort((a, b) => a - b));
    expect(f[6] ?? 0).toBeLessThan(333 - 10);
  });
  it('uses the fallback when nothing is spoken and spoken frames otherwise', () => {
    const f = paymentHookFallback(333);
    const c = paymentHookCues(
      [undefined, undefined, undefined, undefined, undefined, undefined, undefined],
      333,
    );
    expect([c.charge, c.chargeAgain, c.tap, ...c.logs, c.question]).toEqual(f);
    const s = paymentHookCues([5, 40, 70, 130, 180, 230, 280], 333);
    expect(s).toEqual({
      charge: 5,
      chargeAgain: 40,
      tap: 70,
      logs: [130, 180, 230],
      question: 280,
    });
  });
});

describe('animation helpers', () => {
  it('shakes only inside the beat, deterministically', () => {
    expect(shakeOffset(-1)).toBe(0);
    expect(shakeOffset(SHAKE_FRAMES)).toBe(0);
    expect(Math.abs(shakeOffset(2))).toBeGreaterThan(1);
    expect(shakeOffset(4)).toBe(shakeOffset(4));
  });
  it('types a line progressively', () => {
    expect(typedChars('abcdef', -5)).toBe('');
    expect(typedChars('abcdef', 0)).toBe('a');
    expect(typedChars('abcdef', 100)).toBe('abcdef');
    expect(typingEnd('abcdef', 10)).toBe(14);
  });
});

describe('schema', () => {
  it('accepts the real fragment with the approved voice and kicker', () => {
    expect(scene.voice).toContain('Tiền khách bị trừ hai lần.');
    expect(scene.props.kicker).toEqual({ label: 'VẤN ĐỀ', step: 1, total: 5 });
    for (const at of [
      scene.props.chargeAt,
      scene.props.chargeAgainAt,
      scene.props.tapAt,
      scene.props.questionAt,
      ...scene.props.logs.map((l) => l.at),
    ]) {
      expect(scene.voice.toLowerCase()).toContain((at ?? '').toLowerCase());
    }
  });
  it('rejects bad input', () => {
    expect(PaymentHookPropsSchema.safeParse({ ...scene.props, logs: [] }).success).toBe(false);
    expect(PaymentHookPropsSchema.safeParse({ ...scene.props, extra: 1 }).success).toBe(false);
    expect(PaymentHookSceneSchema.safeParse({ ...(raw as object), type: 'x' }).success).toBe(false);
  });
});
