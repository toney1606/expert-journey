import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONTENT_BOX } from '../../design/tokens';
import { MIN_LINE, MIN_NUMBER, counterHookLayout } from './layout';
import { CounterHookPropsSchema, CounterHookSceneSchema } from './schema';
import { SHAKE_FRAMES, counterHookCues, counterHookTimeline, shakeOffset } from './timeline';

const base = CounterHookPropsSchema.parse({
  fastMs: 12,
  slowMs: 1200,
  lines: [{ text: 'Không đổi code' }, { text: 'Không đổi index' }, { text: 'Dữ liệu y nguyên' }],
  finalText: 'Database',
  accentWord: 'ĐOÁN',
});

describe('counterHookLayout', () => {
  it('fits the typical hook with big sizes', () => {
    const l = counterHookLayout(base);
    expect(l.fits).toBe(true);
    expect(l.numberSize).toBeGreaterThanOrEqual(MIN_NUMBER);
    expect(l.lineSize).toBeGreaterThanOrEqual(MIN_LINE);
    expect(l.height).toBeLessThanOrEqual(CONTENT_BOX.height);
    expect(l.numberSize).toBeGreaterThanOrEqual(160);
    expect(l.startSize).toBeGreaterThan(l.numberSize);
    expect(l.accentSize).toBeGreaterThanOrEqual(150);
    expect(l.lineSize).toBeGreaterThanOrEqual(56);
  });
  it('guards the foot line width', () => {
    expect(counterHookLayout({ ...base, footText: 'x'.repeat(40) }).fits).toBe(false);
    expect(counterHookLayout({ ...base, footText: 'Hôm nay nó đoán sai' }).fits).toBe(true);
  });
  it('reports a line that is far too long as not fitting', () => {
    const long = { ...base, lines: [{ text: 'x'.repeat(60) }] };
    expect(counterHookLayout(long).fits).toBe(false);
  });
});

describe('counterHookTimeline', () => {
  it('derives fallback frames from the duration, in order', () => {
    const t = counterHookTimeline(420, 3);
    expect(t.countStart).toBeLessThan(t.lineStarts[0] ?? 0);
    expect(t.lineStarts).toEqual([...t.lineStarts].sort((a, b) => a - b));
    expect(t.lineStarts[2] ?? 0).toBeLessThan(t.finalStart);
    expect(t.finalStart).toBeLessThan(420);
  });
  it('falls back when nothing is spoken and uses spoken frames otherwise', () => {
    const t = counterHookTimeline(420, 3);
    const fb = counterHookCues([undefined, undefined, undefined, undefined, undefined], 420, 3);
    expect(fb).toEqual({
      countStart: t.countStart,
      lineStarts: t.lineStarts,
      finalStart: t.finalStart,
    });
    const sp = counterHookCues([60, 150, 200, 250, 330], 420, 3);
    expect(sp).toEqual({ countStart: 60, lineStarts: [150, 200, 250], finalStart: 330 });
  });
});

describe('shakeOffset', () => {
  it('is zero outside the beat, non-zero inside, and deterministic', () => {
    expect(shakeOffset(-1)).toBe(0);
    expect(shakeOffset(SHAKE_FRAMES)).toBe(0);
    expect(Math.abs(shakeOffset(2))).toBeGreaterThan(1);
    expect(shakeOffset(5)).toBe(shakeOffset(5));
  });
});

describe('fragment 01-hook.json', () => {
  it('parses with CounterHookSceneSchema and keeps the approved voice', () => {
    const dir = resolve(__dirname, '../../../content/junior/23112026/database-index-guess');
    const scene = CounterHookSceneSchema.parse(
      JSON.parse(readFileSync(resolve(dir, 'scenes/01-hook.json'), 'utf8')),
    );
    const script = readFileSync(resolve(dir, 'notes/script-v1.md'), 'utf8');
    expect(script).toContain(`## 1 HookScene\n${scene.voice}\n`);
    expect(counterHookLayout(scene.props).fits).toBe(true);
    expect(scene.props.kicker).toEqual({ label: 'VẤN ĐỀ', step: 1, total: 8 });
  });
});
