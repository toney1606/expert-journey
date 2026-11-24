import { describe, expect, it } from 'vitest';
import { MIN_LABEL, MIN_NUMBER, numberWidth, statLayout } from './layout';

const row = (over: Partial<Parameters<typeof statLayout>[1][number]> = {}) => ({
  label: '10.000.000 bản ghi',
  value: 10000000,
  unit: 'bước',
  ...over,
});

describe('statLayout', () => {
  it('fits 1 to 4 typical rows with legible sizes', () => {
    for (let n = 1; n <= 4; n += 1) {
      const rows = Array.from({ length: n }, () => row({ caption: 'Tìm kiếm với index' }));
      const l = statLayout('Con số gây sốc', rows);
      expect(l.fits).toBe(true);
      expect(l.numberSize).toBeGreaterThanOrEqual(MIN_NUMBER);
      expect(l.labelSize).toBeGreaterThanOrEqual(MIN_LABEL);
      expect(l.rowHeights).toHaveLength(n);
    }
  });
  it('gives fewer rows bigger numbers', () => {
    const one = statLayout('T', [row()]);
    const four = statLayout('T', [row(), row(), row(), row()]);
    expect(one.numberSize).toBeGreaterThan(four.numberSize);
  });
  it('reports overflow instead of hiding it', () => {
    const long = 'rất dài '.repeat(30);
    const l = statLayout(
      'T',
      Array.from({ length: 4 }, () => row({ label: long, caption: long })),
    );
    expect(l.fits).toBe(false);
  });
  it('flags a number that is too wide', () => {
    expect(statLayout('T', [row({ unit: 'đơn vị cực kỳ dài dòng không vừa' })]).fits).toBe(false);
  });
  it('measures counter width with narrow separators', () => {
    expect(numberWidth(1000, 100)).toBeLessThan(numberWidth(1234, 100) + 100);
    expect(numberWidth(24, 100)).toBeCloseTo(124);
  });
});

describe('statLayout limits', () => {
  const rows = (n: number, over = {}) => Array.from({ length: n }, () => row(over));
  it('keeps captions up to 4 rows, drops them to fit 5 rows, 6 rows never fit', () => {
    const four = statLayout('T', rows(4, { caption: 'Ghi chú ngắn' }));
    expect(four.fits).toBe(true);
    expect(four.showCaptions).toBe(true);
    expect(four.numberSize).toBe(76);
    const five = statLayout('T', rows(5, { caption: 'Ghi chú ngắn' }));
    expect(five.fits).toBe(true);
    expect(five.showCaptions).toBe(false);
    expect(five.numberSize).toBe(68);
    expect(statLayout('T', rows(6)).fits).toBe(false);
  });
  it('5 rows fit with a one-line title but not with a 2-line title plus footnote', () => {
    expect(statLayout('Quét bảng khổng lồ', rows(5)).fits).toBe(true);
    expect(
      statLayout('Chi phí khổng lồ của việc quét bảng', rows(5), 'Số liệu minh hoạ').fits,
    ).toBe(false);
  });
  it('fits the widest counter (1.000.000.000 + short unit) at the minimum size', () => {
    expect(statLayout('T', [row({ value: 1000000000 })]).fits).toBe(true);
  });
});
