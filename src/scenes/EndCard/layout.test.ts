import { describe, expect, it } from 'vitest';
import { ENDCARD_BOX, MAX_HEADLINE, MIN_BODY, MIN_HEADLINE, endCardLayout } from './layout';
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
    expect(endCardLayout({ headline: 'Hết' }).headlineFontSize).toBe(MAX_HEADLINE);
  });
  it('shrinks monotonically as the headline grows', () => {
    let prev = Infinity;
    for (let n = 10; n <= 140; n += 10) {
      const l = endCardLayout({ ...full, headline: 'a'.repeat(n) });
      expect(l.headlineFontSize).toBeLessThanOrEqual(prev);
      prev = l.headlineFontSize;
    }
  });
  it('real limit: with subline 60 + cta 40 + loop 60 a 100-char headline fits at min font, 120 does not', () => {
    const rest = {
      subline: 'a'.repeat(60),
      cta: 'a'.repeat(40),
      loopLine: 'a'.repeat(60),
      brand: 'Expert Journey',
    };
    const ok = endCardLayout({ ...rest, headline: 'a'.repeat(100) });
    expect(ok.fits).toBe(true);
    expect(ok.headlineFontSize).toBe(MIN_HEADLINE);
    const over = endCardLayout({ ...rest, headline: 'a'.repeat(120) });
    expect(over.fits).toBe(false);
    expect(over.headlineFontSize).toBe(MIN_HEADLINE);
  });
  it('headline alone: 300 chars still fits (shrunk), 400 does not', () => {
    expect(endCardLayout({ headline: 'a'.repeat(300) }).fits).toBe(true);
    expect(endCardLayout({ headline: 'a'.repeat(400) }).fits).toBe(false);
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
