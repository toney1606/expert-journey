import { describe, expect, it } from 'vitest';
import { diffLines, splitLines } from './diff';

describe('splitLines', () => {
  it('handles CRLF and a trailing newline', () => {
    expect(splitLines('a\r\nb\n')).toEqual(['a', 'b']);
    expect(splitLines('x')).toEqual(['x']);
  });
});

describe('diffLines', () => {
  it('marks identical input as all same', () => {
    const d = diffLines(['a', 'b'], ['a', 'b']);
    expect(d.map((e) => e.kind)).toEqual(['same', 'same']);
    expect(d[1]).toEqual({ kind: 'same', text: 'b', beforeIndex: 1, afterIndex: 1 });
  });

  it('detects removed, added and kept lines in order', () => {
    const d = diffLines(['a', 'b', 'c'], ['a', 'x', 'c', 'd']);
    expect(d).toEqual([
      { kind: 'same', text: 'a', beforeIndex: 0, afterIndex: 0 },
      { kind: 'removed', text: 'b', beforeIndex: 1 },
      { kind: 'added', text: 'x', afterIndex: 1 },
      { kind: 'same', text: 'c', beforeIndex: 2, afterIndex: 2 },
      { kind: 'added', text: 'd', afterIndex: 3 },
    ]);
  });

  it('handles empty sides', () => {
    expect(diffLines([], ['a'])).toEqual([{ kind: 'added', text: 'a', afterIndex: 0 }]);
    expect(diffLines(['a'], [])).toEqual([{ kind: 'removed', text: 'a', beforeIndex: 0 }]);
    expect(diffLines([], [])).toEqual([]);
  });

  it('reconstructs both sides', () => {
    const before = ['1', '2', '3', '4', '2'];
    const after = ['2', '3', '5', '4'];
    const d = diffLines(before, after);
    expect(d.filter((e) => e.kind !== 'added').map((e) => e.text)).toEqual(before);
    expect(d.filter((e) => e.kind !== 'removed').map((e) => e.text)).toEqual(after);
  });
});
