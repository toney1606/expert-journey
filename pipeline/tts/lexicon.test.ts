import { describe, expect, it } from 'vitest';
import { regroupTimings, respell } from './lexicon';

describe('respell', () => {
  it('respells English terms and keeps punctuation', () => {
    const { spoken, groups } = respell('Chạy EXPLAIN ANALYZE, rồi query.');
    expect(spoken).toBe('Chạy ếch xờ plên a na lai, rồi quơ ri.');
    expect(groups.map((g) => g.source)).toEqual(['Chạy', 'EXPLAIN ANALYZE,', 'rồi', 'query.']);
    expect(groups.map((g) => g.spokenCount)).toEqual([1, 6, 1, 2]);
  });

  it('prefers the longest phrase and leaves unknown words alone', () => {
    expect(respell('dòng Rows Removed by Filter nhé').spoken).toBe(
      'dòng rô rì múp bai phin tơ nhé',
    );
    expect(respell('không có gì').spoken).toBe('không có gì');
  });

  it('handles tokens with symbols', () => {
    expect(respell('B+Tree, mặc định').spoken).toBe('bi tri, mặc định');
  });
});

describe('regroupTimings', () => {
  it('maps spoken timings back to displayed words and sentences', () => {
    const { groups } = respell('Chạy query. Xong.');
    const raw = [
      { start: 0, end: 0.3, text: 'Chạy' },
      { start: 0.3, end: 0.5, text: 'quơ' },
      { start: 0.5, end: 0.8, text: 'ri' },
      { start: 1, end: 1.4, text: 'Xong' },
    ];
    const result = regroupTimings(groups, raw);
    expect(result?.words).toEqual([
      { start: 0, end: 0.3, text: 'Chạy' },
      { start: 0.3, end: 0.8, text: 'query.' },
      { start: 1, end: 1.4, text: 'Xong.' },
    ]);
    expect(result?.cues.map((c) => c.text)).toEqual(['Chạy query.', 'Xong.']);
  });

  it('returns undefined when counts differ', () => {
    expect(
      regroupTimings(respell('a b').groups, [{ start: 0, end: 1, text: 'a' }]),
    ).toBeUndefined();
  });
});
