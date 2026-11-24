export type TokenType =
  'keyword' | 'string' | 'comment' | 'number' | 'punctuation' | 'identifier' | 'type' | 'plain';

export type Token = { type: TokenType; text: string };

const JS_KEYWORDS = new Set([
  'abstract',
  'as',
  'async',
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'declare',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'from',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'new',
  'null',
  'of',
  'private',
  'protected',
  'public',
  'readonly',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'type',
  'typeof',
  'undefined',
  'var',
  'void',
  'while',
  'yield',
]);

const PY_KEYWORDS = new Set([
  'and',
  'as',
  'async',
  'await',
  'class',
  'def',
  'elif',
  'else',
  'except',
  'False',
  'finally',
  'for',
  'from',
  'if',
  'import',
  'in',
  'is',
  'lambda',
  'None',
  'not',
  'or',
  'pass',
  'raise',
  'return',
  'True',
  'try',
  'while',
  'with',
  'yield',
]);

const SQL_KEYWORDS = new Set([
  'SELECT',
  'select',
  'FROM',
  'from',
  'WHERE',
  'where',
  'ORDER',
  'order',
  'BY',
  'by',
  'LIMIT',
  'limit',
  'OFFSET',
  'offset',
  'CREATE',
  'create',
  'INDEX',
  'index',
  'UNIQUE',
  'unique',
  'ON',
  'on',
  'AND',
  'and',
  'OR',
  'or',
  'NOT',
  'not',
  'NULL',
  'null',
  'INSERT',
  'insert',
  'INTO',
  'into',
  'VALUES',
  'values',
  'UPDATE',
  'update',
  'SET',
  'set',
  'DELETE',
  'delete',
  'JOIN',
  'join',
  'LEFT',
  'left',
  'INNER',
  'inner',
  'AS',
  'as',
  'DESC',
  'desc',
  'ASC',
  'asc',
  'EXPLAIN',
  'explain',
  'ANALYZE',
  'analyze',
  'IN',
  'in',
  'LIKE',
  'like',
  'USING',
  'using',
  'TABLE',
  'table',
  'DROP',
  'drop',
  'ALTER',
  'alter',
  'ADD',
  'add',
  'COUNT',
  'count',
  'GROUP',
  'group',
  'HAVING',
  'having',
  'DISTINCT',
  'distinct',
  'INCLUDE',
  'include',
]);

type LanguageSpec = { keywords: ReadonlySet<string>; lineComment: string };

const JS_LIKE: LanguageSpec = { keywords: JS_KEYWORDS, lineComment: '//' };
const LANGUAGES: Record<string, LanguageSpec> = {
  typescript: JS_LIKE,
  ts: JS_LIKE,
  tsx: JS_LIKE,
  javascript: JS_LIKE,
  js: JS_LIKE,
  jsx: JS_LIKE,
  sql: { keywords: SQL_KEYWORDS, lineComment: '--' },
  python: { keywords: PY_KEYWORDS, lineComment: '#' },
  py: { keywords: PY_KEYWORDS, lineComment: '#' },
};

export const isSupportedLanguage = (language: string): boolean =>
  Object.prototype.hasOwnProperty.call(LANGUAGES, language.trim().toLowerCase());

const isIdentStart = (ch: string): boolean => /[\p{L}_$]/u.test(ch);
const isIdentPart = (ch: string): boolean => /[\p{L}\p{N}_$]/u.test(ch);
const isDigit = (ch: string): boolean => ch >= '0' && ch <= '9';

const push = (tokens: Token[], type: TokenType, text: string): void => {
  if (text === '') {
    return;
  }
  const last = tokens[tokens.length - 1];
  if (last && last.type === type && (type === 'plain' || type === 'punctuation')) {
    last.text += text;
  } else {
    tokens.push({ type, text });
  }
};

/**
 * Tokenize ONE line of code. Pure, never throws; the concatenation of token texts always equals the
 * input line. Multi-line constructs (block comments, template literals) are not tracked across lines.
 */
export const tokenizeLine = (line: string, language: string): Token[] => {
  const spec = LANGUAGES[language.trim().toLowerCase()] as LanguageSpec | undefined;
  if (!spec) {
    return line === '' ? [] : [{ type: 'plain', text: line }];
  }
  const tokens: Token[] = [];
  const chars = Array.from(line);
  let i = 0;
  while (i < chars.length) {
    const ch = chars[i] ?? '';
    const rest = chars.slice(i, i + spec.lineComment.length).join('');

    if (rest === spec.lineComment) {
      push(tokens, 'comment', chars.slice(i).join(''));
      break;
    }
    if (spec.lineComment === '//' && ch === '/' && chars[i + 1] === '*') {
      let end = i + 2;
      while (end < chars.length && !(chars[end] === '*' && chars[end + 1] === '/')) {
        end += 1;
      }
      end = Math.min(chars.length, end + 2);
      push(tokens, 'comment', chars.slice(i, end).join(''));
      i = end;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      let end = i + 1;
      while (end < chars.length && chars[end] !== ch) {
        end += chars[end] === '\\' ? 2 : 1;
      }
      end = Math.min(chars.length, end + 1);
      push(tokens, 'string', chars.slice(i, end).join(''));
      i = end;
      continue;
    }
    if (isDigit(ch)) {
      let end = i + 1;
      while (end < chars.length && /[\w.]/.test(chars[end] ?? '')) {
        end += 1;
      }
      push(tokens, 'number', chars.slice(i, end).join(''));
      i = end;
      continue;
    }
    if (isIdentStart(ch)) {
      let end = i + 1;
      while (end < chars.length && isIdentPart(chars[end] ?? '')) {
        end += 1;
      }
      const word = chars.slice(i, end).join('');
      const type: TokenType = spec.keywords.has(word)
        ? 'keyword'
        : /^\p{Lu}/u.test(word)
          ? 'type'
          : 'identifier';
      push(tokens, type, word);
      i = end;
      continue;
    }
    if (/\s/.test(ch)) {
      push(tokens, 'plain', ch);
    } else {
      push(tokens, 'punctuation', ch);
    }
    i += 1;
  }
  return tokens;
};

/** Convenience: tokenize a list of lines. */
export const tokenizeLines = (lines: readonly string[], language: string): Token[][] =>
  lines.map((line) => tokenizeLine(line, language));
