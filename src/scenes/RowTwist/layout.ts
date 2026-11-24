import { counterHeight, counterWidth } from '../../components/RowStrip/RowCounter';
import { STAT_PAD_Y } from '../../components/RowStrip/StatCard';
import { stripBlockHeight, stripGeometry, wrapLines } from '../../components/RowStrip/layout';
import { formatNumber } from '../../components/RowStrip/format';
import { CONTENT_BOX } from '../../design/tokens';
import { KICKER_HEIGHT } from '../RowSetup/layout';
import type { RowTwistProps } from './schema';

export const TWIST_GAP = 16;
export const TOGGLE_HEIGHT = 100;
export const TOGGLE_LABEL_SIZE = 56;
export const TOGGLE_ON_SIZE = 68;
/** Statistics label and belief text (bold). */
const TEXT_SIZE = 46;
const STAT_LABEL_SIZE = 44;
const TEXT_LH = 1.3;
/** GlassCard side padding (34 px) + border (3 px) on each side. */
const CARD_PAD_X = 74;
const CARD_PAD_Y = 62;
const STAT_WIDTH = 390;
const STAT_VALUE = 130;
const ASSUMPTION_SIZE = 56;
const ASSUMPTION_LH = 1.3;
const GLYPH = 0.6;

export type RowTwistLayout = {
  toggleHeight: number;
  stripHeight: number;
  counterSize: number;
  counterHeight: number;
  statWidth: number;
  beliefWidth: number;
  /** Height of the row with the statistics card and the belief card. */
  cardsHeight: number;
  /** Bottom slot: the cards first, then the counter in the same place. */
  slotHeight: number;
  statValueSize: number;
  statLabelSize: number;
  textSize: number;
  assumptionSize: number;
  assumptionHeight: number;
  gap: number;
  total: number;
  fits: boolean;
};

const COUNTER_SIZES = [148, 140, 132] as const;

export const rowTwistLayout = (
  props: Pick<
    RowTwistProps,
    | 'toggleLabel'
    | 'toggleOnText'
    | 'statLabel'
    | 'beliefText'
    | 'assumptionText'
    | 'skippedLabel'
    | 'skippedCount'
    | 'pendingPercent'
  >,
  box: { width: number; height: number } = CONTENT_BOX,
): RowTwistLayout => {
  const g = stripGeometry();
  const statWidth = STAT_WIDTH;
  const beliefWidth = box.width - statWidth - TWIST_GAP;
  const statLines = wrapLines(
    props.statLabel.length,
    statWidth - CARD_PAD_X,
    STAT_LABEL_SIZE,
    GLYPH,
  );
  const statHeight = Math.ceil(
    statLines * STAT_LABEL_SIZE * TEXT_LH + STAT_VALUE * 1.1 + 2 * STAT_PAD_Y + 6,
  );
  const beliefLines = wrapLines(
    props.beliefText.length,
    beliefWidth - CARD_PAD_X,
    TEXT_SIZE,
    GLYPH,
  );
  const beliefHeight = Math.ceil(beliefLines * TEXT_SIZE * TEXT_LH + CARD_PAD_Y);
  const cardsHeight = Math.max(statHeight, beliefHeight);
  const assumptionLines = wrapLines(props.assumptionText.length, box.width, ASSUMPTION_SIZE, GLYPH);
  const assumptionHeight = Math.ceil(assumptionLines * ASSUMPTION_SIZE * ASSUMPTION_LH);
  const stripHeight = stripBlockHeight(g);
  const toggleWidth =
    (props.toggleLabel.length + 1) * TOGGLE_LABEL_SIZE * GLYPH +
    24 +
    150 +
    24 +
    props.toggleOnText.length * TOGGLE_ON_SIZE * 0.7;

  let last: RowTwistLayout | null = null;
  for (const counterSize of COUNTER_SIZES) {
    const cHeight = counterHeight(counterSize);
    const slotHeight = Math.max(cardsHeight, cHeight);
    const total =
      KICKER_HEIGHT + TOGGLE_HEIGHT + stripHeight + slotHeight + assumptionHeight + 4 * TWIST_GAP;
    const counterWidthPx = counterWidth(formatNumber(props.skippedCount), counterSize);
    const candidate: RowTwistLayout = {
      toggleHeight: TOGGLE_HEIGHT,
      stripHeight,
      counterSize,
      counterHeight: cHeight,
      statWidth,
      beliefWidth,
      cardsHeight,
      slotHeight,
      statValueSize: STAT_VALUE,
      statLabelSize: STAT_LABEL_SIZE,
      textSize: TEXT_SIZE,
      assumptionSize: ASSUMPTION_SIZE,
      assumptionHeight,
      gap: TWIST_GAP,
      total,
      fits: total <= box.height && counterWidthPx <= box.width && toggleWidth <= box.width,
    };
    if (candidate.fits) return candidate;
    last = candidate;
  }
  return last as RowTwistLayout;
};
