import { CONTENT_BOX } from '../../design/tokens';
import { formatNumber } from './format';

export const STAT_BOX = CONTENT_BOX;

export type StatRowInput = { label: string; value: number; unit?: string; caption?: string };

export type StatLayout = {
  titleSize: number;
  labelSize: number;
  numberSize: number;
  unitSize: number;
  captionSize: number;
  footnoteSize: number;
  gap: number;
  /** False when captions had to be dropped to fit (only with 3-4 rows and long content). */
  showCaptions: boolean;
  /** Estimated height of each row card. */
  rowHeights: number[];
  /** True when everything fits the box at the chosen size (numbers >= MIN_NUMBER, labels >= MIN_LABEL). */
  fits: boolean;
};

export const MIN_NUMBER = 56;
export const MIN_LABEL = 30;
const MAX_NUMBER = 120;

const TITLE_SIZE = 44;
const TITLE_LH = 1.3;
const LABEL_LH = 1.35;
const NUMBER_LH = 1.2;
const CAPTION_LH = 1.35;
const CHAR_EM = 0.58;
const WRAP_SLACK = 1.08;
const DIGIT_EM = 0.62;
const SEP_EM = 0.3;
const UNIT_EM = 0.5;
const UNIT_GAP = 16;
const PAD_Y = 12;
const PAD_X = 22;
const BAR_H = 14;
const BAR_GAP = 8;
const LABEL_GAP = 4;
const CAPTION_GAP = 4;
const TITLE_GAP = 20;

/** Strip {accent|word} markup so length estimates see only visible text. */
const plain = (text: string): string => text.replace(/\{[^|}]*\|([^}]*)\}/g, '$1');

const lines = (chars: number, width: number, size: number): number =>
  Math.max(1, Math.ceil(((chars * size * CHAR_EM) / Math.max(1, width)) * WRAP_SLACK));

/** Width of a counter string in fixed slots (digits equal width, separators narrow). */
export const numberWidth = (value: number, size: number): number =>
  [...formatNumber(value)].reduce((sum, ch) => sum + size * (/\d/.test(ch) ? DIGIT_EM : SEP_EM), 0);

const rowHeight = (
  row: StatRowInput,
  showCaption: boolean,
  s: { label: number; number: number; caption: number },
  innerWidth: number,
): number => {
  let h = 2 * PAD_Y + 4;
  h += lines(plain(row.label).length, innerWidth, s.label) * s.label * LABEL_LH + LABEL_GAP;
  h += s.number * NUMBER_LH + BAR_GAP + BAR_H;
  if (row.caption && showCaption) {
    h +=
      CAPTION_GAP +
      lines(plain(row.caption).length, innerWidth, s.caption) * s.caption * CAPTION_LH;
  }
  return Math.ceil(h);
};

const widthFits = (row: StatRowInput, numberSize: number, innerWidth: number): boolean => {
  const unitWidth = row.unit ? UNIT_GAP + row.unit.length * numberSize * UNIT_EM * CHAR_EM : 0;
  return numberWidth(row.value, numberSize) + unitWidth <= innerWidth;
};

/** Largest numbers (120px down to 56px, step 4) at which title + rows + footnote fit the box. */
export const statLayout = (
  title: string,
  rows: readonly StatRowInput[],
  footnote?: string,
  box: { width: number; height: number } = STAT_BOX,
): StatLayout => {
  const innerWidth = box.width - 2 * PAD_X - 4;
  let best: StatLayout | null = null;
  for (const showCaptions of [true, false]) {
    for (let number = MAX_NUMBER; number >= MIN_NUMBER; number -= 4) {
      const label = Math.max(MIN_LABEL, Math.round(number * 0.4));
      const caption = Math.max(26, label - 4);
      const footnoteSize = 26;
      const gap = rows.length >= 4 ? 12 : 20;
      const rowHeights = rows.map((r) =>
        rowHeight(r, showCaptions, { label, number, caption }, innerWidth),
      );
      const titleH =
        lines(plain(title).length, box.width, TITLE_SIZE) * TITLE_SIZE * TITLE_LH + TITLE_GAP;
      const footH = footnote
        ? lines(plain(footnote).length, box.width, footnoteSize) * footnoteSize * 1.35 + gap
        : 0;
      const total =
        titleH + footH + rowHeights.reduce((a, b) => a + b, 0) + gap * Math.max(0, rows.length - 1);
      const candidate: StatLayout = {
        titleSize: TITLE_SIZE,
        labelSize: label,
        numberSize: number,
        unitSize: Math.round(number * UNIT_EM),
        captionSize: caption,
        footnoteSize,
        gap,
        showCaptions,
        rowHeights,
        fits: total <= box.height && rows.every((r) => widthFits(r, number, innerWidth)),
      };
      if (candidate.fits) return candidate;
      best = candidate;
    }
  }
  return best ?? { ...statLayout('', [], undefined, box), fits: false };
};
