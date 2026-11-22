export type DiffKind = 'same' | 'removed' | 'added';

export type DiffEntry = {
  kind: DiffKind;
  text: string;
  /** Index of the line in the BEFORE text (same, removed). */
  beforeIndex?: number;
  /** Index of the line in the AFTER text (same, added). */
  afterIndex?: number;
};

/** Split on any newline flavour; a trailing newline does not create an extra empty line. */
export const splitLines = (code: string): string[] => {
  const lines = code.replace(/\r\n?/g, '\n').split('\n');
  if (lines.length > 1 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  return lines;
};

/**
 * Line diff based on the longest common subsequence.
 * Within a changed block, removed lines come before added lines.
 */
export const diffLines = (before: readonly string[], after: readonly string[]): DiffEntry[] => {
  const n = before.length;
  const m = after.length;
  // lcs[i][j] = LCS length of before[i..] and after[j..]
  const width = m + 1;
  const lcs = new Array<number>((n + 1) * width).fill(0);
  const at = (a: number, b: number): number => lcs[a * width + b] ?? 0;
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      lcs[i * width + j] =
        before[i] === after[j] ? at(i + 1, j + 1) + 1 : Math.max(at(i + 1, j), at(i, j + 1));
    }
  }

  const entries: DiffEntry[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && before[i] === after[j]) {
      entries.push({ kind: 'same', text: before[i] ?? '', beforeIndex: i, afterIndex: j });
      i += 1;
      j += 1;
    } else if (i < n && (j >= m || at(i + 1, j) >= at(i, j + 1))) {
      entries.push({ kind: 'removed', text: before[i] ?? '', beforeIndex: i });
      i += 1;
    } else {
      entries.push({ kind: 'added', text: after[j] ?? '', afterIndex: j });
      j += 1;
    }
  }
  return entries;
};
