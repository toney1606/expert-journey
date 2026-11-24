import { describe, expect, it } from 'vitest';
import { mouthOpenAt } from './mouth';

describe('mouthOpenAt', () => {
  const words = [
    { start: 1, end: 1.4 },
    { start: 2, end: 2.2 },
  ];
  it('is closed in gaps and before the first word', () => {
    expect(mouthOpenAt(words, 0.5)).toBe(0);
    expect(mouthOpenAt(words, 1.7)).toBe(0);
    expect(mouthOpenAt([], 1)).toBe(0);
  });
  it('stays between 0.35 and 1 while a word is said', () => {
    for (let t = 1; t <= 1.4; t += 0.02) {
      const open = mouthOpenAt(words, t);
      expect(open).toBeGreaterThanOrEqual(0.35);
      expect(open).toBeLessThanOrEqual(1);
    }
  });
});
