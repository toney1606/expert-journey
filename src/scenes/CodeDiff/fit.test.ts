import { describe, expect, it } from 'vitest';
import { CONTENT_BOX } from '../../design/tokens';
import { ADVANCE_EM, fitFontSize, wrapTokens } from './fit';

/** Card inner width in CodeDiff: content box minus 2 x 24px card padding. */
const W = CONTENT_BOX.width - 48;

describe('fitFontSize', () => {
  it('uses the max size for short lines', () => {
    expect(fitFontSize(['a = 1'], W).fontSize).toBe(44);
  });

  it('shrinks so the longest line fits', () => {
    const line = 'x'.repeat(40);
    const fit = fitFontSize([line, 'y'], W);
    expect(fit.fontSize).toBeLessThan(44);
    expect(fit.fontSize).toBeGreaterThanOrEqual(22);
    expect(40 * ADVANCE_EM * fit.fontSize).toBeLessThanOrEqual(W);
    expect(fit.wraps).toBe(false);
  });

  it('clamps to the min size and wraps very long lines', () => {
    const fit = fitFontSize(['x'.repeat(200)], W);
    expect(fit.fontSize).toBe(22);
    expect(fit.wraps).toBe(true);
    expect(fit.maxCols * ADVANCE_EM * fit.fontSize).toBeLessThanOrEqual(W);
  });

  it('handles empty input', () => {
    expect(fitFontSize([], W).fontSize).toBe(44);
  });
});

describe('wrapTokens', () => {
  it('splits tokens across rows without losing text', () => {
    const rows = wrapTokens(
      [
        { type: 'keyword', text: 'const' },
        { type: 'plain', text: ' ' },
        { type: 'identifier', text: 'abcdefgh' },
      ],
      6,
    );
    expect(rows.map((r) => r.map((t) => t.text).join(''))).toEqual(['const ', 'abcdef', 'gh']);
  });

  it('returns one empty row for an empty line', () => {
    expect(wrapTokens([], 10)).toEqual([[]]);
  });
});
