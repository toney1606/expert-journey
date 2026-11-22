import type { Token } from './tokenize';

/** JetBrains Mono advance width as a fraction of the font size. */
export const ADVANCE_EM = 0.6;
export const MAX_FONT_SIZE = 40;
export const MIN_FONT_SIZE = 22;

export type Fit = {
  fontSize: number;
  /** Characters that fit on one visual row at this font size. */
  maxCols: number;
  /** True when even the minimum font size is too big for the longest line, so rows must wrap. */
  wraps: boolean;
};

const codePointLength = (text: string): number => Array.from(text).length;

export const columnsFor = (width: number, fontSize: number): number =>
  Math.max(1, Math.floor(width / (ADVANCE_EM * fontSize)));

/** Largest font size (within bounds) such that the longest line fits in `width`; wraps below the minimum. */
export const fitFontSize = (
  lines: readonly string[],
  width: number,
  bounds: { min?: number; max?: number } = {},
): Fit => {
  const min = bounds.min ?? MIN_FONT_SIZE;
  const max = bounds.max ?? MAX_FONT_SIZE;
  const longest = lines.reduce((acc, line) => Math.max(acc, codePointLength(line)), 1);
  const ideal = Math.floor(width / (ADVANCE_EM * longest));
  const fontSize = Math.min(max, Math.max(min, ideal));
  const maxCols = columnsFor(width, fontSize);
  return { fontSize, maxCols, wraps: longest > maxCols };
};

/** Hard-wrap a tokenized line into rows of at most `maxCols` characters. Always returns at least one row. */
export const wrapTokens = (tokens: readonly Token[], maxCols: number): Token[][] => {
  const cols = Math.max(1, Math.floor(maxCols));
  const rows: Token[][] = [[]];
  let used = 0;
  for (const token of tokens) {
    let rest = Array.from(token.text);
    while (rest.length > 0) {
      if (used >= cols) {
        rows.push([]);
        used = 0;
      }
      const take = rest.slice(0, cols - used);
      rows[rows.length - 1]?.push({ type: token.type, text: take.join('') });
      used += take.length;
      rest = rest.slice(take.length);
    }
  }
  return rows;
};
