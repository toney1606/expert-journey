import { describe, expect, it } from 'vitest';
import {
  buildTimeline,
  columnsFor,
  cursorVisible,
  pickFontSize,
  rowsAtFrame,
  scrollOffset,
  totalRows,
  visibleChars,
  wrappedRows,
} from './timeline';

const sample = [
  { command: "EXPLAIN SELECT * FROM users WHERE email = 'a@b.com';", output: 'Seq Scan on users' },
  { command: 'CREATE INDEX idx ON users(email);', output: 'CREATE INDEX' },
];

describe('buildTimeline', () => {
  it('is ordered and ends within 85% of the scene', () => {
    const tl = buildTimeline(sample, 240, 30);
    expect(tl).toHaveLength(2);
    for (const [i, t] of tl.entries()) {
      expect(t.typeEnd).toBeGreaterThan(t.typeStart);
      expect(t.outputStart).toBeGreaterThan(t.typeEnd);
      if (i > 0) expect(t.typeStart).toBeGreaterThan(tl[i - 1]?.outputStart ?? 0);
    }
    expect(tl[1]?.outputStart ?? 999).toBeLessThanOrEqual(Math.floor(240 * 0.85));
  });

  it('types longer commands for longer', () => {
    const tl = buildTimeline([{ command: 'ls' }, { command: 'x'.repeat(40) }], 600, 30);
    const a = (tl[0]?.typeEnd ?? 0) - (tl[0]?.typeStart ?? 0);
    const b = (tl[1]?.typeEnd ?? 0) - (tl[1]?.typeStart ?? 0);
    expect(b).toBeGreaterThan(a);
  });

  it('still fits a very short scene with many long commands', () => {
    const lines = Array.from({ length: 8 }, () => ({ command: 'y'.repeat(120), output: 'ok' }));
    const tl = buildTimeline(lines, 150, 30);
    expect(tl[7]?.outputStart ?? 999).toBeLessThanOrEqual(Math.floor(150 * 0.85) + 8);
  });
});

describe('visibleChars / cursorVisible', () => {
  const tl = { typeStart: 10, typeEnd: 30, outputStart: 40 };
  it('is 0 before, full after, monotonic in between', () => {
    expect(visibleChars(0, tl, 20)).toBe(0);
    expect(visibleChars(30, tl, 20)).toBe(20);
    expect(visibleChars(500, tl, 20)).toBe(20);
    let prev = 0;
    for (let f = 10; f <= 30; f += 1) {
      const v = visibleChars(f, tl, 20);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
  it('blinks', () => {
    expect(cursorVisible(0, 30)).toBe(true);
    expect(cursorVisible(15, 30)).toBe(false);
    expect(cursorVisible(30, 30)).toBe(true);
  });
});

describe('layout helpers', () => {
  it('counts wrapped rows', () => {
    expect(wrappedRows('', 10)).toBe(1);
    expect(wrappedRows('a'.repeat(25), 10)).toBe(3);
    expect(wrappedRows('ab\ncd', 10)).toBe(2);
  });
  it('picks 40 for little content and 28 for lots', () => {
    expect(pickFontSize([{ command: 'ls' }], 786, 1100)).toBe(40);
    const many = Array.from({ length: 12 }, () => ({
      command: 'z'.repeat(100),
      output: 'o'.repeat(200),
    }));
    expect(pickFontSize(many, 786, 1100)).toBe(28);
  });
  it('chosen size fits the height when possible', () => {
    const size = pickFontSize(sample, 786, 400);
    expect(size).toBeGreaterThanOrEqual(28);
    expect(size).toBeLessThanOrEqual(40);
    if (size > 28) {
      expect(totalRows(sample, columnsFor(786, size)) * size * 1.45).toBeLessThanOrEqual(400);
    }
  });
  it('rows grow over time and scroll is never negative', () => {
    const tl = buildTimeline(sample, 240, 30);
    const cols = columnsFor(786, 32);
    expect(rowsAtFrame(0, sample, tl, cols)).toBe(1);
    expect(rowsAtFrame(239, sample, tl, cols)).toBe(totalRows(sample, cols));
    expect(scrollOffset(2, 40, 500)).toBe(0);
    expect(scrollOffset(20, 40, 500)).toBe(300);
  });
});
