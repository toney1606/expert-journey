import { CONTENT_BOX } from '../../design/tokens';
import { MIN_TEXT } from '../../components/ui/ui';
import { parseRichText } from '../../lib/rich-text';
import type { PaymentHookProps } from './schema';

export const WIDTH_USE = 0.94;
export const KICKER_H = 56;
export const GAP = 24;
/** Bold title font average char width (em) and mono char width (em). */
export const TITLE_EM = 0.62;
export const MONO_EM = 0.6;
export const HERO_LINE = 1.25;
export const HERO_SIZES = [128, 120, 112, 104, 96, 88, 80] as const;
export const MONEY_SIZES = [96, 88, 80] as const;
export const CHIP_PAD_X = 40;
export const CHIP_PAD_Y = 10;
export const LOG_SIZE = 52;
export const LOG_PAD_X = 30;
export const LOG_PAD_Y = 18;
export const LOG_LINE = 1.4;
export const LOG_GAP = 22;
export const CHECK_GAP = 18;
export const QUESTION_SIZES = [150, 140, 130, 120, 110, 100] as const;
export const MINI_SIZE = 56;
export const TAP_RING = 200;

const plainLength = (markup: string): number =>
  parseRichText(markup).reduce((n, s) => n + s.text.length, 0);

const fitSize = (chars: number, sizes: readonly number[], em: number, width: number): number =>
  sizes.find((s) => chars * em * s <= width) ?? sizes[sizes.length - 1] ?? 0;

export type PaymentHookLayout = {
  fits: boolean;
  chargedSize: number;
  tappedSize: number;
  moneySize: number;
  logSize: number;
  questionSize: number;
  /** Height (px) of the first stage (hero lines + chips + tap) without the kicker. */
  stageA: number;
  /** Height (px) of the second stage (mini money + logs + question) without the kicker. */
  stageB: number;
};

export const paymentHookLayout = (props: PaymentHookProps): PaymentHookLayout => {
  const w = CONTENT_BOX.width * WIDTH_USE;
  const chargedSize = fitSize(plainLength(props.chargedLine), HERO_SIZES, TITLE_EM, w);
  const tappedSize = fitSize(plainLength(props.tappedLine), HERO_SIZES, TITLE_EM, w);
  const moneyChars = props.moneyLabel.length;
  const moneySize = fitSize(moneyChars, MONEY_SIZES, TITLE_EM, w - 2 * CHIP_PAD_X);
  const questionSize = fitSize(plainLength(props.question), QUESTION_SIZES, TITLE_EM, w);
  const logSize = LOG_SIZE;
  const logChars = Math.max(...props.logs.map((l) => l.text.length));

  const chipH = moneySize * 1.3 + 2 * CHIP_PAD_Y;
  const stageA =
    chargedSize * HERO_LINE + tappedSize * HERO_LINE + 2 * chipH + 20 + TAP_RING + 2 * GAP;
  const logH = logSize * LOG_LINE + 2 * LOG_PAD_Y;
  const stageB = MINI_SIZE * 1.4 + 3 * logH + 2 * LOG_GAP + questionSize * HERO_LINE + 3 * GAP + 60;
  const room = CONTENT_BOX.height - KICKER_H - GAP;

  const fits =
    chargedSize * TITLE_EM * plainLength(props.chargedLine) <= CONTENT_BOX.width &&
    tappedSize * TITLE_EM * plainLength(props.tappedLine) <= CONTENT_BOX.width &&
    moneyChars * TITLE_EM * moneySize + 2 * CHIP_PAD_X <= CONTENT_BOX.width &&
    logChars * MONO_EM * logSize + 2 * LOG_PAD_X + logSize + CHECK_GAP <= CONTENT_BOX.width &&
    plainLength(props.question) * TITLE_EM * questionSize <= CONTENT_BOX.width &&
    chargedSize >= 80 &&
    tappedSize >= 80 &&
    logSize >= MIN_TEXT &&
    stageA <= room &&
    stageB <= room;
  return { fits, chargedSize, tappedSize, moneySize, logSize, questionSize, stageA, stageB };
};
