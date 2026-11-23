import type { DiffEntry } from './diff';
import { wrapTokens } from './fit';
import { tokenizeLine } from './tokenize';
import type { Token } from './tokenize';

/** Padding of the code card on every side (shared with pipeline/qa so checks use the same inner width). */
export const CODE_CARD_PAD = 24;

export type LayoutLine = {
  kind: DiffEntry['kind'];
  rows: Token[][];
  /** Row offset from the top of the code block in the BEFORE view (same, removed). */
  rowBefore?: number;
  /** Row offset in the AFTER view (same, added). */
  rowAfter?: number;
};

export type CodeLayout = {
  lines: LayoutLine[];
  beforeRows: number;
  afterRows: number;
};

/** Compute wrapped rows and row offsets of every diff entry in both the before and after views. */
export const buildLayout = (
  entries: readonly DiffEntry[],
  language: string,
  maxCols: number,
): CodeLayout => {
  let beforeRows = 0;
  let afterRows = 0;
  const lines = entries.map((entry): LayoutLine => {
    const rows = wrapTokens(tokenizeLine(entry.text, language), maxCols);
    const line: LayoutLine = { kind: entry.kind, rows };
    if (entry.kind !== 'added') {
      line.rowBefore = beforeRows;
      beforeRows += rows.length;
    }
    if (entry.kind !== 'removed') {
      line.rowAfter = afterRows;
      afterRows += rows.length;
    }
    return line;
  });
  return { lines, beforeRows, afterRows };
};
