import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatPage, latencyText, pageAt } from './format';
import { MIN_CODE, pageSliderLayout } from './layout';
import { PIN_PATHS } from './Pin';
import { PageSliderPropsSchema, PageSliderSceneSchema } from './schema';
import { pageSliderCues, pageSliderTimeline } from './timeline';

const code = 'SELECT * FROM orders\nORDER BY created_at DESC\nLIMIT 10 OFFSET 99990;';
const base = PageSliderPropsSchema.parse({
  code,
  question: 'Vì sao? Sửa thế nào?',
  pinText: 'Trả lời ở bình luận',
});

describe('formatting', () => {
  it('formats pages with dots', () => {
    expect(formatPage(10000)).toBe('10.000');
    expect(formatPage(1)).toBe('1');
    expect(pageAt(0, 1, 10000)).toBe(1);
    expect(pageAt(1, 1, 10000)).toBe(10000);
    expect(pageAt(2, 1, 10000)).toBe(10000);
  });
  it('shows qualitative labels when measurements are null and numbers when present', () => {
    const a = { ms: null, label: 'vài ms' };
    const b = { ms: undefined, label: 'chậm hẳn' };
    expect(latencyText(0, a, b)).toBe('vài ms');
    expect(latencyText(1, a, b)).toBe('chậm hẳn');
    expect(latencyText(0, { ms: 12, label: 'x' }, { ms: 1200, label: 'y' })).toBe('12 ms');
    expect(latencyText(1, { ms: 12, label: 'x' }, { ms: 1200, label: 'y' })).toBe('1.200 ms');
    expect(latencyText(0, { ms: 12, label: 'x' }, b)).toBe('12 ms');
  });
});

describe('pageSliderLayout', () => {
  it('fits the cliffhanger with big code and a giant page number', () => {
    const l = pageSliderLayout(base);
    expect(l.fits).toBe(true);
    expect(l.pageSize).toBeGreaterThanOrEqual(180);
    expect(l.questionLines.map((q) => q.text)).toEqual(['Vì sao?', 'Sửa thế nào?']);
    expect(l.questionLines.every((q) => q.size >= 96)).toBe(true);
    expect(l.codeSize).toBeGreaterThanOrEqual(MIN_CODE);
  });
  it('does not fit very long code', () => {
    expect(pageSliderLayout({ ...base, code: `${code}\n`.repeat(8) }).fits).toBe(false);
  });
  it('has a pin drawing', () => {
    expect(PIN_PATHS.length).toBeGreaterThan(0);
  });
});

describe('pageSliderTimeline', () => {
  it('derives ordered fallbacks from the duration', () => {
    const t = pageSliderTimeline(600);
    expect(t.dragStart).toBeLessThan(t.questionStart);
    expect(t.questionStart).toBeLessThan(t.pinStart);
    expect(t.pinStart).toBeLessThan(600);
    expect(pageSliderCues([undefined, undefined, undefined], 600)).toEqual({
      dragStart: t.dragStart,
      questionStart: t.questionStart,
      pinStart: t.pinStart,
    });
    expect(pageSliderCues([100, 300, 500], 600)).toEqual({
      dragStart: 100,
      questionStart: 300,
      pinStart: 500,
    });
  });
});

describe('fragment 08-cliffhanger.json', () => {
  it('parses with PageSliderSceneSchema and keeps the approved voice', () => {
    const dir = resolve(__dirname, '../../../content/junior/23112026/database-index-guess');
    const scene = PageSliderSceneSchema.parse(
      JSON.parse(readFileSync(resolve(dir, 'scenes/08-cliffhanger.json'), 'utf8')),
    );
    const script = readFileSync(resolve(dir, 'notes/script-v1.md'), 'utf8');
    expect(script).toContain(`## 8 CliffhangerScene\n${scene.voice}`);
    expect(pageSliderLayout(scene.props).fits).toBe(true);
    expect(scene.props.kicker).toEqual({ label: 'THỬ THÁCH', step: 8, total: 8 });
  });
});
