/** Pure font-size selection for the Tradeoff scene. All values in px. */

export type LayoutOption = { name: string; pros: readonly string[]; cons: readonly string[] };

export type TradeoffLayout = {
  titleSize: number;
  nameSize: number;
  rowSize: number;
  /** Estimated total content height at the chosen sizes (top pad + title + gap + cards). */
  height: number;
  /**
   * Space above the title (px): TITLE_PAD_TOP when the content fills the box; larger when there
   * is spare height, so that title + cards are centred vertically in the box.
   */
  top: number;
  /** False when even the minimum sizes do not fit in the box. */
  fits: boolean;
};

export const LINE_HEIGHT = 1.4;
export const NAME_LINE_HEIGHT = 1.35;
export const TITLE_LINE_HEIGHT = 1.3;
export const CARD_PAD_X = 24;
export const CARD_PAD_Y = 16;
export const SECTION_GAP = 16;
/** Space between the top of the box and the title. */
export const TITLE_PAD_TOP = 8;
/** Space between the title and the first card. */
export const TITLE_GAP = 28;
export const ROW_GAP = 8;
export const NAME_GAP = 10;
export const ICON_GAP = 14;
export const MAX_ROW_SIZE = 36;
export const MIN_ROW_SIZE = 28;
export const MAX_NAME_SIZE = 48;
export const MAX_TITLE_SIZE = 52;
export const MIN_NAME_SIZE = 36;
export const MIN_TITLE_SIZE = 40;
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

export type Sizes = { titleSize: number; nameSize: number; rowSize: number };

export const titleHeight = (title: string, boxWidth: number, titleSize: number): number =>
  estimateLines(title, titleSize, boxWidth) * titleSize * TITLE_LINE_HEIGHT;

/** Height of the card stack (cards separated by SECTION_GAP). */
export const cardsHeight = (
  options: readonly LayoutOption[],
  boxWidth: number,
  sizes: Sizes,
): number => {
  const { nameSize, rowSize } = sizes;
  const textWidth = rowTextWidth(boxWidth, rowSize);
  const nameWidth = boxWidth - 2 * CARD_PAD_X;
  let total = Math.max(0, options.length - 1) * SECTION_GAP;
  for (const option of options) {
    const rows = [...option.pros, ...option.cons];
    const rowsHeight = rows.reduce(
      (sum, row) => sum + estimateLines(row, rowSize, textWidth) * rowSize * LINE_HEIGHT,
      0,
    );
    const gaps = Math.max(0, rows.length - 1) * ROW_GAP;
    const nameHeight =
      estimateLines(option.name, nameSize, nameWidth) * nameSize * NAME_LINE_HEIGHT;
    total += 2 * CARD_PAD_Y + nameHeight + (rows.length > 0 ? NAME_GAP : 0);
    total += rowsHeight + gaps;
  }
  return total;
};

export const contentHeight = (
  title: string,
  options: readonly LayoutOption[],
  boxWidth: number,
  sizes: Sizes,
): number =>
  TITLE_PAD_TOP +
  titleHeight(title, boxWidth, sizes.titleSize) +
  TITLE_GAP +
  cardsHeight(options, boxWidth, sizes);

/** Space above the title that centres the content (height includes TITLE_PAD_TOP), at least TITLE_PAD_TOP. */
export const centeringOffset = (boxHeight: number, contentH: number): number =>
  Math.max(TITLE_PAD_TOP, Math.floor((boxHeight - (contentH - TITLE_PAD_TOP)) / 2));

/**
 * Largest row size (stepping down 1px at a time) whose content fits the box. With room to spare,
 * the name and title sizes are then raised to their maximums as far as they still fit, and
 * the content is centred vertically (`top`).
 */
export const chooseLayout = (
  title: string,
  options: readonly LayoutOption[],
  box: { width: number; height: number },
): TradeoffLayout => {
  const limit = box.height * HEIGHT_MARGIN;
  let last: TradeoffLayout | undefined;
  for (let rowSize = MAX_ROW_SIZE; rowSize >= MIN_ROW_SIZE; rowSize -= 1) {
    let sizes: Sizes = {
      rowSize,
      nameSize: Math.max(MIN_NAME_SIZE, Math.min(MAX_NAME_SIZE, rowSize + 12)),
      titleSize: Math.max(MIN_TITLE_SIZE, Math.min(MAX_TITLE_SIZE, rowSize + 16)),
    };
    let height = contentHeight(title, options, box.width, sizes);
    const fits = height <= limit;
    if (fits) {
      for (const grown of [
        { ...sizes, nameSize: MAX_NAME_SIZE },
        { ...sizes, nameSize: MAX_NAME_SIZE, titleSize: MAX_TITLE_SIZE },
      ]) {
        const grownHeight = contentHeight(title, options, box.width, grown);
        if (grownHeight <= limit) {
          sizes = grown;
          height = grownHeight;
        }
      }
    }
    last = {
      ...sizes,
      height,
      fits,
      top: fits ? centeringOffset(box.height, height) : TITLE_PAD_TOP,
    };
    if (fits) return last;
  }
  if (!last) throw new Error('unreachable: row size range is empty');
  return last;
};
