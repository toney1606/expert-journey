import { CONTENT_BOX } from '../../design/tokens';
import { formatNumber } from '../Stat/format';
import { MIN_TEXT, slotsWidthEm } from '../../components/ui/ui';
import type { CounterHookProps } from './schema';

/** Hero number sizes (px), largest first; the unit ("ms") is drawn at UNIT_SCALE of the number. */
export const NUMBER_SIZES = [240, 230, 220, 210, 200, 190, 180, 170, 160] as const;
/** The number opens at most this big (px) while it is still short ("12 ms"), then shrinks as digits grow. */
export const START_MAX = 340;
/** Text may use this share of the box width (room for glow and the slow push-in). */
export const WIDTH_USE = 0.94;
export const UNIT_SCALE = 0.5;
/** "ms" in bold caps-height em per char (m is wide). */
export const UNIT_CHAR_EM = 0.78;
export const UNIT_GAP_EM = 0.12;
export const LINE_SIZE = 72;
/** Extra height (px) of the hero box beyond the settled number, so the bigger opening digits breathe. */
export const HERO_EXTRA = 60;
export const LINE_CHAR_EM = 0.6;
export const FINAL_SIZE = 140;
export const ACCENT_SIZES = [270, 250, 230, 210, 190, 170, 150] as const;
/** Bold capitals (e.g. "ĐOÁN") are wider than digits. */
export const ACCENT_CHAR_EM = 0.8;
export const FOOT_SIZE = 60;
export const FOOT_CHAR_EM = 0.6;
export const MIN_NUMBER = 160;
export const MIN_LINE = MIN_TEXT;
export const KICKER_H = 56;
export const NUMBER_LINE = 1.15;
export const TEXT_LINE = 1.3;
/** Ratio chip beside the race bar. */
export const RATIO_SIZE = 76;
export const BAR_H = 40;
export const CARD_PAD_Y = 18;
export const CARD_PAD_X = 34;
export const LINE_GAP = 16;

export type CounterHookLayout = {
  fits: boolean;
  numberSize: number;
  /** Opening size while the number is still short. */
  startSize: number;
  lineSize: number;
  finalSize: number;
  accentSize: number;
  footSize: number;
  /** Height (px) of the tallest stage including the kicker. */
  height: number;
};

const textWidth = (chars: number, size: number, em: number): number => chars * em * size;

/** Number + unit width (px) at `size`, widest value. */
const numberWidthEm = (value: number, unit: string): number =>
  slotsWidthEm(formatNumber(value)) + UNIT_GAP_EM + unit.length * UNIT_CHAR_EM * UNIT_SCALE;

const numberWidth = (props: CounterHookProps, size: number): number =>
  numberWidthEm(Math.max(props.fastMs, props.slowMs), props.unit) * size;

/** Pick the largest sizes whose widest text fits CONTENT_BOX width and whose two stages fit its height. */
export const counterHookLayout = (props: CounterHookProps): CounterHookLayout => {
  const lineChars = Math.max(...props.lines.map((l) => l.text.length));
  const lineSize = LINE_SIZE;
  const numberSize =
    NUMBER_SIZES.find((s) => numberWidth(props, s) <= CONTENT_BOX.width * WIDTH_USE) ?? 160;
  const startSize = Math.max(
    numberSize,
    Math.min(
      START_MAX,
      Math.floor((CONTENT_BOX.width * WIDTH_USE) / numberWidthEm(props.fastMs, props.unit)),
    ),
  );
  const accentSize =
    ACCENT_SIZES.find(
      (s) => textWidth(props.accentWord.length, s, ACCENT_CHAR_EM) <= CONTENT_BOX.width,
    ) ?? 150;
  const finalSize = FINAL_SIZE;
  const footSize = FOOT_SIZE;

  const stageA =
    numberSize * NUMBER_LINE +
    HERO_EXTRA +
    BAR_H +
    props.lines.length * (lineSize * TEXT_LINE + 2 * CARD_PAD_Y) +
    (props.lines.length - 1) * LINE_GAP;
  const stageB =
    finalSize * TEXT_LINE +
    accentSize * 1.25 +
    (props.footText ? footSize * TEXT_LINE + 2 * CARD_PAD_Y : 0);
  const height = KICKER_H + Math.max(stageA, stageB);

  const fits =
    numberSize >= MIN_NUMBER &&
    numberWidth(props, numberSize) <= CONTENT_BOX.width &&
    textWidth(lineChars, lineSize, LINE_CHAR_EM) + 2 * CARD_PAD_X <= CONTENT_BOX.width &&
    textWidth(props.finalText.length, finalSize, LINE_CHAR_EM + 0.04) <= CONTENT_BOX.width &&
    textWidth(props.accentWord.length, accentSize, ACCENT_CHAR_EM) <= CONTENT_BOX.width &&
    (!props.footText ||
      textWidth(props.footText.length, footSize, FOOT_CHAR_EM) + 2 * CARD_PAD_X <=
        CONTENT_BOX.width) &&
    height <= CONTENT_BOX.height;
  return { fits, numberSize, startSize, lineSize, finalSize, accentSize, footSize, height };
};
