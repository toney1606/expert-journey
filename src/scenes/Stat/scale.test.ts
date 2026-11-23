import { describe, expect, it } from 'vitest';
import { MIN_BAR, barFraction, pickScale } from './scale';

describe('bar scale', () => {
  it('is linear for similar values', () => {
    expect(pickScale([10, 20])).toBe('linear');
    expect(barFraction(10, [10, 20])).toBeCloseTo(0.5);
    expect(barFraction(20, [10, 20])).toBe(1);
  });
  it('switches to log across orders of magnitude and keeps order', () => {
    const values = [10000000, 24, 1000000000];
    expect(pickScale(values)).toBe('log');
    const [a, b, c] = values.map((v) => barFraction(v, values));
    expect(c).toBe(1);
    expect(b).toBeLessThan(a ?? 0);
    expect(a ?? 0).toBeLessThan(c ?? 0);
    expect(b ?? 0).toBeGreaterThanOrEqual(MIN_BAR);
  });
  it('handles zero and a single row', () => {
    expect(barFraction(0, [0, 5])).toBe(0);
    expect(barFraction(5, [5])).toBe(1);
    expect(barFraction(0, [0])).toBe(0);
  });
  it('never exceeds 1 and has a visible minimum', () => {
    expect(barFraction(1, [1, 1e12], 'linear')).toBe(MIN_BAR);
    expect(barFraction(1e12, [1, 1e12])).toBe(1);
  });
});
