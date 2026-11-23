import { describe, expect, it } from 'vitest';
import { CALLOUT_BOX, MAX_LINES, MIN_FONT, calloutLayout } from './layout';
import { CONTENT_BOX } from '../../design/tokens';

describe('calloutLayout', () => {
  it('uses the shared content box', () => {
    expect(CALLOUT_BOX).toBe(CONTENT_BOX);
  });

  it('gives a short statement a huge font and a body font >= 30', () => {
    const l = calloutLayout(
      'INDEX ≠ LUÔN NHANH HƠN',
      'Planner có thể chọn Seq Scan khi phải đọc phần lớn bảng.',
    );
    expect(l.fits).toBe(true);
    expect(l.statementFontSize).toBeGreaterThanOrEqual(64);
    expect(l.statementLines).toBeLessThanOrEqual(MAX_LINES);
    expect(l.explanationFontSize).toBeGreaterThanOrEqual(30);
  });

  it('ignores markup characters when measuring', () => {
    expect(calloutLayout('{wrong|abc} def').statementFontSize).toBe(
      calloutLayout('abc def').statementFontSize,
    );
  });

  it('shrinks monotonically and keeps >= MIN_FONT when it fits', () => {
    let prev = Infinity;
    for (let n = 5; n <= 60; n += 5) {
      const l = calloutLayout('a'.repeat(n));
      expect(l.statementFontSize).toBeLessThanOrEqual(prev);
      if (l.fits) expect(l.statementFontSize).toBeGreaterThanOrEqual(MIN_FONT);
      prev = l.statementFontSize;
    }
  });

  it('real limits at the minimum font: 55 chars fit, 70 do not (no explanation)', () => {
    expect(calloutLayout('a'.repeat(55)).fits).toBe(true);
    expect(calloutLayout('a'.repeat(70)).fits).toBe(false);
    expect(calloutLayout('a'.repeat(70)).statementFontSize).toBe(MIN_FONT);
  });

  it('an explanation costs room but a long one still fits a short statement', () => {
    const exp = 'x'.repeat(130);
    expect(calloutLayout('Ngắn gọn', exp).fits).toBe(true);
    expect(calloutLayout('a'.repeat(55), exp).fits).toBe(true);
  });
});
