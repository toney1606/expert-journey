import { counterHeight, counterWidth } from '../../components/RowStrip/RowCounter';
import { STAT_PAD_Y } from '../../components/RowStrip/StatCard';
import {
  MONO_EM,
  stripBlockHeight,
  stripGeometry,
  wrapLines,
} from '../../components/RowStrip/layout';
import { formatNumber, rowsRemovedLine, wrapCode } from '../../components/RowStrip/format';
import { CONTENT_BOX } from '../../design/tokens';
import { KICKER_HEIGHT } from '../RowSetup/layout';
import type { RowFixProps } from './schema';

export const FIX_GAP = 28;
/** Gap between the kicker and the step under it. */
export const KICKER_GAP = 16;
export const TITLE_SIZE = 72;
export const BUTTON_HEIGHT = 190;
export const BUTTON_WIDTH = 700;
export const BUTTON_FONT = 104;
export const STAMP_SIZE = 92;
/** Tighter letter spacing for monospace code so its lines stay on one line at 46px. */
export const CODE_TRACKING = -0.06;
export const CODE_SIZE = 46;
export const CODE_LH = 1.6;
/** Vertical padding (2 * 30) + border (2 * 2) of a code card; horizontal 2 * 24 + 4. */
const CODE_PAD_Y = 64;
const CODE_PAD_X = 52;
const HOT_LABEL_SIZE = 56;
const HOT_PAD_Y = 76;
const STAT_LABEL = 56;
const STAT_VALUE = 260;
const RESULT_LH = 1.2;

export type RowFixLayout = {
  titleSize: number;
  codeSize: number;
  counterSize: number;
  resultSize: number;
  statValueSize: number;
  statLabelSize: number;
  /** Characters per code line before it is broken. */
  codeChars: number;
  /** Heights of the three stacked steps (without the kicker). */
  step1Height: number;
  step2Height: number;
  step3Height: number;
  gap: number;
  /** True when every step fits the content box under the kicker, and nothing overflows its width. */
  fits: boolean;
};

/** Characters of one code line that fit the card. */
export const codeChars = (width: number): number =>
  Math.floor((width - CODE_PAD_X) / (CODE_SIZE * (MONO_EM + CODE_TRACKING)));

const codeHeight = (code: string, width: number): number => {
  const per = codeChars(width);
  const lines = code
    .split('\n')
    .reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / per)), 0);
  return Math.ceil(lines * CODE_SIZE * CODE_LH + CODE_PAD_Y);
};

export const rowFixLayout = (
  props: Pick<
    RowFixProps,
    | 'explainTitle'
    | 'explainCode'
    | 'rowsRemoved'
    | 'fixCode'
    | 'statLabel'
    | 'resultText'
    | 'analyzeLabel'
    | 'stampText'
  >,
  box: { width: number; height: number } = CONTENT_BOX,
): RowFixLayout => {
  const g = stripGeometry();
  const avail = box.height - KICKER_HEIGHT - KICKER_GAP;
  const chars = codeChars(box.width);
  const lines = props.explainCode.split('\n');
  const hot = rowsRemovedLine(props.explainCode);
  const rest = lines.filter((_, i) => i !== hot).join('\n');
  const hotLabel = (lines[hot] ?? '').split(':')[0] ?? '';
  const fixCode = wrapCode(props.fixCode, chars);

  let last: RowFixLayout | null = null;
  for (const level of [
    { counter: 146, result: 200 },
    { counter: 136, result: 184 },
    { counter: 124, result: 168 },
  ]) {
    const step1Height = Math.ceil(
      TITLE_SIZE * 1.3 +
        codeHeight(rest, box.width) +
        counterHeight(level.counter) +
        HOT_PAD_Y +
        2 * FIX_GAP,
    );
    const statLines = wrapLines(props.statLabel.length, box.width - 62, STAT_LABEL, 0.58);
    const statHeight = Math.ceil(
      statLines * STAT_LABEL * 1.3 + STAT_VALUE * 1.1 + 2 * STAT_PAD_Y + 6,
    );
    const step2Height = BUTTON_HEIGHT + statHeight + Math.ceil(STAMP_SIZE * 1.65) + 2 * FIX_GAP;
    const step3Height = Math.ceil(
      stripBlockHeight(g) + codeHeight(fixCode, box.width) + level.result * RESULT_LH + 2 * FIX_GAP,
    );
    const resultWidth = props.resultText.length * level.result * 0.58;
    const hotWidth =
      counterWidth(formatNumber(props.rowsRemoved), level.counter) + 68 > box.width ||
      hotLabel.length * HOT_LABEL_SIZE * 0.6 + 68 > box.width;
    const buttonWidth = props.analyzeLabel.length * BUTTON_FONT * 0.62 + 60 > BUTTON_WIDTH;
    const stampWidth = props.stampText.length * STAMP_SIZE * 0.66 + 70 > box.width;
    const candidate: RowFixLayout = {
      titleSize: TITLE_SIZE,
      codeSize: CODE_SIZE,
      counterSize: level.counter,
      resultSize: level.result,
      statValueSize: STAT_VALUE,
      statLabelSize: STAT_LABEL,
      codeChars: chars,
      step1Height,
      step2Height,
      step3Height,
      gap: FIX_GAP,
      fits:
        Math.max(step1Height, step2Height, step3Height) <= avail &&
        resultWidth <= box.width &&
        !hotWidth &&
        !buttonWidth &&
        !stampWidth,
    };
    if (candidate.fits) return candidate;
    last = candidate;
  }
  return last as RowFixLayout;
};
