import { CONTENT_BOX } from '../../design/tokens';
import { slotsWidthEm } from '../../components/ui/ui';
import { formatPage } from './format';
import type { PageSliderProps } from './schema';

export const CODE_SIZES = [52, 50, 48, 46] as const;
export const MIN_CODE = 46;
/** Giant page number (px) and its digit-slot line height. */
export const PAGE_SIZE = 216;
export const PAGE_LINE = 1.15;
export const PAGE_LABEL_SIZE = 48;
export const LATENCY_SIZE = 72;
export const TEXT_LINE = 1.3;
export const GAUGE_H = 88;
export const GAP = 24;
export const KICKER_H = 56;
export const CODE_LINE_HEIGHT = 1.45;
/** Question lines: first sentence gets up to this size, every line is shrunk to fit the width. */
export const QUESTION_MAX = 150;
export const QUESTION_MIN = 96;
export const QUESTION_CHAR_EM = 0.62;
export const PIN_ICON = 120;
export const CTA_SIZE = 64;
export const CTA_PAD = 28;
const CTA_CHAR_EM = 0.5;
/** CodeBlock padding (20 top + 20 bottom) and horizontal padding (24 + 24) + border. */
const CODE_PAD_Y = 44;
const CODE_PAD_X = 52;
const CODE_CHAR_EM = 0.6;

export type PageSliderLayout = {
  fits: boolean;
  codeSize: number;
  codeHeight: number;
  pageSize: number;
  /** Question split at "?" into big lines, each with its own font size. */
  questionLines: { text: string; size: number }[];
  ctaHeight: number;
  /** Height of the tallest upper stage (hero + gauge, or question + CTA), without kicker and code. */
  upperHeight: number;
  height: number;
};

const codeLines = (code: string, size: number): number => {
  const perLine = Math.max(1, Math.floor((CONTENT_BOX.width - CODE_PAD_X) / (CODE_CHAR_EM * size)));
  return code.split('\n').reduce((n, line) => n + Math.max(1, Math.ceil(line.length / perLine)), 0);
};

/** "Vì sao? Sửa thế nào?" -> ["Vì sao?", "Sửa thế nào?"] */
export const splitQuestion = (question: string): string[] =>
  question
    .split(/(?<=[?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

/** Largest code size (>= 46px) for which the whole stack fits the CONTENT_BOX. */
export const pageSliderLayout = (props: PageSliderProps): PageSliderLayout => {
  const widest = formatPage(Math.max(props.firstPage, props.lastPage));
  const pageWidth = slotsWidthEm(widest) * PAGE_SIZE;
  const questionLines = splitQuestion(props.question).map((text) => ({
    text,
    size: Math.max(
      QUESTION_MIN,
      Math.min(QUESTION_MAX, Math.floor(CONTENT_BOX.width / (text.length * QUESTION_CHAR_EM))),
    ),
  }));
  const questionHeight = questionLines.reduce((h, l) => h + l.size * 1.25, 0);
  // Pin icon on the left, text wraps in the rest of the card.
  const ctaTextWidth = CONTENT_BOX.width - 2 * CTA_PAD - PIN_ICON - 24;
  const ctaLines = Math.ceil((props.pinText.length * CTA_CHAR_EM * CTA_SIZE) / ctaTextWidth);
  const ctaHeight = Math.max(PIN_ICON, ctaLines * CTA_SIZE * TEXT_LINE) + 2 * CTA_PAD;
  const hero =
    PAGE_LABEL_SIZE * TEXT_LINE + PAGE_SIZE * PAGE_LINE + LATENCY_SIZE * TEXT_LINE + GAP + GAUGE_H;
  const stageB = questionHeight + GAP + ctaHeight;
  const upperHeight = Math.max(hero, stageB);
  const textFits =
    pageWidth <= CONTENT_BOX.width &&
    questionLines.every((l) => l.text.length * QUESTION_CHAR_EM * l.size <= CONTENT_BOX.width) &&
    ctaLines <= 2;
  const stackAt = (size: number): { codeHeight: number; height: number } => {
    const codeHeight = codeLines(props.code, size) * size * CODE_LINE_HEIGHT + CODE_PAD_Y;
    return { codeHeight, height: KICKER_H + upperHeight + codeHeight + 2 * GAP };
  };
  const chosen = CODE_SIZES.find((s) => stackAt(s).height <= CONTENT_BOX.height) ?? MIN_CODE;
  const { codeHeight, height } = stackAt(chosen);
  return {
    fits: textFits && height <= CONTENT_BOX.height && chosen >= MIN_CODE,
    codeSize: chosen,
    codeHeight,
    pageSize: PAGE_SIZE,
    questionLines,
    ctaHeight,
    upperHeight,
    height,
  };
};
