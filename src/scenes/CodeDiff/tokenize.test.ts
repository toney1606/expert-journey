import { describe, expect, it } from 'vitest';
import { tokenizeLine } from './tokenize';

const join = (line: string, lang: string): string =>
  tokenizeLine(line, lang)
    .map((t) => t.text)
    .join('');

describe('tokenizeLine', () => {
  it('classifies TS tokens', () => {
    const tokens = tokenizeLine('const x = "hi" + 42; // note', 'typescript');
    expect(tokens.find((t) => t.text === 'const')?.type).toBe('keyword');
    expect(tokens.find((t) => t.text === 'x')?.type).toBe('identifier');
    expect(tokens.find((t) => t.text === '"hi"')?.type).toBe('string');
    expect(tokens.find((t) => t.text === '42')?.type).toBe('number');
    expect(tokens.find((t) => t.text === '// note')?.type).toBe('comment');
    expect(tokens.find((t) => t.text === 'User')).toBeUndefined();
    expect(tokenizeLine('u: User', 'ts').find((t) => t.text === 'User')?.type).toBe('type');
  });

  it('keeps text intact for odd input', () => {
    const samples = [
      '',
      '  indent',
      "'unterminated",
      '`tpl \\` x',
      '/* open',
      '// bình luận tiếng Việt',
      'a => b?.c ?? d',
      '😀 = 1',
    ];
    for (const s of samples) {
      expect(join(s, 'typescript')).toBe(s);
    }
  });

  it('falls back to plain tokens for unknown languages', () => {
    expect(tokenizeLine('SELECT * FROM x', 'cobol')).toEqual([
      { type: 'plain', text: 'SELECT * FROM x' },
    ]);
    expect(tokenizeLine('', 'cobol')).toEqual([]);
  });

  it('supports python comments', () => {
    expect(tokenizeLine('x = 1  # hi', 'python').at(-1)).toEqual({ type: 'comment', text: '# hi' });
  });
});
