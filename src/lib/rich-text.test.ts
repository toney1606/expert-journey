import { describe, expect, it } from 'vitest';
import { parseRichText, stripMarkup } from './rich-text';

describe('parseRichText', () => {
  it('returns nothing for empty text', () => {
    expect(parseRichText('')).toEqual([]);
  });

  it('keeps plain text as one segment', () => {
    expect(parseRichText('hello')).toEqual([{ text: 'hello' }]);
  });

  it('parses a coloured span', () => {
    expect(parseRichText('Index {accent|nhanh} hơn')).toEqual([
      { text: 'Index ' },
      { text: 'nhanh', color: 'accent' },
      { text: ' hơn' },
    ]);
  });

  it('supports all colour names', () => {
    for (const name of ['accent', 'wrong', 'correct', 'diagram'] as const) {
      expect(parseRichText(`{${name}|x}`)).toEqual([{ text: 'x', color: name }]);
    }
  });

  it('handles Vietnamese diacritics', () => {
    expect(parseRichText('Tại sao {wrong|chậm}? {correct|Nhanh ệ ữ}')).toEqual([
      { text: 'Tại sao ' },
      { text: 'chậm', color: 'wrong' },
      { text: '? ' },
      { text: 'Nhanh ệ ữ', color: 'correct' },
    ]);
  });

  it('keeps adjacent tags separate when colours differ and merges equal ones', () => {
    expect(parseRichText('{wrong|a}{correct|b}')).toEqual([
      { text: 'a', color: 'wrong' },
      { text: 'b', color: 'correct' },
    ]);
    expect(parseRichText('{wrong|a}{wrong|b}')).toEqual([{ text: 'ab', color: 'wrong' }]);
  });

  it('treats unknown colour as plain text', () => {
    expect(parseRichText('a {pink|b} c')).toEqual([{ text: 'a b c' }]);
  });

  it('unescapes \\{ and \\}', () => {
    expect(parseRichText('\\{accent|x}')).toEqual([{ text: '{accent|x}' }]);
    expect(parseRichText('{accent|a \\} b}')).toEqual([{ text: 'a } b', color: 'accent' }]);
  });

  it('treats unbalanced braces as plain text', () => {
    expect(parseRichText('{accent|abc')).toEqual([{ text: '{accent|abc' }]);
    expect(parseRichText('abc}')).toEqual([{ text: 'abc}' }]);
    expect(parseRichText('{ no tag }')).toEqual([{ text: '{ no tag }' }]);
    expect(parseRichText('{')).toEqual([{ text: '{' }]);
  });

  it('handles nested tags and braces inside a span', () => {
    expect(parseRichText('{accent|a {wrong|b} c}')).toEqual([
      { text: 'a ', color: 'accent' },
      { text: 'b', color: 'wrong' },
      { text: ' c', color: 'accent' },
    ]);
    expect(parseRichText('{diagram|obj = {a: 1}}')).toEqual([
      { text: 'obj = {a: 1}', color: 'diagram' },
    ]);
  });

  it('handles an empty span', () => {
    expect(parseRichText('a{accent|}b')).toEqual([{ text: 'ab' }]);
  });
});

describe('stripMarkup', () => {
  it('removes markup', () => {
    expect(stripMarkup('Index {accent|nhanh} hơn {wrong|Full Scan}')).toBe(
      'Index nhanh hơn Full Scan',
    );
  });

  it('is identity for plain text', () => {
    expect(stripMarkup('plain')).toBe('plain');
  });
});
