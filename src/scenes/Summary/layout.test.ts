import { describe, expect, it } from 'vitest';
import { summaryLayout } from './layout';

const long = 'Index theo cột xuất hiện trong WHERE, JOIN, ORDER BY khi truy vấn dữ liệu lớn '
  .repeat(2)
  .slice(0, 120);

describe('summaryLayout', () => {
  it('uses a large font for a short list', () => {
    const l = summaryLayout(['Index tăng tốc đọc'], 'Vậy index một cột hay nhiều cột?');
    expect(l.fits).toBe(true);
    expect(l.fontSize).toBeGreaterThanOrEqual(44);
    expect(l.fontSize).toBeLessThanOrEqual(56);
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

  it('fits 6 long points with a loop line at a readable size', () => {
    const l = summaryLayout(
      Array.from({ length: 6 }, () => long),
      long,
    );
    expect(l.fontSize).toBeGreaterThanOrEqual(30);
    expect(l.lineHeight).toBeGreaterThanOrEqual(1.35);
  });

  it('reports fits=false at the minimum size for absurd input', () => {
    const l = summaryLayout(Array.from({ length: 6 }, () => 'x'.repeat(600)));
    expect(l.fits).toBe(false);
    expect(l.fontSize).toBe(30);
  });
});
