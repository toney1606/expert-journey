import { CONTENT_BOX } from '../../design/tokens';
import { stripMarkup } from '../../lib/rich-text';

export const CALLOUT_BOX = CONTENT_BOX;

export type CalloutLayout = {
  statementFontSize: number;
  statementLineHeight: number;
  explanationFontSize: number;
  explanationLineHeight: number;
  /** Estimated number of statement lines at the chosen size. */
  statementLines: number;
  /** True when the statement takes at most MAX_LINES lines and everything fits the box. */
  fits: boolean;
};

export const MAX_FONT = 100;
export const MIN_FONT = 52;
export const MAX_LINES = 4;
export const EXPLANATION_FONT = 40;
const STATEMENT_LINE_HEIGHT = 1.3;
const EXPLANATION_LINE_HEIGHT = 1.45;
/** Conservative glyph width in em for Be Vietnam Pro 800 (Vietnamese, spaces included). */
const STATEMENT_CHAR_EM = 0.64;
const EXPLANATION_CHAR_EM = 0.58;
const WRAP_SLACK = 1.08;

export const CHIP_BLOCK = 76 + 32;
export const CARD_PADDING = 48;
const CARD_BORDER = 3;
export const EXPLANATION_GAP = 32;

const linesFor = (chars: number, width: number, fontSize: number, em: number): number => {
  const perLine = Math.max(1, Math.floor(width / (fontSize * em)));
  return Math.max(1, Math.ceil((chars / perLine) * WRAP_SLACK));
};

/** Pure: biggest statement font (MAX_FONT..MIN_FONT, step 2) with <= MAX_LINES lines that fits the box. */
export const calloutLayout = (
  statement: string,
  explanation?: string,
  box: { width: number; height: number } = CALLOUT_BOX,
): CalloutLayout => {
  const plain = stripMarkup(statement);
  const textWidth = box.width - 2 * (CARD_PADDING + CARD_BORDER);
  const explanationLines = explanation
    ? linesFor(explanation.length, textWidth, EXPLANATION_FONT, EXPLANATION_CHAR_EM)
    : 0;
  const explanationHeight = explanation
    ? EXPLANATION_GAP + explanationLines * EXPLANATION_FONT * EXPLANATION_LINE_HEIGHT
    : 0;

  const make = (size: number, lines: number, fits: boolean): CalloutLayout => ({
    statementFontSize: size,
    statementLineHeight: STATEMENT_LINE_HEIGHT,
    explanationFontSize: EXPLANATION_FONT,
    explanationLineHeight: EXPLANATION_LINE_HEIGHT,
    statementLines: lines,
    fits,
  });

  for (let size = MAX_FONT; size >= MIN_FONT; size -= 2) {
    const lines = linesFor(plain.length, textWidth, size, STATEMENT_CHAR_EM);
    const height =
      CHIP_BLOCK +
      2 * (CARD_PADDING + CARD_BORDER) +
      lines * size * STATEMENT_LINE_HEIGHT +
      explanationHeight;
    if (lines <= MAX_LINES && height <= box.height) return make(size, lines, true);
  }
  return make(MIN_FONT, linesFor(plain.length, textWidth, MIN_FONT, STATEMENT_CHAR_EM), false);
};
