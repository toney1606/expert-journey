import { describe, expect, it } from 'vitest';
import { MIN_FONT, SUMMARY_BOX, summaryLayout } from './layout';
import { CONTENT_BOX } from '../../design/tokens';

const long = 'Index theo cột xuất hiện trong WHERE, JOIN, ORDER BY khi truy vấn dữ liệu lớn '
  .repeat(2)
  .slice(0, 120);

describe('summaryLayout', () => {
  it('uses a large font for a short list', () => {
    const l = summaryLayout(['Index tăng tốc đọc'], 'Vậy index một cột hay nhiều cột?');
    expect(l.fits).toBe(true);
    expect(l.fontSize).toBeGreaterThanOrEqual(40);
    expect(l.fontSize).toBeLessThanOrEqual(44);
    expect(l.lineHeight).toBeGreaterThanOrEqual(1.35);
  });

  it('shrinks monotonically as content grows', () => {
    let prev = Infinity;
    for (let n = 1; n <= 6; n += 1) {
      const l = summaryLayout(
        Array.from({ length: n }, () => long),
        'Loop?',
      );
      expect(l.fontSize).toBeLessThanOrEqual(prev);
      prev = l.fontSize;
    }
  });

  it('uses the shared content box', () => {
    expect(SUMMARY_BOX).toBe(CONTENT_BOX);
  });

  it('real limits at the minimum font (120-char points): 5 fit with a loop line or without, 6 do not', () => {
    const pts = (n: number) => Array.from({ length: n }, () => long);
    expect(summaryLayout(pts(5)).fits).toBe(true);
    expect(summaryLayout(pts(6)).fits).toBe(false);
    expect(summaryLayout(pts(4), 'Loop?').fits).toBe(true);
    expect(summaryLayout(pts(6), 'Loop?').fits).toBe(false);
  });

  it('never lets the loop font drop below the minimum', () => {
    const l = summaryLayout(
      Array.from({ length: 5 }, () => long),
      'Loop?',
    );
    expect(l.loopFontSize).toBeGreaterThanOrEqual(MIN_FONT);
  });

  it('reports fits=false at the minimum size for absurd input', () => {
    const l = summaryLayout(Array.from({ length: 6 }, () => 'x'.repeat(600)));
    expect(l.fits).toBe(false);
    expect(l.fontSize).toBe(MIN_FONT);
  });
});
