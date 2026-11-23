/** Pure layout for the Compare scene (two cards, stacked or side by side). All values in px. */
import { estimateLines } from '../Tradeoff/layout';

export type SideText = { label: string; caption?: string; hasIcon: boolean };
export type Orientation = 'stacked' | 'side';

export type CompareLayout = {
  orientation: Orientation;
  titleSize: number;
  labelSize: number;
  captionSize: number;
  verdictSize: number;
  iconSize: number;
  /** Outer width of one card. */
  cardWidth: number;
  /** Outer height of each card (both equal). */
  cardHeight: number;
  /** Space above the title so the whole content is vertically centred. */
  top: number;
  /** Estimated total content height. */
  height: number;
  /** False when even the minimum sizes overflow the box. */
  fits: boolean;
};

export const TITLE_PAD_TOP = 8;
export const TITLE_GAP = 28;
export const TITLE_LINE_HEIGHT = 1.3;
export const LABEL_LINE_HEIGHT = 1.3;
export const CAPTION_LINE_HEIGHT = 1.4;
export const VERDICT_LINE_HEIGHT = 1.35;
export const CARD_PAD = 24;
export const ICON_GAP = 20;
export const TEXT_GAP = 6;
/** Height of the "vs" divider between stacked cards; width of the gap between side cards. */
export const VS_SIZE = 64;
export const VERDICT_GAP = 32;
export const VERDICT_PAD_Y = 14;
export const VERDICT_PAD_X = 28;
export const MAX_TITLE_SIZE = 52;
export const MIN_TITLE_SIZE = 44;
export const MAX_LABEL_SIZE = 48;
export const MIN_LABEL_SIZE = 36;
export const MIN_CAPTION_SIZE = 30;
export const MAX_CAPTION_SIZE = 34;
export const MIN_VERDICT_SIZE = 38;
export const MAX_VERDICT_SIZE = 44;
export const HEIGHT_MARGIN = 0.97;
/** Side by side is only used when it fits with labels at least this big and at most 2 lines. */
export const SIDE_MIN_LABEL_SIZE = 36;
export const SIDE_MAX_LABEL_LINES = 2;

type Box = { width: number; height: number };
type Sizes = { title: number; label: number; caption: number; verdict: number; icon: number };

const sizesFor = (label: number): Sizes => ({
  label,
  title: Math.max(MIN_TITLE_SIZE, Math.min(MAX_TITLE_SIZE, label + 4)),
  caption: Math.max(MIN_CAPTION_SIZE, Math.min(MAX_CAPTION_SIZE, label - 10)),
  verdict: Math.max(MIN_VERDICT_SIZE, Math.min(MAX_VERDICT_SIZE, label - 4)),
  icon: 96,
});

const textBlockHeight = (side: SideText, textWidth: number, s: Sizes): number => {
  let h = estimateLines(side.label, s.label, textWidth) * s.label * LABEL_LINE_HEIGHT;
  if (side.caption) {
    h +=
      TEXT_GAP +
      estimateLines(side.caption, s.caption, textWidth) * s.caption * CAPTION_LINE_HEIGHT;
  }
  return h;
};

/** Outer height of the tallest card for an orientation and sizes. */
export const cardHeightFor = (
  sides: readonly [SideText, SideText],
  orientation: Orientation,
  boxWidth: number,
  s: Sizes,
): number => {
  const cardWidth = orientation === 'side' ? (boxWidth - VS_SIZE) / 2 : boxWidth;
  const inner = cardWidth - 2 * CARD_PAD;
  const heights = sides.map((side) => {
    if (orientation === 'stacked') {
      const textWidth = inner - (side.hasIcon ? s.icon + ICON_GAP : 0);
      return Math.max(side.hasIcon ? s.icon : 0, textBlockHeight(side, textWidth, s));
    }
    return (side.hasIcon ? s.icon + ICON_GAP : 0) + textBlockHeight(side, inner, s);
  });
  return Math.max(...heights) + 2 * CARD_PAD;
};

export const verdictHeight = (verdict: string | undefined, boxWidth: number, s: Sizes): number =>
  verdict
    ? VERDICT_GAP +
      2 * VERDICT_PAD_Y +
      estimateLines(verdict, s.verdict, boxWidth - 2 * VERDICT_PAD_X) *
        s.verdict *
        VERDICT_LINE_HEIGHT
    : 0;

const totalHeight = (
  title: string,
  verdict: string | undefined,
  sides: readonly [SideText, SideText],
  orientation: Orientation,
  boxWidth: number,
  s: Sizes,
): { height: number; cardHeight: number } => {
  const cardHeight = cardHeightFor(sides, orientation, boxWidth, s);
  const cards = orientation === 'stacked' ? 2 * cardHeight + VS_SIZE : cardHeight;
  const titleH = estimateLines(title, s.title, boxWidth) * s.title * TITLE_LINE_HEIGHT;
  return {
    cardHeight,
    height: TITLE_PAD_TOP + titleH + TITLE_GAP + cards + verdictHeight(verdict, boxWidth, s),
  };
};

const tryOrientation = (
  title: string,
  verdict: string | undefined,
  sides: readonly [SideText, SideText],
  orientation: Orientation,
  box: Box,
  minLabel: number,
): CompareLayout => {
  const limit = box.height * HEIGHT_MARGIN;
  const cardWidth = orientation === 'side' ? (box.width - VS_SIZE) / 2 : box.width;
  let last: CompareLayout | undefined;
  for (let label = MAX_LABEL_SIZE; label >= minLabel; label -= 1) {
    const s = sizesFor(label);
    const { height, cardHeight } = totalHeight(title, verdict, sides, orientation, box.width, s);
    const labelLinesOk =
      orientation === 'stacked' ||
      sides.every(
        (side) =>
          estimateLines(side.label, s.label, cardWidth - 2 * CARD_PAD) <= SIDE_MAX_LABEL_LINES,
      );
    const fits = height <= limit && labelLinesOk;
    last = {
      orientation,
      titleSize: s.title,
      labelSize: s.label,
      captionSize: s.caption,
      verdictSize: s.verdict,
      iconSize: s.icon,
      cardWidth,
      cardHeight,
      height,
      fits,
      top: fits
        ? Math.max(TITLE_PAD_TOP, Math.floor((box.height - (height - TITLE_PAD_TOP)) / 2))
        : TITLE_PAD_TOP,
    };
    if (fits) return last;
  }
  if (!last) throw new Error('unreachable: label size range is empty');
  return last;
};

/**
 * Side by side when both labels stay short (<= 2 lines) and everything fits at label size >= 36;
 * otherwise stacked (cards full width, icon left of the text). Stacked is the fallback even if it
 * does not fit (`fits` false, minimum sizes).
 */
export const chooseLayout = (
  title: string,
  verdict: string | undefined,
  sides: readonly [SideText, SideText],
  box: Box,
): CompareLayout => {
  const side = tryOrientation(title, verdict, sides, 'side', box, SIDE_MIN_LABEL_SIZE);
  if (side.fits) return side;
  return tryOrientation(title, verdict, sides, 'stacked', box, MIN_LABEL_SIZE);
};
