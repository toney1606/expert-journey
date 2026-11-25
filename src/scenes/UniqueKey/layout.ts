import { plainText } from '../../components/RowStrip/layout';
import { MIN_TEXT } from '../../components/ui/ui';
import { CONTENT_BOX } from '../../design/tokens';
import type { UniqueKeyProps } from './schema';

export const KICKER_H = 64;
export const GAP = 24;
export const HERO_MAX = 112;
export const HERO_MIN = 80;
export const HERO_LINE = 1.25;
export const HERO_CHAR_EM = 0.62;
export const WIDTH_USE = 0.94;
export const CODE_SIZES = [50, 48, 46, 44, 42, 40] as const;
export const MIN_CODE = 40;
export const CODE_LINE = 1.45;
/** CodeBlock padding (20 + 20 vertical, 24 + 24 horizontal) plus 2px borders. */
const CODE_PAD_Y = 44;
const CODE_PAD_X = 52;
const MONO_EM = 0.6;
/** Table card geometry. */
export const TABLE_PAD = 24;
export const TITLE_SIZE = 44;
export const ROW_MAX = 52;
export const ROW_LINE = 1.3;
export const ROW_PAD_Y = 14;
export const ROW_GAP = 12;
export const ROW_PAD_X = 24;
export const CHECK_SIZE = 56;
/** Width kept free on the right of the rows for the UNIQUE wall. */
export const WALL_ZONE = 110;
export const LOCK_SIZE = 60;
const BORDER = 4;

export type UniqueKeyLayout = {
  fits: boolean;
  heroSizes: number[];
  heroHeight: number;
  codeSize: number;
  codeHeight: number;
  rowSize: number;
  rowHeight: number;
  tableHeight: number;
  height: number;
  /** 0-based index of the UNIQUE line in the code, -1 when absent. */
  uniqueLine: number;
};

export const heroSizes = (lines: readonly string[]): number[] =>
  lines.map((line) =>
    Math.min(
      HERO_MAX,
      Math.floor(
        (CONTENT_BOX.width * WIDTH_USE) / (Math.max(1, plainText(line).length) * HERO_CHAR_EM),
      ),
    ),
  );

export const uniqueLineIndex = (code: string): number =>
  code.split('\n').findIndex((l) => /^\s*UNIQUE\b/i.test(l));

export const uniqueKeyLayout = (props: UniqueKeyProps): UniqueKeyLayout => {
  const sizes = heroSizes(props.hero);
  const heroHeight = Math.ceil(sizes.reduce((s, x) => s + x * HERO_LINE, 0));
  const lines = props.code.split('\n');
  const longest = Math.max(...lines.map((l) => l.length));
  const codeAvail = CONTENT_BOX.width - CODE_PAD_X - BORDER;
  const innerW = CONTENT_BOX.width - 2 * TABLE_PAD - BORDER;
  const rowText = Math.max(props.rowOk.length, props.rowDup.length);
  const rowAvail = innerW - WALL_ZONE - 2 * ROW_PAD_X - CHECK_SIZE - 16;
  const rowSize = Math.min(ROW_MAX, Math.floor(rowAvail / (rowText * MONO_EM)));
  const rowHeight = Math.ceil(rowSize * ROW_LINE) + 2 * ROW_PAD_Y;
  const titleH = Math.ceil(TITLE_SIZE * ROW_LINE) + 8;
  const headerH = Math.ceil(rowSize * ROW_LINE);
  const tableHeight = 2 * TABLE_PAD + BORDER + titleH + headerH + 2 * rowHeight + 3 * ROW_GAP;
  const stackAt = (size: number): { codeHeight: number; height: number } => {
    const codeHeight = Math.ceil(lines.length * size * CODE_LINE) + CODE_PAD_Y + BORDER;
    return { codeHeight, height: KICKER_H + heroHeight + codeHeight + tableHeight + 3 * GAP };
  };
  const wideEnough = (size: number): boolean => longest * MONO_EM * size <= codeAvail;
  const chosen =
    CODE_SIZES.find((s) => wideEnough(s) && stackAt(s).height <= CONTENT_BOX.height) ?? MIN_CODE;
  const { codeHeight, height } = stackAt(chosen);
  return {
    fits:
      height <= CONTENT_BOX.height &&
      wideEnough(chosen) &&
      sizes.every((s) => s >= HERO_MIN) &&
      rowSize >= MIN_TEXT,
    heroSizes: sizes,
    heroHeight,
    codeSize: chosen,
    codeHeight,
    rowSize,
    rowHeight,
    tableHeight,
    height,
    uniqueLine: uniqueLineIndex(props.code),
  };
};
