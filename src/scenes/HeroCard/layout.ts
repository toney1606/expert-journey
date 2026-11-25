import { codeBlockHeight, plainText, wrapLines } from '../../components/RowStrip/layout';
import { MIN_TEXT } from '../../components/ui/ui';
import { CONTENT_BOX } from '../../design/tokens';
import type { HeroCardProps } from './schema';

/** Height of the Kicker chip (36px text * 1.3 + padding + border). */
export const KICKER_H = 64;
export const HERO_MAX = 112;
/** The hero is a headline, but its second line may be a long phrase; it never goes below body text. */
export const HERO_MIN = 48;
export const HERO_LINE = 1.25;
export const HERO_CHAR_EM = 0.62;
/** Share of the box width a hero line may use (room for the glow and the slow push-in). */
export const WIDTH_USE = 0.94;
export const GROUP_GAP = 28;
export const ROW_GAP = 12;
export const ROW_PAD_Y = 10;
/** Row border (2px) + horizontal padding (20px) on both sides. */
export const ROW_PAD_X = 44;
export const ROW_TEXT_LINE = 1.3;
export const LABEL_SIZE = MIN_TEXT;
export const NUMBER_SIZE = 56;
export const MARK_SIZE = 48;
export const BADGE_SIZE = 48;
export const ROW_ICON_GAP = 16;
/** Space between an inline label and the text. */
export const LABEL_GAP = 16;
export const ROW_EM = 0.58;
export const MONO_ROW_EM = 0.6;
export const FOOTER_SIZE = 64;
export const FOOTER_ICON = 96;
export const FOOTER_PAD = 28;
export const FOOTER_EM = 0.58;
/** Max wrapped lines of one row text before the scene counts as overflowing. */
export const MAX_ROW_LINES = 3;

/** Row text size and the code size that goes with it, largest first. */
const LEVELS = [
  { row: 56, code: 46 },
  { row: 52, code: 46 },
  { row: 48, code: 44 },
  { row: 46, code: 42 },
  { row: 44, code: 40 },
] as const;

export type HeroCardLayout = {
  fits: boolean;
  heroSizes: number[];
  heroHeight: number;
  rowSize: number;
  codeSize: number;
  codeHeight: number;
  rowsHeight: number;
  footerHeight: number;
  /** Total height of kicker, hero, code, rows and footer with the minimum gaps. */
  height: number;
};

/** Each hero line is as large as fits the width; the second line is never larger than the first. */
export const heroSizes = (
  lines: readonly string[],
  width: number = CONTENT_BOX.width,
): number[] => {
  const sizes: number[] = [];
  for (const line of lines) {
    const fit = Math.floor(
      (width * WIDTH_USE) / (Math.max(1, plainText(line).length) * HERO_CHAR_EM),
    );
    sizes.push(Math.min(sizes[sizes.length - 1] ?? HERO_MAX, HERO_MAX, fit));
  }
  return sizes;
};

type Row = NonNullable<HeroCardProps['rows']>[number];

/** Width (px) left for the row's text after padding, the number circle and the trailing mark or badge. */
const rowTextWidth = (row: Row, props: HeroCardProps, width: number): number => {
  const leading = props.numbered ? NUMBER_SIZE + ROW_ICON_GAP : 0;
  const trailing = row.badge
    ? BADGE_SIZE * 0.66 * row.badge.length + 56 + ROW_ICON_GAP
    : row.mark
      ? MARK_SIZE + ROW_ICON_GAP
      : 0;
  return width - ROW_PAD_X - leading - trailing;
};

const rowTextEm = (props: HeroCardProps): number => (props.mono ? MONO_ROW_EM : ROW_EM);

/** True when the label sits on the same line as the text (they wrap onto two lines otherwise). */
export const labelInline = (
  row: Row,
  size: number,
  props: HeroCardProps,
  width: number = CONTENT_BOX.width,
): boolean => {
  if (!row.label) return false;
  const avail = rowTextWidth(row, props, width);
  const used =
    (row.label.length * LABEL_SIZE * ROW_EM +
      plainText(row.text).length * size * rowTextEm(props)) *
      1.08 +
    LABEL_GAP;
  return used <= avail;
};

const rowTextLines = (row: Row, size: number, props: HeroCardProps, width: number): number =>
  wrapLines(plainText(row.text).length, rowTextWidth(row, props, width), size, rowTextEm(props));

const rowHeight = (row: Row, size: number, props: HeroCardProps, width: number): number => {
  const lines = rowTextLines(row, size, props, width);
  const labelLine = row.label && !labelInline(row, size, props, width) ? 1 : 0;
  return Math.ceil((lines * size + labelLine * LABEL_SIZE) * ROW_TEXT_LINE) + 2 * ROW_PAD_Y + 4;
};

export const footerHeight = (text: string, width: number = CONTENT_BOX.width): number => {
  const avail = width - 2 * FOOTER_PAD - FOOTER_ICON - 24;
  const lines = wrapLines(text.length, avail, FOOTER_SIZE, FOOTER_EM);
  return Math.ceil(Math.max(FOOTER_ICON, lines * FOOTER_SIZE * ROW_TEXT_LINE)) + 2 * FOOTER_PAD;
};

/** Largest row and code size for which kicker + hero + code + rows + footer fit the content box. */
export const heroCardLayout = (
  props: HeroCardProps,
  box: { width: number; height: number } = CONTENT_BOX,
): HeroCardLayout => {
  const sizes = heroSizes(
    props.hero.map((line) => line.text),
    box.width,
  );
  const heroHeight = Math.ceil(sizes.reduce((sum, size) => sum + size * HERO_LINE, 0));
  const footer = props.footer ? footerHeight(props.footer.text, box.width) : 0;
  const rows = props.rows ?? [];
  let last: HeroCardLayout | undefined;
  // Prefer rows of at most two lines (a third line leaves an orphan word); allow three only when needed.
  for (const maxLines of [2, MAX_ROW_LINES]) {
    for (const level of LEVELS) {
      const codeHeight = props.code ? codeBlockHeight(props.code.text, level.code, box.width) : 0;
      const heights = rows.map((row) => rowHeight(row, level.row, props, box.width));
      const rowsHeight =
        heights.reduce((sum, h) => sum + h, 0) + ROW_GAP * Math.max(0, rows.length - 1);
      const blocks = 1 + (props.code ? 1 : 0) + (rows.length > 0 ? 1 : 0) + (props.footer ? 1 : 0);
      const height = KICKER_H + heroHeight + codeHeight + rowsHeight + footer + blocks * GROUP_GAP;
      const linesOk = rows.every(
        (row) => rowTextLines(row, level.row, props, box.width) <= maxLines,
      );
      last = {
        fits: height <= box.height && linesOk && sizes.every((size) => size >= HERO_MIN),
        heroSizes: sizes,
        heroHeight,
        rowSize: level.row,
        codeSize: level.code,
        codeHeight,
        rowsHeight,
        footerHeight: footer,
        height,
      };
      if (last.fits) return last;
    }
  }
  return last as HeroCardLayout;
};
