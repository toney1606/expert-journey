import { CONTENT_BOX } from '../../design/tokens';

/** Box the summary is laid out in (kept as an export for pipeline/qa). */
export const SUMMARY_BOX = CONTENT_BOX;

export type SummaryLayout = {
  fontSize: number;
  lineHeight: number;
  /** Font size of the loop line card. */
  loopFontSize: number;
  /** True when the estimated content height fits the box at the chosen size. */
  fits: boolean;
};

const MAX_FONT = 44;
export const MIN_FONT = 28;
const LINE_HEIGHT = 1.4;
/** Conservative average glyph width in em for Be Vietnam Pro (Vietnamese text, spaces included). */
const CHAR_EM = 0.58;
/** Extra lines for word-wrap slack. */
const WRAP_SLACK = 1.08;

const CHIP_HEIGHT = 64;
const GAP_AFTER_CHIP = 24;
const ROW_GAP = 18;
const LOOP_MARGIN = 18;
const LOOP_PADDING = 20;
const CHECK_GAP = 18;

/** Loop line is slightly smaller than the points but never below the minimum font. */
const loopFontFor = (fontSize: number): number => Math.max(MIN_FONT, Math.round(fontSize * 0.9));

const linesFor = (chars: number, textWidth: number, fontSize: number): number => {
  const perLine = Math.max(1, Math.floor(textWidth / (fontSize * CHAR_EM)));
  return Math.max(1, Math.ceil((chars / perLine) * WRAP_SLACK));
};

const contentHeight = (
  fontSize: number,
  points: readonly string[],
  loopLine: string | undefined,
  box: { width: number; height: number },
): number => {
  const checkWidth = fontSize * 1.1;
  const textWidth = box.width - checkWidth - CHECK_GAP;
  let height = CHIP_HEIGHT + GAP_AFTER_CHIP;
  points.forEach((point, i) => {
    height += linesFor(point.length, textWidth, fontSize) * fontSize * LINE_HEIGHT;
    if (i > 0) height += ROW_GAP;
  });
  if (loopLine) {
    const loopSize = loopFontFor(fontSize);
    const loopText = box.width - 2 * LOOP_PADDING - 4 - loopSize * 1.2 - CHECK_GAP;
    height +=
      LOOP_MARGIN +
      2 * LOOP_PADDING +
      linesFor(loopLine.length, loopText, loopSize) * loopSize * LINE_HEIGHT;
  }
  return height;
};

/** Largest font size (MAX_FONT down to MIN_FONT, step 2) at which everything fits the box. */
export const summaryLayout = (
  points: readonly string[],
  loopLine?: string,
  box: { width: number; height: number } = SUMMARY_BOX,
): SummaryLayout => {
  for (let size = MAX_FONT; size >= MIN_FONT; size -= 2) {
    if (contentHeight(size, points, loopLine, box) <= box.height) {
      return fit(size, true);
    }
  }
  return fit(MIN_FONT, false);
};

const fit = (fontSize: number, fits: boolean): SummaryLayout => ({
  fontSize,
  lineHeight: LINE_HEIGHT,
  loopFontSize: loopFontFor(fontSize),
  fits,
});
