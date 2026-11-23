import { CONTENT_BOX } from '../../design/tokens';
import { describe, expect, it } from 'vitest';
import { wrapRows } from './wrap';
import {
  applyCues,
  buildTimeline,
  columnsFor,
  cursorVisible,
  pickFontSize,
  rowsAtFrame,
  scrollOffset,
  smoothedRows,
  commandRows,
  typedRowCount,
  totalRows,
  visibleChars,
  wrappedRows,
} from './timeline';

const sample = [
  { command: "EXPLAIN SELECT * FROM users WHERE email = 'a@b.com';", output: 'Seq Scan on users' },
  { command: 'CREATE INDEX idx ON users(email);', output: 'CREATE INDEX' },
];

/** Terminal body area inside CONTENT_BOX (24px padding, 56px header). */
const W = CONTENT_BOX.width - 48;
const H = CONTENT_BOX.height - 56 - 48;

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
  it('picks 40 for little content and 24 for lots', () => {
    expect(pickFontSize([{ command: 'ls' }], W, H)).toBe(40);
    const many = Array.from({ length: 12 }, () => ({
      command: 'z'.repeat(100),
      output: 'o'.repeat(200),
    }));
    expect(pickFontSize(many, W, H)).toBe(24);
  });
  it('chosen size fits the height when possible', () => {
    const size = pickFontSize(sample, W, 400);
    expect(size).toBeGreaterThanOrEqual(24);
    expect(size).toBeLessThanOrEqual(40);
    if (size > 24) {
      expect(totalRows(sample, columnsFor(W, size)) * size * 1.45).toBeLessThanOrEqual(400);
    }
  });
  it('rows grow over time and scroll is never negative', () => {
    const tl = buildTimeline(sample, 240, 30);
    const cols = columnsFor(W, 32);
    expect(rowsAtFrame(0, sample, tl, cols)).toBe(1);
    expect(rowsAtFrame(239, sample, tl, cols)).toBe(totalRows(sample, cols));
    expect(scrollOffset(2, 40, 500)).toBe(0);
    expect(scrollOffset(20, 40, 500)).toBe(300);
  });
});

const texts = (text: string, cols: number): string[] => wrapRows(text, cols).map((r) => r.text);

describe('wrapRows', () => {
  it('breaks at spaces without splitting words', () => {
    expect(texts('SELECT * FROM users WHERE id = 1', 14)).toEqual([
      'SELECT * FROM',
      'users WHERE id',
      '= 1',
    ]);
  });
  it('hard-breaks only tokens longer than a row', () => {
    expect(texts('abcdefghij', 4)).toEqual(['abcd', 'efgh', 'ij']);
    expect(texts('ab abcdefghij', 4)).toEqual(['ab', 'abcd', 'efgh', 'ij']);
    for (const row of texts('x'.repeat(95), 20))
      expect(Array.from(row).length).toBeLessThanOrEqual(20);
  });
  it('breaks after punctuation but keeps numbers whole', () => {
    expect(texts('users.email,idx_name;done', 13)).toEqual(['users.email,', 'idx_name;done']);
    expect(texts('path/to/file/name', 9)).toEqual(['path/to/', 'file/name']);
    expect(texts('cost 0.00..1834.00 rows', 14)).toEqual(['cost', '0.00..1834.00', 'rows']);
    expect(texts('total 1,000,000 ok', 10).join('|')).toContain('1,000,000');
  });
  it('handles Vietnamese text', () => {
    const rows = texts('Tại sao truy vấn chậm khi không có chỉ mục', 16);
    expect(rows).toEqual(['Tại sao truy vấn', 'chậm khi không', 'có chỉ mục']);
  });
  it('keeps empty lines and newlines', () => {
    expect(texts('', 10)).toEqual(['']);
    expect(texts('a\n\nb', 10)).toEqual(['a', '', 'b']);
  });
  it('fits exactly at the boundary', () => {
    expect(texts('abcd efgh', 9)).toEqual(['abcd efgh']);
    expect(texts('abcd efgh', 8)).toEqual(['abcd', 'efgh']);
    expect(texts('abcd', 4)).toEqual(['abcd']);
  });
  it('keeps leading indentation of output', () => {
    expect(texts('  -> Seq Scan', 20)).toEqual(['  -> Seq Scan']);
  });
  it('records source offsets', () => {
    const rows = wrapRows('ab cd ef', 5);
    expect(rows).toEqual([
      { text: 'ab cd', start: 0 },
      { text: 'ef', start: 6 },
    ]);
  });
});

describe('typed rows and smoothing', () => {
  it('reveals command rows progressively', () => {
    const rows = commandRows('aaaa bbbb cccc dddd', 2 + 1 + 9);
    expect(rows.length).toBeGreaterThan(1);
    expect(typedRowCount(rows, 0)).toBe(1);
    expect(typedRowCount(rows, 5)).toBe(1);
    expect(typedRowCount(rows, 10)).toBe(1);
    expect(typedRowCount(rows, 11)).toBe(2);
    expect(typedRowCount(rows, 19)).toBe(rows.length);
  });
  it('smoothed rows converge to the target and never overshoot', () => {
    const tl = buildTimeline(sample, 240, 30);
    const cols = columnsFor(W, 32);
    let prev = 0;
    for (let f = 0; f < 240; f += 1) {
      const v = smoothedRows(f, sample, tl, cols, 30);
      const target = rowsAtFrame(f, sample, tl, cols);
      expect(v).toBeLessThanOrEqual(target + 1e-6);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-6);
      prev = v;
    }
    expect(smoothedRows(239, sample, tl, cols, 30)).toBeCloseTo(totalRows(sample, cols), 5);
  });
});

describe('applyCues (terminal)', () => {
  const lines = [
    { command: 'EXPLAIN SELECT 1', output: 'Seq Scan' },
    { command: 'CREATE INDEX i ON t(a)', output: 'CREATE INDEX' },
    { command: 'EXPLAIN SELECT 2', output: 'Index Scan' },
  ];
  const base = buildTimeline(lines, 450, 30);

  it('is unchanged without cues', () => {
    expect(applyCues(base, [undefined, undefined, undefined], 450)).toEqual(base);
  });

  it('starts typing at the spoken frame and shows output after typing', () => {
    const t = applyCues(base, [undefined, 200, undefined], 450);
    expect(t[1]?.typeStart).toBe(200);
    expect(t[1]?.typeEnd).toBeGreaterThan(200);
    expect(t[1]?.outputStart).toBeGreaterThan(t[1]?.typeEnd ?? 0);
    expect((t[1]?.typeEnd ?? 0) - 200).toBe((base[1]?.typeEnd ?? 0) - (base[1]?.typeStart ?? 0));
  });

  it('keeps lines in order and outputs before the next command', () => {
    const t = applyCues(base, [100, 102, 103], 450);
    for (let i = 0; i < t.length; i += 1) {
      const cur = t[i];
      const next = t[i + 1];
      expect(cur?.typeEnd).toBeGreaterThan(cur?.typeStart ?? 0);
      expect(cur?.outputStart).toBeGreaterThan(cur?.typeEnd ?? 0);
      if (next) expect(next.typeStart).toBeGreaterThan(cur?.outputStart ?? 0);
    }
  });

  it('leaves room for the last line to finish typing', () => {
    const t = applyCues(base, [undefined, undefined, 449], 450);
    expect(t[2]?.outputStart).toBeLessThanOrEqual(450);
  });
});
