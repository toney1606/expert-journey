import { describe, expect, it } from 'vitest';
import { findPhraseTime, normalizeToken } from './spoken';

const words = [
  { start: 0.1, end: 0.4, text: 'Một' },
  { start: 0.4, end: 0.9, text: 'triệu,' },
  { start: 0.9, end: 1.2, text: 'dòng' },
  { start: 2.0, end: 2.3, text: 'Đọc' },
  { start: 2.3, end: 2.6, text: 'từng' },
  { start: 2.6, end: 3.0, text: 'dòng.' },
];

describe('normalizeToken', () => {
  it('lowercases, drops diacritics and punctuation', () => {
    expect(normalizeToken('Đọc,')).toBe('doc');
    expect(normalizeToken('triệu.')).toBe('trieu');
  });
});

describe('findPhraseTime', () => {
  it('finds a single word ignoring accents and case', () => {
    expect(findPhraseTime(words, 'TRIEU')).toEqual({ start: 0.4, end: 0.9 });
  });
  it('finds a multi-word phrase and returns the time of its first word', () => {
    expect(findPhraseTime(words, 'đọc từng dòng')).toEqual({ start: 2.0, end: 2.3 });
  });
  it('requires the words to be consecutive', () => {
    expect(findPhraseTime(words, 'một dòng')).toBeUndefined();
  });
  it('can search after a given time (second occurrence)', () => {
    expect(findPhraseTime(words, 'dòng')).toEqual({ start: 0.9, end: 1.2 });
    expect(findPhraseTime(words, 'dòng', 1.5)).toEqual({ start: 2.6, end: 3.0 });
  });
  it('returns undefined for empty input or unknown phrases', () => {
    expect(findPhraseTime([], 'x')).toBeUndefined();
    expect(findPhraseTime(words, '   ')).toBeUndefined();
    expect(findPhraseTime(words, 'index')).toBeUndefined();
  });
  it('handles unsorted input', () => {
    expect(findPhraseTime([...words].reverse(), 'đọc từng dòng')).toEqual({ start: 2.0, end: 2.3 });
  });
});
