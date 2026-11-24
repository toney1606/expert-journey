import { describe, expect, it } from 'vitest';
import {
  blinkAmount,
  cellState,
  counterValue,
  cursorAt,
  cursorRunFrames,
  easeInOutCubic,
  readFraction,
  shakeOffset,
  staggerProgress,
  stepOpacities,
} from './motion';
import { fillRowsRemoved, formatNumber, rowsRemovedLine, wrapCode } from './format';

describe('staggerProgress', () => {
  it('starts later for later items and ends at 1 for all', () => {
    expect(staggerProgress(0.3, 0, 10)).toBeGreaterThan(staggerProgress(0.3, 9, 10));
    for (let k = 0; k < 10; k += 1) expect(staggerProgress(1, k, 10)).toBe(1);
    expect(staggerProgress(0, 5, 10)).toBe(0);
    expect(staggerProgress(0.5, 0, 1)).toBe(0.5);
  });
  it('eases 0..1', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
  });
});

describe('cursor', () => {
  const run = { start: 30, runFrames: 60, from: 0, to: 200 };
  it('walks from `from` to `to` and holds', () => {
    expect(cursorAt(0, run)).toBe(0);
    expect(cursorAt(60, run)).toBe(100);
    expect(cursorAt(90, run)).toBe(200);
    expect(cursorAt(500, run)).toBe(200);
  });
  it('marks pending cells collected and others skipped, only from readStart to the cursor', () => {
    const pending = new Set([3, 10]);
    expect(cellState(3, pending, 0, 5.5)).toBe('collected');
    expect(cellState(4, pending, 0, 5.5)).toBe('skipped');
    expect(cellState(6, pending, 0, 5.5)).toBe('idle');
    expect(cellState(2, pending, 3, 5.5)).toBe('idle');
    expect(cellState(3, pending, 0, null)).toBe('idle');
  });
  it('read fraction and counter reach the final value exactly at the stop', () => {
    expect(readFraction(null, 0, 199)).toBe(0);
    expect(readFraction(199, 0, 199)).toBe(1);
    expect(readFraction(99.9, 0, 199)).toBeCloseTo(0.5);
    expect(counterValue(200, 1)).toBe(200);
    expect(counterValue(4812309, 0.5)).toBe(2406155);
    expect(counterValue(10, 2)).toBe(10);
  });
  it('run length is derived from the scene length and bounded', () => {
    expect(cursorRunFrames(100, 0.2)).toBe(45);
    expect(cursorRunFrames(600, 0.2)).toBe(120);
    expect(cursorRunFrames(6000, 0.2)).toBe(150);
  });
});

describe('effects', () => {
  it('blink is off before start, then oscillates between 1 and low', () => {
    expect(blinkAmount(5, 10, 20)).toBe(0);
    expect(blinkAmount(10, 10, 20)).toBe(1);
    expect(blinkAmount(20, 10, 20)).toBeCloseTo(0.2);
    expect(blinkAmount(30, 10, 20)).toBe(1);
  });
  it('shake is bounded and ends at rest', () => {
    expect(shakeOffset(0, 10, 20, 8)).toBe(0);
    expect(shakeOffset(40, 10, 20, 8)).toBe(0);
    for (let f = 10; f <= 30; f += 1)
      expect(Math.abs(shakeOffset(f, 10, 20, 8))).toBeLessThanOrEqual(8);
  });
  it('step opacities cross-fade and always leave one step visible', () => {
    const b = [100, 200];
    expect(stepOpacities(0, b, 10)).toEqual([1, 0, 0]);
    expect(stepOpacities(105, b, 10)).toEqual([0.5, 0.5, 0]);
    expect(stepOpacities(150, b, 10)).toEqual([0, 1, 0]);
    expect(stepOpacities(1000, b, 10)).toEqual([0, 0, 1]);
    for (let f = 0; f < 300; f += 1) {
      const o = stepOpacities(f, b, 10);
      expect(o.reduce((a, c) => a + c, 0)).toBeCloseTo(1);
    }
  });
});

describe('number formatting', () => {
  it('uses dots for thousands', () => {
    expect(formatNumber(4812309)).toBe('4.812.309');
  });
  it('fills the Rows Removed placeholder only on its line', () => {
    const code = 'Limit (rows=10)\n  Rows Removed by Filter: …\nx … y';
    expect(fillRowsRemoved(code, 4812309)).toBe(
      'Limit (rows=10)\n  Rows Removed by Filter: 4.812.309\nx … y',
    );
    expect(rowsRemovedLine(code)).toBe(1);
    expect(rowsRemovedLine('none')).toBe(-1);
  });
});

describe('wrapCode', () => {
  it('breaks long lines at the last space and keeps short lines', () => {
    expect(wrapCode('CREATE INDEX idx_orders_status_created\nON orders (a, b);', 31)).toBe(
      'CREATE INDEX\nidx_orders_status_created\nON orders (a, b);',
    );
  });
});
