import { describe, expect, it } from 'vitest';
import {
  MAX_NAME_SIZE,
  MAX_ROW_SIZE,
  MAX_TITLE_SIZE,
  TITLE_PAD_TOP,
  centeringOffset,
  contentHeight,
  MIN_ROW_SIZE,
  chooseLayout,
  estimateLines,
  type LayoutOption,
} from './layout';

const BOX = { width: 850, height: 1350 };
const short = 'Đọc nhanh hơn rất nhiều';
const long =
  'Mọi truy vấn phải quét toàn bộ bảng nên chậm dần khi dữ liệu tăng lên theo thời gian sử dụng';

const make = (options: number, rows: number, text: string): LayoutOption[] =>
  Array.from({ length: options }, (_, i) => ({
    name: `Phương án ${i + 1}`,
    pros: Array.from({ length: Math.ceil(rows / 2) }, () => text),
    cons: Array.from({ length: Math.floor(rows / 2) }, () => text),
  }));

describe('estimateLines', () => {
  it('is at least 1 and grows with text length', () => {
    expect(estimateLines('', 32, 500)).toBe(1);
    expect(estimateLines('a b', 32, 500)).toBe(1);
    expect(estimateLines(long, 32, 500)).toBeGreaterThan(estimateLines(short, 32, 500));
  });
  it('breaks overlong words', () => {
    expect(estimateLines('x'.repeat(200), 32, 300)).toBeGreaterThan(1);
  });
});

describe('chooseLayout', () => {
  it('uses maximum sizes for the sample-like 2 option case', () => {
    const l = chooseLayout('Có index hay không?', make(2, 2, short), BOX);
    expect(l.fits).toBe(true);
    expect(l.rowSize).toBe(MAX_ROW_SIZE);
    expect(l.nameSize).toBeGreaterThanOrEqual(48);
    expect(l.nameSize).toBeLessThanOrEqual(56);
  });

  it.each([
    [3, 3],
    [4, 3],
    [2, 5],
  ])('fits %i options with %i rows of short text', (options, rows) => {
    const l = chooseLayout('Tiêu đề', make(options, rows, short), BOX);
    expect(l.fits).toBe(true);
    expect(l.height).toBeLessThanOrEqual(BOX.height);
  });

  it('shrinks as content grows but never below the minimum', () => {
    const small = chooseLayout('T', make(2, 2, short), BOX);
    const big = chooseLayout('T', make(3, 5, short), BOX);
    expect(big.rowSize).toBeLessThan(small.rowSize);
    expect(big.rowSize).toBeGreaterThanOrEqual(MIN_ROW_SIZE);
  });

  it('reports fits=false (and minimum sizes) when nothing can fit', () => {
    const l = chooseLayout('T', make(4, 5, long), BOX);
    expect(l.fits).toBe(false);
    expect(l.rowSize).toBe(MIN_ROW_SIZE);
    expect(l.height).toBeGreaterThan(BOX.height);
  });
});

describe('centering and growth', () => {
  it('centres title + cards when there is spare height', () => {
    const l = chooseLayout('Có index hay không?', make(2, 2, short), BOX);
    expect(l.top).toBeGreaterThan(100);
    // Equal room above the title and below the last card.
    const below = BOX.height - (l.top + l.height - TITLE_PAD_TOP);
    expect(Math.abs(below - l.top)).toBeLessThanOrEqual(1);
  });

  it('keeps top alignment when full or not fitting', () => {
    const heavy = chooseLayout('T', make(3, 5, short), BOX);
    expect(heavy.top).toBeLessThan(TITLE_PAD_TOP + BOX.height * 0.03);
    const overflow = chooseLayout('T', make(4, 5, long), BOX);
    expect(overflow.fits).toBe(false);
    expect(overflow.top).toBe(TITLE_PAD_TOP);
  });

  it('centeringOffset is half the spare and never below the title padding', () => {
    expect(centeringOffset(1000, 600 + TITLE_PAD_TOP)).toBe(200);
    expect(centeringOffset(1000, 1001)).toBe(TITLE_PAD_TOP);
  });

  it('never exceeds maximum sizes and grows name/title when there is room', () => {
    const l = chooseLayout('T', make(3, 3, short), BOX);
    expect(l.rowSize).toBeLessThanOrEqual(MAX_ROW_SIZE);
    expect(l.nameSize).toBeLessThanOrEqual(MAX_NAME_SIZE);
    expect(l.titleSize).toBeLessThanOrEqual(MAX_TITLE_SIZE);
    const base = contentHeight('T', make(3, 3, short), BOX.width, l);
    expect(base).toBe(l.height);
  });
});
