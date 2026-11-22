import { describe, expect, it } from 'vitest';
import { ADVANCE_EM, fitFontSize, wrapTokens } from './fit';

describe('fitFontSize', () => {
  it('uses the max size for short lines', () => {
    expect(fitFontSize(['a = 1'], 794).fontSize).toBe(40);
  });

  it('shrinks so the longest line fits', () => {
    const line = 'x'.repeat(40);
    const fit = fitFontSize([line, 'y'], 794);
    expect(fit.fontSize).toBeLessThan(40);
    expect(fit.fontSize).toBeGreaterThanOrEqual(22);
    expect(40 * ADVANCE_EM * fit.fontSize).toBeLessThanOrEqual(794);
    expect(fit.wraps).toBe(false);
  });

  it('clamps to the min size and wraps very long lines', () => {
    const fit = fitFontSize(['x'.repeat(200)], 794);
    expect(fit.fontSize).toBe(22);
    expect(fit.wraps).toBe(true);
    expect(fit.maxCols * ADVANCE_EM * fit.fontSize).toBeLessThanOrEqual(794);
  });

  it('handles empty input', () => {
    expect(fitFontSize([], 794).fontSize).toBe(40);
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
