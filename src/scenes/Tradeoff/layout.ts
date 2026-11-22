/** Pure font-size selection for the Tradeoff scene. All values in px. */

export type LayoutOption = { name: string; pros: readonly string[]; cons: readonly string[] };

export type TradeoffLayout = {
  titleSize: number;
  nameSize: number;
  rowSize: number;
  /** Estimated total content height at the chosen sizes. */
  height: number;
  /** False when even the minimum sizes do not fit in the box. */
  fits: boolean;
};

export const LINE_HEIGHT = 1.4;
export const NAME_LINE_HEIGHT = 1.35;
export const TITLE_LINE_HEIGHT = 1.3;
export const CARD_PAD_X = 28;
export const CARD_PAD_Y = 22;
export const SECTION_GAP = 22;
export const ROW_GAP = 10;
export const NAME_GAP = 12;
export const ICON_GAP = 16;
export const MAX_ROW_SIZE = 40;
export const MIN_ROW_SIZE = 28;
export const MAX_NAME_SIZE = 56;
export const MAX_TITLE_SIZE = 60;
export const MIN_NAME_SIZE = 40;
export const MIN_TITLE_SIZE = 44;
/** Average glyph width in em for Be Vietnam Pro (slightly pessimistic; bold is wider). */
export const AVG_CHAR_EM = 0.6;
/** Safety margin on the available height. */
export const HEIGHT_MARGIN = 0.97;

/** Greedy word-wrap estimate of the number of lines (at least 1). */
export const estimateLines = (text: string, fontSize: number, widthPx: number): number => {
  const perLine = Math.max(1, Math.floor(widthPx / (fontSize * AVG_CHAR_EM)));
  let lines = 1;
  let used = 0;
  for (const word of text.split(/\s+/).filter(Boolean)) {
    let len = word.length;
    while (len > perLine) {
      // Overlong word breaks across lines.
      if (used > 0) lines += 1;
      lines += Math.ceil(len / perLine) - 1;
      used = len % perLine;
      len = 0;
    }
    if (len === 0) continue;
    if (used === 0) used = len;
    else if (used + 1 + len <= perLine) used += 1 + len;
    else {
      lines += 1;
      used = len;
    }
  }
  return lines;
};

/** Width available for row text inside a card of the given outer width. */
export const rowTextWidth = (boxWidth: number, rowSize: number): number =>
  boxWidth - 2 * CARD_PAD_X - rowSize - ICON_GAP;

export const contentHeight = (
  title: string,
  options: readonly LayoutOption[],
  boxWidth: number,
  sizes: { titleSize: number; nameSize: number; rowSize: number },
): number => {
  const { titleSize, nameSize, rowSize } = sizes;
  const titleLines = estimateLines(title, titleSize, boxWidth);
  let total = titleLines * titleSize * TITLE_LINE_HEIGHT;
  const textWidth = rowTextWidth(boxWidth, rowSize);
  const nameWidth = boxWidth - 2 * CARD_PAD_X;
  for (const option of options) {
    const rows = [...option.pros, ...option.cons];
    const rowsHeight = rows.reduce(
      (sum, row) => sum + estimateLines(row, rowSize, textWidth) * rowSize * LINE_HEIGHT,
      0,
    );
    const gaps = Math.max(0, rows.length - 1) * ROW_GAP;
    const nameHeight =
      estimateLines(option.name, nameSize, nameWidth) * nameSize * NAME_LINE_HEIGHT;
    total += SECTION_GAP + 2 * CARD_PAD_Y + nameHeight + (rows.length > 0 ? NAME_GAP : 0);
    total += rowsHeight + gaps;
  }
  return total;
};

/** Largest sizes (stepping the row size down 1px at a time) whose content fits the box. */
export const chooseLayout = (
  title: string,
  options: readonly LayoutOption[],
  box: { width: number; height: number },
): TradeoffLayout => {
  const limit = box.height * HEIGHT_MARGIN;
  let last: TradeoffLayout | undefined;
  for (let rowSize = MAX_ROW_SIZE; rowSize >= MIN_ROW_SIZE; rowSize -= 1) {
    const sizes = {
      rowSize,
      nameSize: Math.max(MIN_NAME_SIZE, Math.min(MAX_NAME_SIZE, rowSize + 16)),
      titleSize: Math.max(MIN_TITLE_SIZE, Math.min(MAX_TITLE_SIZE, rowSize + 20)),
    };
    const height = contentHeight(title, options, box.width, sizes);
    last = { ...sizes, height, fits: height <= limit };
    if (last.fits) return last;
  }
  if (!last) throw new Error('unreachable: row size range is empty');
  return last;
};
