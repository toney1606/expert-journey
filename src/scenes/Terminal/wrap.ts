/** One explicit display row. `start` is the code-point offset of its first char in the source text. */
export type WrapRow = { text: string; start: number };

type Token = { text: string[]; start: number; space: boolean };

const isSpace = (c: string): boolean => c === ' ' || c === '\t';
const isDigit = (c: string | undefined): boolean => c !== undefined && /\p{Nd}/u.test(c);
const isLetter = (c: string | undefined): boolean => c !== undefined && /\p{L}/u.test(c);

/** True when a row may end right after chars[index] (the next char is non-space). */
const breaksAfter = (chars: readonly string[], index: number): boolean => {
  const c = chars[index];
  const prev = chars[index - 1];
  const next = chars[index + 1];
  if (c === undefined || next === undefined || isSpace(next)) return false;
  if (',;)]/|'.includes(c)) return !(isDigit(prev) && isDigit(next));
  if ('.:-'.includes(c)) return isLetter(prev) && isLetter(next);
  return false;
};

const tokenize = (chars: readonly string[], offset: number): Token[] => {
  const tokens: Token[] = [];
  let i = 0;
  while (i < chars.length) {
    const first = chars[i] ?? '';
    const start = i;
    if (isSpace(first)) {
      while (i < chars.length && isSpace(chars[i] ?? '')) i += 1;
      tokens.push({ text: chars.slice(start, i), start: offset + start, space: true });
      continue;
    }
    while (i < chars.length && !isSpace(chars[i] ?? '')) {
      i += 1;
      if (breaksAfter(chars, i - 1)) break;
    }
    tokens.push({ text: chars.slice(start, i), start: offset + start, space: false });
  }
  return tokens;
};

const wrapParagraph = (chars: readonly string[], offset: number, cols: number): WrapRow[] => {
  const rows: WrapRow[] = [];
  let cur: string[] = [];
  let curStart = offset;
  const flush = (): void => {
    rows.push({ text: cur.join('').trimEnd(), start: curStart });
    cur = [];
  };
  for (const token of tokenize(chars, offset)) {
    const len = token.text.length;
    if (cur.length + len <= cols) {
      if (cur.length === 0) curStart = token.start;
      cur.push(...token.text);
    } else if (token.space) {
      // Spaces at a wrap point are dropped.
      if (cur.length > 0) flush();
    } else {
      if (cur.join('').trim() === '') cur = [];
      else flush();
      let from = 0;
      curStart = token.start;
      while (len - from > cols) {
        rows.push({
          text: token.text.slice(from, from + cols).join(''),
          start: token.start + from,
        });
        from += cols;
      }
      curStart = token.start + from;
      cur = token.text.slice(from);
    }
  }
  if (cur.length > 0 || rows.length === 0) flush();
  return rows;
};

/**
 * Greedy word-aware wrap into rows of at most `cols` code points. Rows break at spaces and after
 * , ; ) ] / | (and . : - between letters); only tokens longer than a full row are hard-broken.
 * Newlines start new rows; an empty line is one empty row. Input should be NFC-normalised.
 */
export const wrapRows = (text: string, cols: number): WrapRow[] => {
  const width = Math.max(1, Math.floor(cols));
  const rows: WrapRow[] = [];
  let offset = 0;
  for (const paragraph of text.split('\n')) {
    const chars = Array.from(paragraph);
    rows.push(...wrapParagraph(chars, offset, width));
    offset += chars.length + 1;
  }
  return rows;
};
