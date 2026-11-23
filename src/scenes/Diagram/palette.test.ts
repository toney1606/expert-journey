import { describe, expect, it } from 'vitest';
import { mixHex, withAlpha } from './palette';

describe('palette', () => {
  it('mixes and converts token colours', () => {
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('rgb(128, 128, 128)');
    expect(mixHex('#102030', '#ffffff', 0)).toBe('rgb(16, 32, 48)');
    expect(withAlpha('#ff0080', 0.5)).toBe('rgba(255, 0, 128, 0.5)');
  });
});
