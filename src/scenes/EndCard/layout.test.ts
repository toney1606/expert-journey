import { describe, expect, it } from 'vitest';
import { ENDCARD_BOX, MIN_BODY, MIN_HEADLINE, endCardLayout } from './layout';
import { CONTENT_BOX } from '../../design/tokens';

const full = {
  headline: 'Index đúng chỗ, truy vấn nhanh gấp bội',
  subline: 'Đo bằng EXPLAIN trước khi tối ưu.',
  cta: 'Theo dõi để xem câu hỏi tiếp theo',
  brand: 'Expert Journey',
  loopLine: 'Vậy sao không index hết mọi cột?',
};

describe('endCardLayout', () => {
  it('uses the shared content box', () => {
    expect(ENDCARD_BOX).toBe(CONTENT_BOX);
  });
  it('fits a typical full card with big headline and body >= 30', () => {
    const l = endCardLayout(full);
    expect(l.fits).toBe(true);
    expect(l.headlineFontSize).toBeGreaterThanOrEqual(56);
    expect(l.sublineFontSize).toBeGreaterThanOrEqual(MIN_BODY);
    expect(l.loopFontSize).toBeGreaterThanOrEqual(MIN_BODY);
  });
  it('headline alone gets the largest size', () => {
    expect(endCardLayout({ headline: 'Hết' }).headlineFontSize).toBe(76);
  });
  it('shrinks monotonically as the headline grows', () => {
    let prev = Infinity;
    for (let n = 10; n <= 140; n += 10) {
      const l = endCardLayout({ ...full, headline: 'a'.repeat(n) });
      expect(l.headlineFontSize).toBeLessThanOrEqual(prev);
      prev = l.headlineFontSize;
    }
  });
  it('real limit: an 80-char headline fits the full card at min font, 300 chars does not', () => {
    expect(endCardLayout({ ...full, headline: 'a'.repeat(80) }).fits).toBe(true);
    const over = endCardLayout({ ...full, headline: 'a'.repeat(300) });
    expect(over.fits).toBe(false);
    expect(over.headlineFontSize).toBe(MIN_HEADLINE);
  });

  it('measures text without {accent|...} markup characters', () => {
    // Find the length n where adding the 9 markup characters would drop to a smaller font step.
    let n = 20;
    while (
      n < 200 &&
      endCardLayout({ headline: 'a'.repeat(n) }).headlineFontSize ===
        endCardLayout({ headline: 'a'.repeat(n + 9) }).headlineFontSize
    ) {
      n += 1;
    }
    expect(n).toBeLessThan(200);
    const plain = endCardLayout({ headline: 'a'.repeat(n) });
    const marked = endCardLayout({ headline: `{accent|${'a'.repeat(n)}}` });
    expect(marked.headlineFontSize).toBe(plain.headlineFontSize);
  });
});
