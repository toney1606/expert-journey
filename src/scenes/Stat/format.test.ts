import { describe, expect, it } from 'vitest';
import { decimalsOf, formatNumber } from './format';

describe('formatNumber', () => {
  it('uses dots for thousands', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(24)).toBe('24');
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(1000)).toBe('1.000');
    expect(formatNumber(10000000)).toBe('10.000.000');
    expect(formatNumber(1000000000)).toBe('1.000.000.000');
    expect(formatNumber(9629630)).toBe('9.629.630');
  });
  it('uses a comma for decimals', () => {
    expect(formatNumber(3.5)).toBe('3,5');
    expect(formatNumber(1234.56)).toBe('1.234,56');
    expect(formatNumber(2, 1)).toBe('2,0');
    expect(formatNumber(1234.5, 0)).toBe('1.235');
    expect(formatNumber(0.125)).toBe('0,125');
    expect(formatNumber(1234.5678)).toBe('1.234,568');
  });
  it('is safe on odd input', () => {
    expect(formatNumber(Number.NaN)).toBe('0');
    expect(formatNumber(-5)).toBe('0');
  });
  it('decimalsOf', () => {
    expect(decimalsOf(5)).toBe(0);
    expect(decimalsOf(0.5)).toBe(1);
    expect(decimalsOf(0.25)).toBe(2);
    expect(decimalsOf(0.123456)).toBe(3);
    expect(decimalsOf(0.125)).toBe(3);
    expect(decimalsOf(0.1)).toBe(1);
    expect(decimalsOf(2.5004)).toBe(1);
    expect(decimalsOf(2.0004)).toBe(0);
  });
});
