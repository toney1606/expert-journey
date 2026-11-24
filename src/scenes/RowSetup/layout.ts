import { counterHeight, counterWidth } from '../../components/RowStrip/RowCounter';
import { codeBlockHeight, stripBlockHeight, stripGeometry } from '../../components/RowStrip/layout';
import { formatNumber } from '../../components/RowStrip/format';
import { CONTENT_BOX } from '../../design/tokens';
import type { RowSetupProps } from './schema';

/** Height of the Kicker chip (36px text * 1.3 + padding + border). */
export const KICKER_HEIGHT = 64;
/** Smallest gap between two stacked blocks; the scene spreads the slack with space-between. */
export const SETUP_GAP = 16;
export const LEGEND_SIZE = 44;
const HEADLINE_LH = 1.25;
const DIGIT_EM = 0.7;
const SEP_EM = 0.35;

export type RowSetupLayout = {
  headlineSize: number;
  unitSize: number;
  legendSize: number;
  codeSize: number;
  counterSize: number;
  headHeight: number;
  stripHeight: number;
  counterHeight: number;
  codeHeight: number;
  /** Bottom slot: the code card first, then the counter in the same place. */
  slotHeight: number;
  gap: number;
  total: number;
  /** True when kicker, headline, strip and the bottom slot fit the content box without wrapping the headline. */
  fits: boolean;
};

const LEVELS = [
  { headline: 104, code: 50, counter: 200 },
  { headline: 100, code: 48, counter: 184 },
  { headline: 96, code: 46, counter: 168 },
] as const;

export const rowSetupLayout = (
  props: Pick<
    RowSetupProps,
    'rowCount' | 'rowUnit' | 'pendingPercent' | 'pendingLabel' | 'code' | 'readCount'
  >,
  box: { width: number; height: number } = CONTENT_BOX,
): RowSetupLayout => {
  const g = stripGeometry();
  let last: RowSetupLayout | null = null;
  for (const level of LEVELS) {
    const unitSize = Math.round(level.headline * 0.54);
    const numberWidth = [...formatNumber(props.rowCount)].reduce(
      (sum, ch) => sum + level.headline * (/\d/.test(ch) ? DIGIT_EM : SEP_EM),
      0,
    );
    const unitWidth = 20 + props.rowUnit.length * unitSize * 0.62;
    const headHeight = Math.ceil(level.headline * HEADLINE_LH);
    const cHeight = counterHeight(level.counter);
    const codeHeight = codeBlockHeight(props.code, level.code, box.width);
    const stripHeight = stripBlockHeight(g);
    const slotHeight = Math.max(codeHeight, cHeight);
    const total = KICKER_HEIGHT + headHeight + stripHeight + slotHeight + 3 * SETUP_GAP;
    const counterFits =
      counterWidth(`~${formatNumber(props.readCount)}`, level.counter) <= box.width;
    const legendWidth =
      60 + `${props.pendingPercent}% = ${props.pendingLabel}`.length * LEGEND_SIZE * 0.58;
    const candidate: RowSetupLayout = {
      headlineSize: level.headline,
      unitSize,
      legendSize: LEGEND_SIZE,
      codeSize: level.code,
      counterSize: level.counter,
      headHeight,
      stripHeight,
      counterHeight: cHeight,
      codeHeight,
      slotHeight,
      gap: SETUP_GAP,
      total,
      fits:
        total <= box.height &&
        numberWidth + unitWidth <= box.width &&
        legendWidth <= box.width &&
        counterFits,
    };
    if (candidate.fits) return candidate;
    last = candidate;
  }
  return last as RowSetupLayout;
};
