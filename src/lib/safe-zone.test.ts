import { describe, expect, it } from 'vitest';
import { safeBox } from './safe-zone';

describe('safeBox', () => {
  it('subtracts insets from the frame', () => {
    expect(safeBox({ top: 150, bottom: 420, right: 170, left: 60 }, 1080, 1920)).toEqual({
      x: 60,
      y: 150,
      width: 850,
      height: 1350,
    });
  });
  it('throws when nothing is left', () => {
    expect(() => safeBox({ top: 1000, bottom: 1000, right: 0, left: 0 }, 1080, 1920)).toThrow();
  });
});
