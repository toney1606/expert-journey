import { formatNumber } from '../../scenes/Stat/format';

export { formatNumber };

/** Replace the "…" placeholder of the "Rows Removed by Filter" line with the measured number (dots: 4.812.309). */
export const fillRowsRemoved = (explainCode: string, rowsRemoved: number): string =>
  explainCode
    .split('\n')
    .map((line) =>
      /Rows Removed/i.test(line) ? line.replace('…', formatNumber(rowsRemoved)) : line,
    )
    .join('\n');

/** 0-based index of the "Rows Removed by Filter" line (-1 when missing). */
export const rowsRemovedLine = (explainCode: string): number =>
  explainCode.split('\n').findIndex((line) => /Rows Removed/i.test(line));

/** Break lines longer than `maxChars` at their last space (so identifiers are not cut in the middle). */
export const wrapCode = (code: string, maxChars: number): string =>
  code
    .split('\n')
    .flatMap((line) => {
      const out: string[] = [];
      let rest = line;
      while (rest.length > maxChars) {
        const cut = rest.lastIndexOf(' ', maxChars);
        if (cut <= 0) break;
        out.push(rest.slice(0, cut));
        rest = rest.slice(cut + 1);
      }
      out.push(rest);
      return out;
    })
    .join('\n');
